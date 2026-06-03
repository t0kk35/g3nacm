export type OrgUnit = {
    id: number;
    code: string;
    name: string;
    parent_id: number | null;
    path: string;
    deleted: boolean;
}

export type OrgUnitNode = OrgUnit & { children: OrgUnitNode[] };

export type OrgUnitFilter = {
    org_unit_code: string
}

export type OrgUnitUserAccess = {
    user_id: number;
    org_unit_id: number;
    path: string;
}

export type UserOrgUnitAccess = {
    user_name: number;
    org_units: {
        org_unit_code: number;
        path: string;
    }[]
}