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