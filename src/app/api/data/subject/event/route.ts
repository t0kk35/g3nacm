'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { SubjectEvent } from "../types";
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/subject/event'

const query_text = `
SELECT 
    ROW_NUMBER () OVER (
    ORDER BY
      x.date_time
    ) as "id",
    x.title,
    x.description,
    x.date_time,
    x.type
FROM (
  SELECT 
    'Aquired' AS "title",
    'Acuired customer ' || sb.name || ' initial Riskscore ' || sb.kyc_risk AS "description",
    acquisition_date AS "date_time",
    'data' AS "type"
  FROM subject_base sb
  JOIN org_unit ou ON ou.code = sb.org_unit_code
  JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
  JOIN users u ON ouap.user_id = u.id
  WHERE u.name = $1
  AND sb.id = $2
  UNION 
  SELECT 
    'Referential Data Change' as "title",
    'Subject data changed' AS "description",
    sbh.date_from as "date_time",
    'data' AS "type"
  FROM subject_base_history sbh
  JOIN org_unit ou ON ou.code = sbh.org_unit_code
  JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
  JOIN users u ON ouap.user_id = u.id
  WHERE u.name = $1
  AND sbh.id = $2
  UNION 
  SELECT 
    'Alert Created' AS "title",
    ab.description as "description",
    ab.create_date_time AS "date_time",
    'alert' AS "type"
  FROM alert_base ab
  JOIN alert_item ai on ab.id = ai.alert_id
  JOIN org_unit ou ON ou.code = ab.org_unit_code
  JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
  JOIN users u ON ouap.user_id = u.id
  WHERE u.name = $1
  AND ai.item_id = $2
  UNION
  SELECT
    'Product Linked' AS "title",
    'Linked with role ' || psl.role || ' to product ID ' || pb.identifier || ' of type ' || pb.category AS "description",
    psl.date_time AS "date_time",
    'product' AS "type" 
  FROM product_subject_link psl
  JOIN product_base pb on pb.id = psl.product_id
  JOIN org_unit ou ON ou.code = pb.org_unit_code
  JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
  JOIN users u ON ouap.user_id = u.id
  WHERE u.name = $1
  AND psl.subject_id = $2 
) as x
WHERE ($3::timestamp IS NULL OR x.date_time >= $3::timestamp)
  AND ($4::timestamp IS NULL OR x.date_time <= $4::timestamp)
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
            name: 'api_data_subject_event',
            text: query_text,
            values: [user.name, subjectId, fromDate, toDate]
        }
        try {
            const subject_prod = await db.pool.query(query)
            const res:SubjectEvent[] = subject_prod.rows
            return NextResponse.json(res)
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get subject events', error as Error);
        }

    }
}