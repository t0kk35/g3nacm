'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorCreators } from "@/lib/api-error-handling";
import { requirePermissions } from "@/lib/permissions/check";
import { createOutboundRfi, dispatchOutboundRfi } from "@/lib/rfi/rfi-service";
import { RfiQuestionType } from "@/app/api/data/rfi/type";

const origin = 'api/action/rfi';

type RfiQuestionBody = {
    question_order: number;
    question_text: string;
    question_type?: RfiQuestionType;
    expected_response_format?: string;
    is_mandatory?: boolean;
    ai_generated?: boolean;
    ai_reasoning?: string;
};

type SendRfiBody = {
    channel_code: string;
    entity_code: string;
    org_unit_code: string;
    linked_entity_id: string;
    linked_entity_code: string;
    title: string;
    body?: string;
    purpose?: string;
    recipient_subject_id: string;
    template_id?: string;
    due_datetime: string;
    questions?: RfiQuestionBody[];
    ai_generated_draft?: boolean;
    ai_confidence_score?: number;
};

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const permissionCheck = await requirePermissions(user.name, origin, ['action.rfi.send']);
    if (permissionCheck) return permissionCheck;

    const body: SendRfiBody = await request.json();

    const requiredFields = [
        { name: 'channel_code',         value: body.channel_code },
        { name: 'entity_code',          value: body.entity_code },
        { name: 'org_unit_code',        value: body.org_unit_code },
        { name: 'linked_entity_id',     value: body.linked_entity_id },
        { name: 'linked_entity_code',   value: body.linked_entity_code },
        { name: 'title',                value: body.title },
        { name: 'recipient_subject_id', value: body.recipient_subject_id },
        { name: 'due_datetime',         value: body.due_datetime }
    ];

    for (const field of requiredFields) {
        if (!field.value) return ErrorCreators.param.bodyMissing(origin, field.name);
    }

    let client;
    let transactionStarted = false;

    try {
        client = await db.pool.connect();
        await client.query('BEGIN');
        transactionStarted = true;

        const { rfi_id, identifier } = await createOutboundRfi(
            {
                channel_code:          body.channel_code,
                entity_code:           body.entity_code,
                org_unit_code:         body.org_unit_code,
                linked_entity_id:      body.linked_entity_id,
                linked_entity_code:    body.linked_entity_code,
                title:                 body.title,
                body:                  body.body,
                purpose:               body.purpose,
                recipient_subject_id:  body.recipient_subject_id,
                template_id:           body.template_id,
                due_datetime:          body.due_datetime,
                questions:             body.questions,
                ai_generated_draft:    body.ai_generated_draft,
                ai_confidence_score:   body.ai_confidence_score
            },
            client
        );

        const { delivery_result } = await dispatchOutboundRfi(rfi_id, client);

        await client.query('COMMIT');

        return NextResponse.json({
            success: true,
            rfi_id,
            identifier,
            delivery: delivery_result
        });

    } catch (error) {
        if (client && transactionStarted) await client.query('ROLLBACK');
        console.error(`[${origin}] Error sending outbound RFI:`, error);
        return ErrorCreators.db.queryFailed(origin, 'send outbound rfi', error as Error);
    } finally {
        if (client) client.release();
    }
}
