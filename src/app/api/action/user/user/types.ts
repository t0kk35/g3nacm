import { User } from "@/app/api/data/user/user";

export type UserRequest = {
    name: string;
    first_name: string;
    last_name: string;
    role_ids: number[];
    team_infos: {
        team_id: number;
        team_rank: number;
    }[];
    org_unit_ids: number[];
}

export type UserRevokeRequest = {
    user_ids: number[];
    role_id?: number;
    team_id?: number;
}

export type UserAudit = {
    user: User;
    org_ids: number[];
    role_ids: number[];
    team_ids: number[];
}