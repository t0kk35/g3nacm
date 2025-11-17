'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { Subject } from '../types';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/subject/detail'

const query_text = `
SELECT 
  sb.id,
  sb.subject_type as "type",
  sb.version,
  sb.identifier,
  sb.org_unit_code,
  sb.segment,
  sb.status,
  sb.name,
  sb.mail,
  sb.phone,
  sb.kyc_risk,
  sb.acquisition_date,
  jsonb_build_object(
    'id', a.id,
    'street', a.street,
    'number', a.number,
    'city', a.city,
    'postal_code', a.postal_code,
    'country', a.country
  ) as "address",
  CASE 
      WHEN sb.subject_type = 'IND' THEN COALESCE(si.ind_specific, '{}'::json)
      WHEN sb.subject_type = 'CRP' THEN COALESCE(sc.crp_specific, '{}'::json)
  END as "type_specific"
FROM subject_base sb
JOIN org_unit ou ON ou.code = sb.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
LEFT JOIN LATERAL (
    SELECT ai.id, ai.street, ai.number, ai.city, ai.postal_code, ai.country
    FROM address ai    
    WHERE sb.address_id = ai.id
    LIMIT 1
) a ON TRUE
LEFT JOIN LATERAL (
    SELECT json_build_object(
        'gender', sii.gender,
        'first_name', sii.first_name,
        'last_name', sii.last_name,
        'middle_name', sii.middle_name,
        'date_of_birth', to_char(sii.date_of_birth, 'dd/mm/yyyy'),
        'profession', sii.profession,
        'employment_status', sii.employment_status,
        'nationality', sii.nationality,
        'residence', sii.residence
    ) AS "ind_specific"
    FROM subject_individual sii 
    WHERE sb.subject_type = 'IND' 
    AND sii.id = sb.id
) si ON TRUE
LEFT JOIN LATERAL (
    SELECT json_build_object(
        'incorporation_date', sci.incorporation_date,
        'incorporation_country', sci.incorporation_country,
        'incorporation_type', sci.incorporation_type,
        'registration_number', sci.registration_number,
        'segment', sci.segment,
        'tax_number', sci.tax_number
    ) AS "crp_specific"
    FROM subject_corporate sci
    WHERE sb.subject_type = 'CRP'
    AND sci.id = sb.id
) sc on TRUE
WHERE u.name=$1 and sb.id = $2
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

    if (!useMockData) {
        const query = {
            name: 'api_data_subject_detail',
            text: query_text,
            values:[user.name, subjectId]
        }
        try {
            const subjects = await db.pool.query(query)
            if (subjects.rows.length === 0) return ErrorCreators.db.entityNotFound(origin, 'subject', subjectId);
            if (subjects.rows.length > 1) return ErrorCreators.db.entityNotUnique(origin, 'subject', subjectId);
            const res:Subject = subjects.rows[0]
            return NextResponse.json(res)
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get subject detail', error as Error);            
        }

    }
}