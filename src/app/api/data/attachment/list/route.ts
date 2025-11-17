'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { EntityAttachment } from '../types';

const origin = 'api/data/attachment/list'

const query_text = `
SELECT 
  wda.id as "id",
  entity_code,
  entity_id,
  filename,
  org_unit_code,
  original_filename,
  file_size,
  mime_type,
  uploaded_by_user_name,
  upload_date_time,
  description,
  is_active
FROM workflow_document_attachment wda
JOIN org_unit ou ON ou.code = wda.org_unit_code
JOIN v_user_org_access_path ouap ON ou.path = ouap.path OR ou.path LIKE CONCAT(ouap.path, '/%')
JOIN users u ON ouap.user_id = u.id
WHERE u.name=$1 AND wda.entity_id = $2 AND wda.entity_code = $3
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    const permissionCheck = await requirePermissions(user.name, origin, ['data.attachment']);
    if (permissionCheck) return permissionCheck; 

    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const entityId = searchParams.get("entity_id");
    if (!entityId) return ErrorCreators.param.urlMissing(origin, "entity_id");
    const entityCode = searchParams.get("entity_code");
    if (!entityCode) return ErrorCreators.param.urlMissing(origin, "entity_code");
    
    if (!useMockData) { 
        try {
            const query = {
                name: origin,
                text: query_text,
                values:[user.name, entityId, entityCode]
            };
            const attachments = await db.pool.query(query);
            const res: EntityAttachment[] = attachments.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get attachment list', error as Error);
        }
    }
}