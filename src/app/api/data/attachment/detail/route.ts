'use server'

import { auth } from '@/auth';
import * as db from '@/db'
import { requirePermissions } from '@/lib/permissions/check';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { EntityAttachment } from '../types';

const origin = 'api/data/attachment/detail'

const query_text = `
SELECT 
  wda.id as "id",
  entity_code,
  entity_id,
  org_unit_code,
  filename,
  original_filename,
  file_data,
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
WHERE u.name=$1 and wda.id = $2
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
    const attachmentId = searchParams.get("attachment_id");
    if (!attachmentId) return ErrorCreators.param.urlMissing(origin, "attachment_id");
    // Check if this is a preview request or download request
    const disposition = searchParams.get("download") === "true" ? "attachment" : "inline";

    if (!useMockData) { 
        try {
            const attachments = await db.pool.query(query_text, [user.name, attachmentId]);
            if (attachments.rows.length === 0) return ErrorCreators.db.entityNotFound(origin, 'attachment', attachmentId);
            if (attachments.rows.length > 1) return ErrorCreators.db.entityNotUnique(origin, 'attachment', attachmentId);
            const attachment:EntityAttachment = attachments.rows[0]            
            // Convert Buffer → Uint8Array
            const buffer: Buffer = attachments.rows[0].file_data
            const uint8 = new Uint8Array(buffer);
            const res = new NextResponse(uint8, {
                headers: {
                    'Content-Type': attachment.mime_type,
                    'Content-Disposition': disposition,
                    'filename': attachment.original_filename
                }
            });
            return res;
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get attachment detail', error as Error);
        }
    }
}