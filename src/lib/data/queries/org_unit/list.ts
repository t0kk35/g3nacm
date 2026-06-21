import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { zStringToBoolean } from '../../params';
import { OrgUnit } from '@/lib/data/queries/org_unit/org_unit';

const paramsSchema = z.object({
    org_unit_id: z.coerce.number().optional(),
    org_unit_code: z.string().optional(),
    include_deleted: zStringToBoolean.optional() 
})

const query_text = `
SELECT 
    id,
    code,
    name,
    parent_id,
    path,
    deleted
FROM org_unit ou
WHERE (ou.deleted = FALSE OR ($1 AND ou.deleted = TRUE)) 
AND ($2::integer IS null OR ou.id = $2)
AND ($3::text IS null or ou.name = $3)
`

export const queryOrgUnitList = defineQuery({
    path: 'org_unit/list',
    permissions: [],
    params: paramsSchema,
    execute: async ({ org_unit_id, include_deleted, org_unit_code }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<OrgUnit[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [include_deleted, org_unit_id, org_unit_code]);
            return result.rows as OrgUnit[];
        } catch (err) {
            throw new DataQueryError('Get OrgUnit List', err as Error);
        }
    },
});
