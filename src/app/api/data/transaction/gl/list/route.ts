'use server'

import { auth } from "@/auth";
import * as db from "@/db";
import { GLTransaction } from "../../transaction";
import { ErrorCreators } from "@/lib/api-error-handling";
import { NextRequest, NextResponse } from "next/server";
import { calculateDailyPeriods } from "@/lib/date-time/period-calculator";

const origin = 'api/data/transaction/gl/list'

function buildTransactionQuery(filters: any): { text: string; values: any[] } {
    const baseQuery = `
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
JOIN users u ON ouap.user_id = u.id`;

    const conditions = ['u.name = $1'];
    const values = [filters.username];
    let paramIndex = 2;

    // Subject ID filter
    if (filters.subjectId) {
        conditions.push(`tgl.subject_id = $${paramIndex}`);
        values.push(filters.subjectId);
        paramIndex++;
    }

    // Date range filters
    if (filters.fromDate) {
        const fromDatePeriod = calculateDailyPeriods(new Date(filters.fromDate), '1d')
        conditions.push(`tgl.submit_date_time >= $${paramIndex}::timestamp`);
        values.push(fromDatePeriod[0].start);
        paramIndex++;
    }

    if (filters.toDate) {
        // Convert correctly to end of period
        const toDatePeriod = calculateDailyPeriods(new Date(filters.toDate), '1d')
        conditions.push(`tgl.submit_date_time <= $${paramIndex}::timestamp`);
        values.push(toDatePeriod[0].end);
        paramIndex++;
    }

    // Booking types filter
    if (filters.bookingTypes && filters.bookingTypes.length > 0) {
        conditions.push(`tgl.booking_type = ANY($${paramIndex})`);
        values.push(filters.bookingTypes);
        paramIndex++;
    }

    // Credit/Debit filter
    if (filters.creditDebit) {
        conditions.push(`tgl.credit_debit = $${paramIndex}`);
        values.push(filters.creditDebit);
        paramIndex++;
    }

    // Currencies filter (base or original)
    if (filters.currencies && filters.currencies.length > 0) {
        conditions.push(`(tgl.currency_base = ANY($${paramIndex}) OR tgl.currency_orig = ANY($${paramIndex}))`);
        values.push(filters.currencies);
        paramIndex++;
    }

    // Channels filter
    if (filters.channels && filters.channels.length > 0) {
        conditions.push(`tgl.channel = ANY($${paramIndex})`);
        values.push(filters.channels);
        paramIndex++;
    }

    // Counter party countries filter
    if (filters.counterPartyCountries && filters.counterPartyCountries.length > 0) {
        conditions.push(`tgl.counter_party_country = ANY($${paramIndex})`);
        values.push(filters.counterPartyCountries);
        paramIndex++;
    }

    // Counter party name filter
    if (filters.counterPartyName) {
        conditions.push(`tgl.counter_party_name ILIKE $${paramIndex}`);
        values.push(`%${filters.counterPartyName}%`);
        paramIndex++;
    }

    // Amount range filters
    if (filters.minAmount !== undefined && filters.minAmount !== null) {
        conditions.push(`tgl.amount_base >= $${paramIndex}`);
        values.push(filters.minAmount);
        paramIndex++;
    }

    if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
        conditions.push(`tgl.amount_base <= $${paramIndex}`);
        values.push(filters.maxAmount);
        paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    
    // Order by clause
    const orderBy = filters.orderBy || 'submit_date_time';
    const orderDirection = filters.orderDirection || 'desc';
    const orderClause = `ORDER BY tgl.${orderBy} ${orderDirection}`;
    
    // Limit clause
    const limit = Math.min(filters.limit || 1000, 10000); // Max 10k records
    const limitClause = `LIMIT ${limit}`;

    const fullQuery = `${baseQuery} ${whereClause} ${orderClause} ${limitClause}`;
    
    return { text: fullQuery, values };
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const searchParams = request.nextUrl.searchParams;

    // Build filters object from query parameters
    const filters = {
        username: user.name,
        subjectId: searchParams.get("subject_id"),
        fromDate: searchParams.get("from_date"),
        toDate: searchParams.get("to_date"),
        bookingTypes: searchParams.get("booking_types")?.split(','),
        creditDebit: searchParams.get("credit_debit"),
        currencies: searchParams.get("currencies")?.split(','),
        channels: searchParams.get("channels")?.split(','),
        counterPartyCountries: searchParams.get("counter_party_countries")?.split(','),
        counterPartyName: searchParams.get("counter_party_name"),
        minAmount: searchParams.get("min_amount") ? parseFloat(searchParams.get("min_amount")!) : undefined,
        maxAmount: searchParams.get("max_amount") ? parseFloat(searchParams.get("max_amount")!) : undefined,
        orderBy: searchParams.get("order_by") || 'submit_date_time',
        orderDirection: searchParams.get("order_direction") || 'desc',
        limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 1000
    };  
    
    // Validate dates if provided
    if (filters.fromDate && isNaN(Date.parse(filters.fromDate))) {
        return ErrorCreators.param.invalidDate(origin, "from_date", filters.fromDate);
    }
    if (filters.toDate && isNaN(Date.parse(filters.toDate))) {
        return ErrorCreators.param.invalidDate(origin, "to_date", filters.toDate);   
    }    

    // Validate order by field
    const validOrderFields = ['submit_date_time', 'amount_base', 'amount_orig'];
    if (!validOrderFields.includes(filters.orderBy)) {
        return ErrorCreators.param.typeInvalid(origin, 'order_by', `valid fields: ${validOrderFields.join(', ')}`, filters.orderBy);
    }
    
    try {
        const query = buildTransactionQuery(filters);
        // query.name = 'api_data_transaction_list';

        const transactions = await db.pool.query(query);
        const res: GLTransaction[] = transactions.rows;
        
        return NextResponse.json({
            transactions: res,
            totalCount: res.length,
            filters: {
                subjectId: filters.subjectId,
                fromDate: filters.fromDate,
                toDate: filters.toDate,
                bookingTypes: filters.bookingTypes,
                creditDebit: filters.creditDebit,
                currencies: filters.currencies,
                channels: filters.channels,
                counterPartyCountries: filters.counterPartyCountries,
                counterPartyName: filters.counterPartyName,
                minAmount: filters.minAmount,
                maxAmount: filters.maxAmount
            }
        });        
    } catch (error) {
        return ErrorCreators.db.queryFailed(origin, 'Get transaction list', error as Error);
    }
}