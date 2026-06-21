import { JobRegistry } from '../registry';
import { JobContext, JobResult } from '../types';
import { getChannelByCode } from '@/lib/cache/rfi-channel-cache';
import { resolveChannel } from '@/lib/rfi/rfi-resolve';
import { readUnseenRfiReplies, markEmailsProcessed, extractIdentifierFromAddress } from '@/lib/rfi/inbound/imap-reader';
import { RfiInboundEmailCredentials, RfiInboundEmailConfig } from '@/lib/rfi/inbound/types';
import { RfiChannelType } from '@/lib/data/queries/rfi/type';
import { getCachedWorkflowConfig } from "@/lib/cache/workflow-cache";
import { createWorkflowContext, executeWorkflowAction } from '@/lib/workflow/workflow-engine';
import * as db from '@/db';
import { queryRfiRequest } from '@/lib/data/queries/rfi/request';

JobRegistry.register('rfi.process-inbound-mail', async (ctx: JobContext): Promise<JobResult> => {
    const { 
        channel_code, 
        rfi_request_workflow_action_code, 
        rfi_response_entity_code 
    } = ctx.payload as { 
        channel_code: string, 
        rfi_request_workflow_action_code: string,
        rfi_response_entity_code: string 
    };

    if (!channel_code) return { success: false, errorMessage: 'payload.channel_code is required' };
    if (!rfi_response_entity_code) return { success: false, errorMessage: 'payload.rfi_response_workflow_action_code is required' };

    const channel = await getChannelByCode(channel_code);

    if (!channel.is_active) return { success: false, errorMessage: `Channel '${channel_code}' is not active` };
    if (!channel.is_inbound) return { success: false, errorMessage: `Channel '${channel_code}' does not support inbound` };
    if (channel.type !== RfiChannelType.Email) return { success: false, errorMessage: `Channel '${channel_code}' is not an Email channel` };

    const resolved = resolveChannel(channel, { id: '', identifier: '' });
    const credentials = resolved.credentials as RfiInboundEmailCredentials;
    const config = resolved.configuration as RfiInboundEmailConfig;

    const emails = await readUnseenRfiReplies(credentials, config);

    let processed = 0;
    let skipped = 0;
    const processedUids: number[] = [];

    for (const email of emails) {
        // Set up a connection and start main logic. 
        // We will commit one by one. So that if one fails we don't rollback everything.
        let client;
        let transactionStarted = false;
        
        try {
            client = await db.pool.connect();
            await client.query('BEGIN');
            transactionStarted = true;
            
            let identifier: string | null = null;

            for (const addr of email.to_addresses) {
                identifier = extractIdentifierFromAddress(addr);
                if (identifier) break;
            }

            if (!identifier) {
                skipped++;
                continue;
            }

            const lookup = await queryRfiRequest({rfi_identifier: identifier}, {userName: ctx.userName, client: client});

            if (lookup.length === 0) {
                skipped++;
                continue;
            }

            const rfiRequestId: string = lookup[0].id;
            const rfiOrgUnitCode: string = lookup[0].org_unit_code;
            const rfiEntityCode: string = lookup[0].entity_code;

            const responseData = {
                message_id: email.messageId,
                from: { name: email.from_name, address: email.from_address },
                to: email.to_addresses,
                subject: email.subject,
                date: email.date?.toISOString(),
            };

            const respondentContact = {
                channel_type: 'Email',
                email_address: email.from_address,
                subject_name: email.from_name,
            };

            // Execute the workflow action to create the response
            const responseWorkflowConfig = await getCachedWorkflowConfig(rfi_response_entity_code, rfiOrgUnitCode)
            const reponseStartAction = responseWorkflowConfig.actions.find(a => a.start_action);
            if (!reponseStartAction) return { success: false, errorMessage: `Could not find start action for the rfi response. Loaded entity code ${rfi_response_entity_code} for org code ${rfiOrgUnitCode}` };

            const responseSystemFields = {
                userName: ctx.userName,
                orgUnitCode: rfiOrgUnitCode,
                actionCode: reponseStartAction.code,
                entityCode: rfi_response_entity_code,
                entityId: "Unknown",
                fromStateCode: '',
                toStateCode: '',
                entityData: lookup[0]     // Feed original RFI as entity data
            };
            const actionData: { [key: string]: any } = {
                responseData: responseData,
                respondentContact: respondentContact,
                emailBodyText: email.body_text,
                fromName: email.from_name,
                files: email.attachments.map(att => ({
                    file: new File([new Uint8Array(att.content)], att.filename, { type: att.contentType }),
                    description: `Email attachment: ${att.filename}`,
                    orgUnitCode: rfiOrgUnitCode,
                })),
            };

            const responsetWfCtx = createWorkflowContext(actionData, responseSystemFields);
            await executeWorkflowAction(client, responseWorkflowConfig, responsetWfCtx);

            // Now trigger the workflow action on the orignal RFI (if provided)
            if (rfi_request_workflow_action_code) {
                const requstWorkflowConfig = await getCachedWorkflowConfig(rfiEntityCode, rfiOrgUnitCode)
                const requestSystemFields = {
                    userName: ctx.userName,
                    orgUnitCode: rfiOrgUnitCode,
                    actionCode: rfi_request_workflow_action_code,
                    entityCode: rfiEntityCode,
                    entityId: rfiRequestId,
                    fromStateCode: '',
                    toStateCode: '',
                    entityData: lookup[0]
                };
                const actionData = {}
                const requestWfCtx = createWorkflowContext(actionData, requestSystemFields);
                await executeWorkflowAction(client, requstWorkflowConfig, requestWfCtx);
            }

            processedUids.push(email.uid);
            processed++;
            // Commit if we get to the end.
            await client.query('COMMIT');
        } catch (err) {
            if (client && transactionStarted) await client.query('ROLLBACK');
            console.error(`[rfi-inbound-mail] Failed to process email uid=${email.uid}:`, err);
            skipped++;
            // uid not added to processedUids — email stays UNSEEN for next run
        } finally {
            if (client) client.release();
        }
    }

    // Mark only successfully inserted emails as seen. Done after all DB work so
    // a partial failure leaves unprocessed emails UNSEEN for the next run.
    try {
        await markEmailsProcessed(credentials, config, processedUids);
    } catch (err) {
        // DB inserts already succeeded — log but don't fail the job over a flag error.
        console.error('[rfi-inbound-mail] Failed to mark emails as seen:', err);
    }

    return {
        success: true,
        data: { processed, skipped, total: emails.length },
    };
}, 'job.submit.rfi.inbound_mail');
