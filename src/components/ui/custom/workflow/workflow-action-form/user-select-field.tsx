import { WorkflowFieldRendererProps } from "./workflow-action-form";
import { User } from "@/app/api/data/user/user";
import { DynamicSelectField } from "./dynamic-select-field";

async function getUsers(): Promise<User[]> {
    const users = fetch("/api/data/user/user")
        .then(res => { 
            if (!res.ok) throw new Error("Could not get User list")
            else return res.json();
        })
        .then(j => j as User[]);
    return users;
}

export const UserSelectField = (props: WorkflowFieldRendererProps) => (
  <DynamicSelectField<User>
      {...props}
      fetchOptions={getUsers}
      getLabel={(u) => u.name}
      getDescription={(u) => `${u.firstName} ${u.lastName}`}
      loadingText="Loading users..."
      emptyText="No users found."
  />
);