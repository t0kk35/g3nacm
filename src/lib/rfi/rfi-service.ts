import { PoolClient } from "pg";
import { getChannelByCode } from "@/lib/cache/rfi-channel-cache";
import { getRfiChannelHandler } from "./channel-handler-registry";
import { CreateOutboundRfiParams, CreateRfiResult, DispatchRfiResult, RfiContactDetails, RfiSendContext } from "./types";
import { resolveChannel } from "./rfi-resolve";
import { generateIdentifier } from "../helpers";

// Side-effect import — populates the handler registry before any lookups
import "./handlers/handler-index";

const query_insert_rfi = `
INSERT INTO rfi_request (
    identifier,
    entity_code,
    org_unit_code,
    direction,
    linked_entity_id,
    linked_entity_code,
    title,
    body,
    purpose,
    recipient_subject_id,
    recipient_contact_details,
    channel_id,
    template_id,
    ai_generated_draft,
    ai_confidence_score,
    due_datetime
) VALUES (
    $1, $2, $3,
    'Outbound'::rfi_direction,
    $4::uuid, $5,
    $6, $7, $8,
    $9::uuid, $10::jsonb,
    $11,
    $12::uuid, $13, $14,
    $15::timestamptz
)
RETURNING id AS "id"
`;

const query_update_identifier = `
UPDATE rfi_request SET identifier = $1 WHERE id = $2::uuid
`;

const query_insert_question = `
INSERT INTO rfi_question (
    rfi_request_id,
    question_order,
    question_text,
    question_type,
    expected_response_format,
    is_mandatory,
    ai_generated,
    ai_reasoning
) VALUES (
    $1::uuid, $2, $3,
    $4::rfi_question_type,
    $5, $6, $7, $8
)
`;

const query_load_rfi_for_dispatch = `
SELECT
    r.title,
    r.body,
    r.status,
    r.identifier,
    r.recipient_subject_id,
    r.recipient_contact_details,
    c.type         AS "channel_type",
    c.code         AS "channel_code"
FROM rfi_request r
JOIN rfi_channel c ON c.id = r.channel_id
WHERE r.id = $1::uuid
`;

const query_mark_sent = `
UPDATE rfi_request
SET status = 'Sent'::rfi_status, sent_datetime = now()
WHERE id = $1::uuid
`;

const query_mark_failed = `
UPDATE rfi_request
SET status = 'Failed'::rfi_status
WHERE id = $1::uuid
`;

/**
 * Persists an outbound RFI record with status 'Draft'.
 * Must be called within an active DB transaction.
 *
 * This is step 1 of the two-step create → dispatch flow. The record is saved
 * but not yet sent, allowing for approval or async dispatch later.
 */
export async function createOutboundRfi(
    params: CreateOutboundRfiParams,
    client: PoolClient
): Promise<CreateRfiResult> {

    // 1. Load + validate channel
    const channel = await getChannelByCode(params.channel_code);

    if (!channel.is_active) {
        throw new Error(`RFI channel '${params.channel_code}' is not active`);
    }
    if (!channel.is_outbound) {
        throw new Error(`RFI channel '${params.channel_code}' does not support outbound`);
    }

    // 2. Look up handler (validates a handler exists before we write anything)
    const handler = getRfiChannelHandler(channel.type);
    if (!handler) {
        throw new Error(`No handler registered for RFI channel type '${channel.type}'`);
    }

    // 3. Resolve recipient contact details (runs within the same transaction)
    const contactDetails = await handler.getContactDetails(
        params.recipient_subject_id,
        channel,
        client
    );

    // 4. INSERT rfi_request (identifier is set to a placeholder then updated below)
    const now = new Date();

    const rfiResult = await client.query(query_insert_rfi, [
        'PENDING',                              // $1  identifier placeholder
        params.entity_code,                     // $2
        params.org_unit_code,                   // $3
        params.linked_entity_id,                // $4
        params.linked_entity_code,              // $5
        params.title,                           // $6
        params.body ?? null,                    // $7
        params.purpose ?? null,                 // $8
        params.recipient_subject_id,            // $9
        JSON.stringify(contactDetails),         // $10
        channel.id,                             // $11
        params.template_id ?? null,             // $12
        params.ai_generated_draft ?? false,     // $13
        params.ai_confidence_score ?? null,     // $14
        params.due_datetime                     // $15
    ]);

    if (rfiResult.rows.length === 0) {
        throw new Error('INSERT rfi_request returned no rows');
    }

    const rfiId: string = rfiResult.rows[0].id;
    const identifier = generateIdentifier('RFI', rfiId, now);

    await client.query(query_update_identifier, [identifier, rfiId]);

    // 5. INSERT questions if provided
    if (params.questions && params.questions.length > 0) {
        for (const q of params.questions) {
            await client.query(query_insert_question, [
                rfiId,                              // $1
                q.question_order,                   // $2
                q.question_text,                    // $3
                q.question_type ?? null,            // $4
                q.expected_response_format ?? null, // $5
                q.is_mandatory ?? true,             // $6
                q.ai_generated ?? false,            // $7
                q.ai_reasoning ?? null              // $8
            ]);
        }
    }

    return { rfi_id: rfiId, identifier };
}

/**
 * Dispatches an existing 'Draft' or 'Approved' RFI via its channel handler.
 * Must be called within an active DB transaction.
 *
 * Loads the persisted record, calls the channel handler, and updates the
 * status to 'Sent' (or 'Failed' on delivery error).
 *
 * Because this only requires the rfi_id it works for immediate, approval-gated,
 * and future batch/async send modes.
 */
export async function dispatchOutboundRfi(rfiId: string, client: PoolClient): Promise<DispatchRfiResult> {

    const rfiRows = await client.query(query_load_rfi_for_dispatch, [rfiId]);

    if (rfiRows.rows.length === 0) {
        throw new Error(`RFI not found: ${rfiId}`);
    }

    const row = rfiRows.rows[0];

    if (row.status === 'Sent') {
        throw new Error(`RFI '${rfiId}' has already been sent`);
    }
    if (row.status === 'Cancelled') {
        throw new Error(`RFI '${rfiId}' is cancelled and cannot be dispatched`);
    }

    const channel = await getChannelByCode(row.channel_code);
    const handler = getRfiChannelHandler(channel.type);

    if (!handler) {
        throw new Error(`No handler registered for RFI channel type '${channel.type}'`);
    }

    const resolvedChannel = resolveChannel(channel, { id: rfiId, identifier: row.identifier });

    const context: RfiSendContext = {
        title: row.title,
        body: row.body ?? undefined
    };

    const contactDetails: RfiContactDetails = row.recipient_contact_details;

    let deliveryResult;
    try {
        deliveryResult = await handler.send(context, contactDetails, resolvedChannel);
        await client.query(query_mark_sent, [rfiId]);
    } catch (err) {
        await client.query(query_mark_failed, [rfiId]);
        throw err;
    }

    return { delivery_result: deliveryResult };
}
