import { cookies } from "next/headers";
import { APIError } from "./api-error-handling";
import { getCachedUserOrgAccess } from "./cache/user-org-access-cache";
import { getCachedOrgUnit } from "./cache/org-unit-cache";

/**
 * Checks if a child path is under a parent path in the hierarchy.
 * @param parentPath - Path the user has access to (e.g., "1/2").
 * @param childPath - Path of the data item's org unit (e.g., "1/2/3").
 * @returns True if childPath is under parentPath.
 */
function isPathUnderHierarchy(parentPath: string, childPath: string): boolean {
    return childPath.startsWith(`${parentPath}/`) || childPath === parentPath;
}

/**
 * Checks if an org unit is within the accessible hierarchy of a given user.
 * Uses the user org access cache + a direct DB lookup for the target org unit's path.
 * Safe to call from background jobs (no cookie/session dependency).
 */
export async function isOrgUnitAccessibleToUser(userName: string, orgUnitCode: string): Promise<boolean> {

    let org;
    let userAccess;
    try {
        org = await getCachedOrgUnit(orgUnitCode, userName);
        userAccess = await getCachedUserOrgAccess(userName);
    } catch (error) {
        console.log('Error Fetching Org and UserAccess ' + (error as Error).message)
        return false;
    }
    if (org.deleted) return false;
    return userAccess.org_units.some(ou => isPathUnderHierarchy(ou.path, org.path));
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

/**
 * Helper function to call internal API's from server code. It will automatically forward the user credentials 
 * and return a typed object
 * @param url - URL to fetch
 * @returns A promise of typed object <T>
 */
export async function authorizedGetJSON<T>(url: string) {
    const authcookie = (await cookies()).get('authjs.session-token')
    const result = await fetch(url, {
        method: "GET",
        headers: {
          Cookie: `authjs.session-token=${authcookie?.value}`,
        }
    })
    if (!result.ok) {
        const err: APIError = await result.json();
        throw new Error(`Error Calling URL '${url}' Error Code: ${err.errorCode}. Error Message ${err.message}`);
    }
    return result.json() as Promise<T>;
}

export async function authorizedPostJSON<T>(url: string, body: string) {
    const authcookie = (await cookies()).get('authjs.session-token')
    const result = await fetch(url, {
        method: "POST",
        body: body,
        headers: {
            'Content-type': 'application/json',
            Cookie: `authjs.session-token=${authcookie?.value}`,
        }
      })
    if (!result.ok) {
        const err: APIError = await result.json();
        throw new Error(`Error POSTING URL '${url}' Error Code: ${err.errorCode}. Error Message ${err.message}`);
    }
    return result.json() as Promise<T>;
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