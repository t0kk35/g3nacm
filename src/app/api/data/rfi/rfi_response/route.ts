'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { RfiRequest, RfiResponse } from "../type"
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/rfi/rfi_response'

const query_text = `
SELECT 
  rrs.id AS "id",
  rfi_request_id,
  repsonse_text,
  response_data,
  respondent_entity_id,
  respondent_name,
  respondent_contact_details,
  is_complete,
  is_satisfactory,
  quality_notes,
  completeness_score,
  ai_extracted_entities,
  ai_sentiment_score,
  ai_relevance_score,
  ai_risk_indicators,
  ai_summary,
  ai_structured_extraction,
  rrs.create_datetime AS "create_datetime",
  rrs.update_datetime AS "update_datetime"
FROM rfi_response rrs
JOIN rfi_request rrq ON rrs.rfi_request_id = rrq.id
JOIN org_unit ou ON ou.code = rrq.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name = $1
AND rrq.id = $2
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get Params
    const searchParams = request.nextUrl.searchParams;
    // If there is an RFI Id we are looking for a specific ID
    const rfiId = searchParams.get("rfi_id");

    if (!useMockData) {
        const query = {
            name: origin,
            text: query_text,
            values: [user.name, rfiId]
        };
        try {
            const response = await db.pool.query(query);
            const res:RfiResponse[] = response.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get rfi reponse', error as Error);
        }
    }
}