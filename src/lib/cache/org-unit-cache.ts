import * as db from "@/db"
import { orgUnitCache } from "./cache";
import { OrgUnit } from "@/app/api/data/org_unit/org_unit";

const org_unit_query = `
SELECT 
 ou.id AS "id",
 ou.code AS "code",
 ou.name AS "name",
 ou.parent_id AS "parent_id",
 ou.path AS "path",
 ou.deleted AS "deleted"
FROM org_unit ou
WHERE ou.code = $1
`

export async function getCachedOrgUnit(orgUnitCode: string) {
    const key = `orgUnint:${orgUnitCode}`;

    return orgUnitCache.get(
        key,
        async () => {
            const res = await db.pool.query(org_unit_query, [orgUnitCode]);
            if (res.rows.length === 0) throw Error(`Organisation unit with code "${orgUnitCode}" could not be found`);
            if (res.rows.length > 1) throw Error(`Organisation unit with code "${orgUnitCode}" is not unique`);
            const out:OrgUnit = res.rows[0];
            return out
        },
        600_000
    )
}