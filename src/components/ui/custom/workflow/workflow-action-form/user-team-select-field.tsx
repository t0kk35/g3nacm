import { WorkflowFieldRendererProps } from "./workflow-action-form";
import { UserTeam } from "@/lib/data/queries/user/user";
import { DynamicSelectField } from "./dynamic-select-field";

async function getUserTeams(): Promise<UserTeam[]> {
    const users = fetch("/api/data/team/list")
        .then(res => { 
            if (!res.ok) throw new Error("Could not team list")
            else return res.json();
        })
        .then(j => j as UserTeam[]);
    return users;
}

export const UserTeamSelectField = (props: WorkflowFieldRendererProps) => (
    <DynamicSelectField<UserTeam>
        {...props}
        fetchOptions={getUserTeams}
        getLabel={(ut) => ut.name}
        getDescription={(ut) => ut.description}
        loadingText="Loading teams..."
        emptyText="No teams found."
    />
);