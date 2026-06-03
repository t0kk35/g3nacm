import { orgUnitCache } from "./cache";
import { queryOrgUnitList } from "../data/queries/org_unit/list";

export async function getCachedOrgUnit(orgUnitCode: string, userName: string) {
    const key = `orgUnint:${orgUnitCode}`;

    return orgUnitCache.get(
        key,
        async () => {
            const result = await queryOrgUnitList({org_unit_code: orgUnitCode}, { userName: userName})
            if (result.length === 0) throw Error(`Organisation unit with code "${orgUnitCode}" could not be found`);
            if (result.length > 1) throw Error(`Organisation unit with code "${orgUnitCode}" is not unique`);
            return result[0]
        },
        600_000
    )
}