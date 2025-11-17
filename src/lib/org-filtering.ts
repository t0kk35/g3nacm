import { OrgUnitFilter } from "@/app/api/data/org_unit/org_unit";
import { OrgUnit } from "@/app/api/data/org_unit/org_unit";
import { OrgUnitUserAccess } from "@/app/api/data/org_unit/access/route";
import { cookies } from "next/headers";

/**
 * Checks if a child path is under a parent path in the hierarchy.
 * @param parentPath - Path the user has access to (e.g., "1/2").
 * @param childPath - Path of the data item's org unit (e.g., "1/2/3").
 * @returns True if childPath is under parentPath.
 */
function isPathUnderHierarchy(parentPath: string, childPath: string): boolean {
    return childPath.startsWith(`${parentPath}/`) || childPath === parentPath;
}

async function getOrganisations() {
    const org_units = await authorizedFetch(`${process.env.DATA_URL}/api/data/org_unit`)
        .then((res) => {
            if (!res.ok) throw new Error(`Could not get Organisation for filtering`) 
            else return res.json()
        })
        .then((j) => j as OrgUnit[]);
    return org_units
}

async function getUserAccess(userName: string) {
    const org_access = await authorizedFetch(`${process.env.DATA_URL}/api/data/org_unit_access?user_name=${userName}`)
        .then((res) => {
            if (!res.ok) throw new Error(`Could not get user access for filtering user: ${userName}`)
            else return res.json()
        })
        .then((j)=> j as OrgUnitUserAccess[])
    return org_access 
}

/**
 * Function that performs the org unit filtering on a single data element. The data element
 * must be of type OrgUnitFilter
 * The function will filter the data element according to the access granted to the users.
 * @param data - List of data elements to filter by Org-unit code.
 * @param user - The user for which we need to filter.
 * @returns - The data item if the user has access, else undefined
 */
export async function orgFilterSingle(data:OrgUnitFilter, user_name: string) {
    const org_func = getOrganisations()
    const acc_func = getUserAccess(user_name)
    const [org_units, org_access] = await Promise.all([org_func, acc_func])
    
    // Create a map that contains the org-unit codes and paths this user has access to
    const org_path_map = new Map(org_units.map((ou) => [ou.code, ou.path]));
    const accessiblePaths = org_access ? org_access.map((oa) => oa.path) : []

    const itemPath = org_path_map.get(data.org_unit_code); // Find path for the org unit
    if (!itemPath) return false
    return accessiblePaths.some((accesspath) => isPathUnderHierarchy(accesspath, itemPath)) ? data : undefined;
}

/**
 * Function that performs the org unit filtering on a list of data elements. The data elements
 * must be of type OrgUnitFilter[], items that are of a different type will be filtered out.
 * The function will filter the data element according to the access granted to the users.
 * @param data - List of data elements to filter by Org-unit code.
 * @param user - The user for which we need to filter.
 * @returns - A list of data elements that are filtered to only have items the user has access to.
 */
export async function orgFilterArray<T extends OrgUnitFilter>(data: T[], user_name: string): Promise<T[]> {
    const org_func = getOrganisations()
    const acc_func = getUserAccess(user_name)
    const [org_units, org_access] = await Promise.all([org_func, acc_func])
    
    // Create a map that contains the org-unit codes and paths this user has access to
    const org_path_map = new Map(org_units.map((ou) => [ou.code, ou.path]));
    const accessiblePaths = org_access ? org_access.map((oa) => oa.path) : []

    return data.filter((item) => {
        const itemPath = org_path_map.get(item.org_unit_code); // Find path for the org unit
        if (!itemPath) return false
    
        // Check if itemPath is under any accessible path
        return accessiblePaths.some((accesspath) => isPathUnderHierarchy(accesspath, itemPath));
    })
}

export async function authorizedFetch(url: string) {
    const authcookie = (await cookies()).get('authjs.session-token')
    const result = fetch(url, {
        method: "GET",
        headers: {
          Cookie: `authjs.session-token=${authcookie?.value}`,
        }
      })
    return result
}

export async function authorizedPost(url: string, body: string) {
    const authcookie = (await cookies()).get('authjs.session-token')
    const result = fetch(url, {
        method: "POST",
        body: body,
        headers: {
            'Content-type': 'application/json',
            Cookie: `authjs.session-token=${authcookie?.value}`,
        }
      })
    return result
}