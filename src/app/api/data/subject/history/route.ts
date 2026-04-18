'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { SubjectHistory } from "../types"
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from "@/lib/permissions/check";

const origin = 'api/data/subject/history'

const query_text = `
SELECT
  sbh.id,
  sbh.date_from AS "valid_from",
  sbh.date_to AS "valid_to",
  sbh.version,
  sbh.org_unit_code,
  json_build_object(
    'id',               sbh.id,
    'identifier',       sbh.identifier,
    'type',             sbh.subject_type,
    'type_name',        stc.display_name,
    'type_description', stc.description,
    'segment',          sbh.segment,
    'status',           sbh.status,
    'name',             sbh.name,
    'mail',             sbh.mail,
    'phone',            sbh.phone,
    'acquisition_date', sbh.acquisition_date,
    'address', jsonb_build_object(
      'id',          a.id,
      'street',      a.street,
      'number',      a.number,
      'city',        a.city,
      'postal_code', a.postal_code,
      'country',     a.country
    ),
    'type_specific', COALESCE(sdh.detail_data, '{}'::jsonb)
  ) AS "subject_history"
FROM subject_base_history sbh
JOIN org_unit ou ON ou.code = sbh.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
JOIN subject_type_config stc ON sbh.subject_type = stc.code
JOIN subject_detail_history sdh ON sdh.id = sbh.id AND sdh.version = sbh.version
LEFT JOIN address a ON a.id = sbh.address_id
WHERE u.name=$1 AND sbh.id=$2
  AND ($3::timestamp IS NULL OR sbh.date_to   >= $3::timestamp)
  AND ($4::timestamp IS NULL OR sbh.date_from <= $4::timestamp)
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    // User Checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['data.subject']);
    if (permissionCheck) return permissionCheck; 
    
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