'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { RoleListClient } from "./RoleListClient"
import { UserRole } from "@/app/api/data/user/user";

export async function RoleList() {

  const roles = await authorizedGetJSON<UserRole[]>(`${process.env.DATA_URL}/api/data/user/role`)

  return (
    <RoleListClient roles={roles}></RoleListClient>
  )
}