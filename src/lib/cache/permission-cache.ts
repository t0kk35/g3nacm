import * as db from "@/db"
import { permissionCache } from "./cache";

const permission_query_text = `
  SELECT DISTINCT up.permission AS permission
  FROM users u
  JOIN user_role_link url ON u.id = url.user_id
  JOIN user_role_permission_link urpl ON url.role_id = urpl.role_id
  JOIN user_permission up ON urpl.permission_id = up.id
  WHERE u.name = $1 AND u.deleted = false
`

export async function getUserPermissions(userName: string) {
    const key = `userPermission:${userName}`;

    return permissionCache.get(
        key,
        async () => {
            const res = await db.pool.query(permission_query_text, [userName]);
            const permissions:string[] = res.rows.map(r => r.permission);
            if (permissions.length < 1) throw new Error(`Permission Cache Error. Could not find permissions for user with code "${userName}"`)
            return permissions;
        },
        600_000
    )
    
}