import { userOrgAccessCache } from "./cache";
import { queryUserOrgUnitAccess } from "../data/queries/org_unit/user_access";

export async function getCachedUserOrgAccess(userName: string) {
    const key = `userOrgAccess:${userName}`;

    return userOrgAccessCache.get(
        key,
        async () => {
            const result = await queryUserOrgUnitAccess({}, {userName: userName});
            if (result.length === 0) throw Error(`User Organisation Access for User "${userName}" could not be found`);
            if (result.length > 1) throw Error(`User Organisation Access for User "${userName}" is not unique`);
            return result[0]
        },
        600_000
    )
}