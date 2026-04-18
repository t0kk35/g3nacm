'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { Subject } from '../types';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';

const origin = 'api/data/subject/detail'

const query_text = `
SELECT
  sb.id,
  sb.subject_type AS "type",
  stc.display_name AS "type_name",
  stc.description AS "type_description", 
  sb.version,
  sb.identifier,
  sb.org_unit_code,
  sb.segment,
  sb.status,
  sb.name,
  sb.mail,
  sb.phone,
  sb.acquisition_date,
  jsonb_build_object(
    'id',          a.id,
    'street',      a.street,
    'number',      a.number,
    'city',        a.city,
    'postal_code', a.postal_code,
    'country',     a.country
  ) AS "address",
  sd.schema_version,
  COALESCE(sd.detail_data, '{}'::jsonb) AS "type_specific"
FROM subject_base sb
JOIN org_unit ou ON ou.code = sb.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
JOIN subject_detail sd ON sd.id = sb.id
JOIN subject_type_config stc ON sb.subject_type = stc.code
LEFT JOIN address a  ON a.id = sb.address_id
WHERE u.name=$1 AND sb.id = $2
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