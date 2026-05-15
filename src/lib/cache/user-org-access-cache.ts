import * as db from "@/db"
import { userOrgAccessCache } from "./cache";

const user_access_query = `
SELECT 
    u.name AS user_name,
    ARRAY_REMOVE(
        ARRAY_AGG(
            JSONB_BUILD_OBJECT(
                'org_unit_code', ou.code,
                'path', ou.path 
            )
        ), NULL) AS "org_units"
FROM users u
JOIN org_unit_user_access ouua ON ouua.user_id = u.id
JOIN org_unit ou ON ou.id = ouua.org_unit_id
WHERE u.name = $1
GROUP by u.name
`

type UserOrgUnitAccess = {
    user_name: number;
    org_units: {
        org_unit_code: number;
        path: string;
    }[]
}

export async function getCachedUserOrgAccess(userName: string) {
    const key = `userOrgAccess:${userName}`;

    return userOrgAccessCache.get(
        key,
        async () => {
            const res = await db.pool.query(user_access_query, [userName]);
            if (res.rows.length === 0) throw Error(`User Organisation Access for User "${userName}" could not be found`);
            if (res.rows.length > 1) throw Error(`User Organisation Access for User "${userName}" is not unique`);
            const out:UserOrgUnitAccess = res.rows[0];
            return out
        },
        600_000
    )
}