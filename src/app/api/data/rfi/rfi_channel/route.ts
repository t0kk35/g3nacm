'use server'

import { auth } from "@/auth";
import * as db from '@/db'
import { NextRequest, NextResponse } from "next/server";
import { RfiChannel } from "../type"
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/data/rfi/rfi_channel'

const query_text = `
SELECT 
  id AS "id",
  code AS "code",
  name AS "name",
  type AS "type",
  is_inbound AS "is_inbound",
  is_outbound AS "is_outbound",
  configuration AS "configuration",
  credentials AS "credentials",
  validation_regex AS "validation_regex",
  requires_authentication AS "requires_authentication",
  supports_delivery_confirmation AS "supports_delivery_confirmation",
  supports_read_receipts AS "supports_read_receipts",
  supports_attachments AS "supports_attachments",
  max_attachment_size_mb AS "max_attachment_size_mb",
  is_active AS "is_active",
  is_default AS "is_default",
  create_datetime AS "create_datetime",
  update_datetime AS "update_datetime"
FROM rfi_channel rc
WHERE $1::integer IS NULL or rc.code = $1
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // User Auth and Permission checking
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    const searchParams = request.nextUrl.searchParams;
    const channelCode = searchParams.get("channel_code");

    if (!useMockData) {
        try {
            const response = await db.pool.query(query_text, [channelCode]);
            const res:RfiChannel[] = response.rows;
            return NextResponse.json(res);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get rfi channel', error as Error);
        }
    }
}