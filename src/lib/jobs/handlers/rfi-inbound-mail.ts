import { JobRegistry } from '../registry';
import { JobContext, JobResult } from '../types';
import { getChannelByCode } from '@/lib/cache/rfi-channel-cache';
import { resolveChannel } from '@/lib/rfi/rfi-resolve';
import { readUnseenRfiReplies, markEmailsProcessed, extractIdentifierFromAddress } from '@/lib/rfi/inbound/imap-reader';
import { RfiInboundEmailCredentials, RfiInboundEmailConfig } from '@/lib/rfi/inbound/types';
import { RfiChannelType } from '@/app/api/data/rfi/type';
import { getCachedWorkflowConfig } from "@/lib/cache/workflow-cache";
import { createWorkflowContext, executeWorkflowAction } from '@/lib/workflow/workflow-engine';
import * as db from '@/db';

const query_lookup_rfi = `
SELECT 
    id,
    org_unit_code,
    entity_code,
    create_user_name
FROM rfi_request
WHERE identifier = $1 AND status = 'Sent'::rfi_status
LIMIT 1
`;

const query_insert_response = `
INSERT INTO rfi_response (
    rfi_request_id,
    repsonse_text,
    response_data,
    respondent_name,
    respondent_contact_details,
    is_complete
) VALUES ($1::uuid, $2, $3::jsonb, $4, $5::jsonb, false)
`;

JobRegistry.register('rfi.process-inbound-mail', async (ctx: JobContext): Promise<JobResult> => {
    const { channel_code, workflow_action_code } = ctx.payload as { channel_code: string, workflow_action_code: string };

    if (!channel_code) return { success: false, errorMessage: 'payload.channel_code is required' };

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

            const lookup = await client.query(query_lookup_rfi, [identifier]);

            if (lookup.rows.length === 0) {
                skipped++;
                continue;
            }

            const rfiRequestId: string = lookup.rows[0].id;
            const rfiOrgUnitCode: string = lookup.rows[0].org_unit_code;
            const rfiEntityCode: string = lookup.rows[0].entity_code;
            const rfiCreateUserName: string = lookup.rows[0].create_user_name;

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

            await client.query(query_insert_response, [
                rfiRequestId,
                email.body_text || null,
                JSON.stringify(responseData),
                email.from_name || null,
                JSON.stringify(respondentContact),
            ]);

            // Now trigger the workflow action on the orignal RFI (if provided)
            if (workflow_action_code) {
                const workflowConfig = await getCachedWorkflowConfig(rfiEntityCode, rfiOrgUnitCode)
                const systemFields = {
                    userName: ctx.userName,
                    orgUnitCode: rfiOrgUnitCode,
                    actionCode: workflow_action_code,
                    entityCode: rfiEntityCode,
                    entityId: rfiRequestId,
                    fromStateCode: '',
                    toStateCode: '',
                    entityData: { 
                        rfi_request: {
                            id: rfiRequestId,
                            entity_code: rfiEntityCode,
                            org_unit_code: rfiOrgUnitCode,
                            create_user_id: rfiCreateUserName
                        }
                    }
                };
                const actionData = {}
                const wfCtx = createWorkflowContext(actionData, systemFields);
                await executeWorkflowAction(client, workflowConfig, wfCtx);
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
