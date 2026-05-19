'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { RoleListClient } from "./RoleListClient"
import { UserRole } from "@/lib/data/queries/user/user";

export async function RoleList() {

  const roles = await authorizedGetJSON<UserRole[]>(`${process.env.DATA_URL}/api/data/role/list`)

  return (
    <RoleListClient roles={roles}></RoleListClient>
  )
}