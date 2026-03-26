import * as db from "@/db"
import { rfiChannelCache } from "./cache";
import { RfiChannel } from "@/app/api/data/rfi/type";

const channel_query_text = `
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
WHERE rc.code = $1
`

export async function getChannelByCode(channelCode: string) {
    const key = `rfiChannelCode:${channelCode}`;

    return rfiChannelCache.get(
        key,
        async () => {
            const res = await db.pool.query(channel_query_text, [channelCode]);
            const channels:RfiChannel[] = res.rows;
            if (channels.length < 1) throw new Error(`RFI Channel Cache Error. Could not find channel code "${channelCode}"`)
            return channels[0];
        },
        600_000
    )    

}