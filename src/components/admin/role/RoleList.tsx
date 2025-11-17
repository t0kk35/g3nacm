'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { RoleListClient } from "./RoleListClient"
import { UserRole } from "@/app/api/data/user/user";

export async function RoleList() {
  const roles = await authorizedFetch(`${process.env.DATA_URL}/api/data/user/role`)
    .then(res=> {
      if (!res.ok) throw new Error(`Could not get roles`);
      else return res.json();
    })
    .then(j => j as UserRole[])

  return (
    <RoleListClient roles={roles}></RoleListClient>
  )
}