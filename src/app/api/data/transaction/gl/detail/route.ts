'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { Transaction } from "../../transaction";
import { ErrorCreators } from "@/lib/api-error-handling";
import { NextRequest, NextResponse } from "next/server";

const origin = 'api/data/transaction/gl/detail'

const query_text = `
SELECT 
tgl.id,
tgl.submit_date_time,
tgl.identifier,
tgl.org_unit_code,
'GL' as "type",
json_build_object(
    'subject_id', tgl.subject_id,
    'subject_identifier', sb.identifier,
    'product_id', tgl.product_id,
    'product_identifier', pb.identifier,
    'booking_type', tgl.booking_type,
    'credit_debit', tgl.credit_debit,
    'currency_base', tgl.currency_base,
    'amount_base', tgl.amount_base,
    'currency_orig', tgl.currency_orig,
    'amount_orig', tgl.amount_orig,
    'channel', tgl.channel,
    'description', tgl.description,
    'counter_party_bank_code', tgl.counter_party_bank_code,
    'counter_party_bank', tgl.counter_party_bank,
    'counter_party_account', tgl.counter_party_account,
    'counter_party_name', tgl.counter_party_name,
    'counter_party_address', tgl.counter_party_address,
    'counter_party_country', tgl.counter_party_country,
    'original_date_time', tgl.orginal_date_time,
    'posting_date_time', tgl.posting_date_time,
    'value_date_time', tgl.value_date_time
) as "type_specific"
FROM trx_general_ledger tgl
JOIN subject_base sb on tgl.subject_id = sb.id
JOIN product_base pb on tgl.product_id = pb.id
JOIN org_unit ou ON ou.code = tgl.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name = $1 AND tgl.id = $2
`

export async function GET(request: NextRequest) {
    const useMockData = false
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get("transaction_id");
    if (!transactionId) return ErrorCreators.param.urlMissing(origin, "transaction_id");
    
    if (!useMockData) {
        const query = {
            name: 'api_data_transaction_detail',
            text: query_text,
            values:[user.name, transactionId]
        }
        const transactions = await db.pool.query(query)
        if (transactions.rows.length === 0) return new Response(JSON.stringify({ Error: `Could not find transaction ${transactionId}` }), { 
            headers: { "Content-Type": "application/json" },
            status : 404
        });
            
        if (transactions.rows.length > 1) return new Response(JSON.stringify({ Error: `Found more than 1 transaction with id ${transactionId}` }), { 
            headers: { "Content-Type": "application/json" },
            status : 500
        });
        const res:Transaction = transactions.rows[0]
        return NextResponse.json(res);        
    }
}