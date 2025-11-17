export type User = {
    id: number;
    name: string;
    firstName: string;
    lastName:string;
    deleted: boolean;
}

export type UserAdmin = {
    id: number;
    name: string;
    first_name: string;
    last_name:string;
    role_ids: number[];
    team_infos: { 
            team_id: number;
            team_rank: number;
    }[];
    org_ids: number[];
}

export type UserTeam = {
    id: number;
    name: string;
    description: string;
    user_ids: number[];
}

export type UserRole = {
    id: number;
    name: string;
    description: string;
    permission_ids: number[];
    user_ids: number[];
}

export type UserPermission = {
    id: number;
    group: string;
    permission: string;
    description: string;
}

export type UserAssignment = {
    alerts: {
        total: number;
        user: {
            total: number;
            high_priority: number;
            medium_priority: number;
            low_priority: number;
        };
        team: {
            total: number;
            high_priority: number;
            medium_priority: number;
            low_priority: number;
        }
    };
}

export type UserHandled = {
    alerts : { 
        period: string;
        count: number
    }[];
}