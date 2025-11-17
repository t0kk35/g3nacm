'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { NextRequest, NextResponse } from "next/server";
import { TFFinancialMessage, TFTransaction } from "../transaction";
import { ErrorCreators } from '@/lib/api-error-handling';
import { mapTFMessage } from "@/lib/tf-message-mapping/message-mapper";

const origin = 'api/data/transaction/tf_message'

const query_text = `
SELECT 
    tfmb.id,
    tfmb.submit_date_time,
    tfmb.identifier,
    tfmb.org_unit_code,
    tfmb.sender,
    tfmb.receiver,
    tfmb.message_type,
    tfmb.amount,
    tfmb.currency,
    CASE 
        WHEN tfmb.message_store_type = 'xml' THEN tfmx.message 
    END AS "message"
FROM tf_message_base tfmb
LEFT JOIN tf_message_xml tfmx ON tfmx.tf_message_id = tfmb.id AND tfmb.message_store_type = 'xml' 
JOIN org_unit ou ON ou.code = tfmb.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name = $1
AND ($2::uuid IS NULL OR tfmb.id = $2) 
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get("message_id");

    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values:[user.name, messageId]
        };

        try {
            const transactions = await db.pool.query(query);
            const { 
                id,
                submit_date_time, 
                identifier, 
                org_unit_code,
                sender,
                receiver,
                message_type, 
                amount,
                currency,
                message,
            } = transactions.rows[0]
        
            // Needs Error Handling. Maybe outside of the db error
            const finMessage:TFFinancialMessage = mapTFMessage(message, message_type)
            const res: TFTransaction = {
                id: id,
                submit_date_time: submit_date_time,
                identifier: identifier,
                org_unit_code: org_unit_code,
                type: 'TF',
                type_specific: {
                    message_type: message_type,
                    sender: sender,
                    receiver: receiver,
                    amount: amount,
                    currency: currency,
                    fields: finMessage.fields,
                    transactions: finMessage.transactions
                }
            }
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get tf_message detail', error as Error);
        }

    }
}