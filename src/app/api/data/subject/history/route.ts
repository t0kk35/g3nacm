'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { SubjectHistory } from "../types"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/subject/history'

const query_text = `
SELECT
  sbh.id,
  sbh.date_from as "valid_from",
  sbh.date_to as "valid_to",
  sbh.version,
  sbh.org_unit_code,
  json_build_object(
    'id', sbh.id,
    'identifier', sbh.identifier,
    'type', sbh.subject_type, 
    'segment', sbh.segment,
    'status', sbh.status,
    'name', sbh.name,
    'mail', sbh.mail,
    'phone', sbh.phone,
    'kyc_risk', sbh.kyc_risk,
    'aquisition_date', sbh.acquisition_date,
    'address', jsonb_build_object(
      'id', a.id,
      'street', a.street,
      'number', a.number,
      'city', a.city,
      'postal_code', a.postal_code,
      'country', a.country
    ),
    'type_specific', 
    CASE 
      WHEN sbh.subject_type = 'IND' THEN COALESCE(sih.ind_specific, '{}'::json)
      WHEN sbh.subject_type = 'CRP' THEN COALESCE(sch.crp_specific, '{}'::json)
    END
  ) as "subject_history"
FROM subject_base_history sbh
JOIN org_unit ou ON ou.code = sbh.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
LEFT JOIN LATERAL (
    SELECT ai.id, ai.street, ai.number, ai.city, ai.postal_code, ai.country
    FROM address ai    
    WHERE sbh.address_id = ai.id
    LIMIT 1
) a ON TRUE
LEFT JOIN LATERAL (
    SELECT json_build_object(
        'gender', sihi.gender,
        'first_name', sihi.first_name,
        'last_name', sihi.last_name,
        'middle_name', sihi.middle_name,
        'date_of_birth', to_char(sihi.date_of_birth, 'dd/mm/yyyy'),
        'profession', sihi.profession,
        'employment_status', sihi.employment_status,
        'nationality', sihi.nationality,
        'residence', sihi.residence
    ) AS "ind_specific"
    FROM subject_individual_history sihi 
    WHERE sbh.subject_type = 'IND' 
    AND sihi.id = sbh.id
    AND sihi.version = sbh.version
) sih ON TRUE
LEFT JOIN LATERAL (
    SELECT json_build_object(
        'incorporation_date', schi.incorporation_date,
        'incorporation_country', schi.incorporation_country,
        'incorporation_type', schi.incorporation_type,
        'registration_number', schi.registration_number,
        'segment', schi.segment,
        'tax_number', schi.tax_number
    ) AS "crp_specific"
    FROM subject_corporate_history schi
    WHERE sbh.subject_type = 'CRP'
    AND schi.id = sbh.id
    AND schi.version = sbh.version
) sch on TRUE
WHERE u.name=$1 and sbh.id=$2
  AND ($3::timestamp IS NULL OR sbh.date_to >= $3::timestamp)
  AND ($4::timestamp IS NULL OR sbh.date_from <= $4::timestamp)
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    // User Checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const subjectId = searchParams.get("subject_id");
    if (!subjectId) return ErrorCreators.param.urlMissing(origin, "subject_id");
    
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");

    // Validate dates if provided
    if (fromDate && isNaN(Date.parse(fromDate))) return ErrorCreators.param.invalidDate(origin, "from_date", fromDate);
    if (toDate && isNaN(Date.parse(toDate))) return ErrorCreators.param.invalidDate(origin, "to_date", toDate);

    if (!useMockData) {
        const query = {
            name: 'api_data_subject_history',
            text: query_text,
            values: [user.name, subjectId, fromDate, toDate]
        }
        try {
            const subject_hist_list = await db.pool.query(query);
            const res:SubjectHistory[] = subject_hist_list.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get subject history', error as Error);
        }

    }
}