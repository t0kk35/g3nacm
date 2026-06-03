import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { zStringToBoolean } from '../../params';
import { OrgUnit, OrgUnitNode } from '@/lib/data/queries/org_unit/org_unit';

const paramsSchema = z.object({
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
FROM org_unit
WHERE (deleted = FALSE OR ($1 AND deleted = TRUE)) 
ORDER BY path
`

export const queryOrgUnitHierarchy = defineQuery({
    path: 'org_unit/hierarchy',
    permissions: [],
    params: paramsSchema,
    execute: async ({ include_deleted }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<OrgUnitNode[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [include_deleted]);
            const hierarchy = buildTree(result.rows)
            return hierarchy;
        } catch (err) {
            throw new DataQueryError('Get OrgUnit Hierarchy', err as Error);
        }
    },
});

function buildTree(org_units: OrgUnit[]): OrgUnitNode[] {
    const map = new Map<number, OrgUnitNode>();
    const roots: OrgUnitNode[] = [];

    // First pass: create node entries
    org_units.forEach(unit => {
        map.set(unit.id, { ...unit, children: [] });
    });

    // Second pass: build tree relationships
    org_units.forEach(unit => {
        const node = map.get(unit.id)!;
        if (unit.parent_id) {
            const parent = map.get(unit.parent_id);
            if (parent) parent.children.push(node);
        }
        else { roots.push(node) }
    });

    return roots;
}