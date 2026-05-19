'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { UserAdmin } from "@/lib/data/queries/user/user"
import { UserListClient } from "./UserListClient"

export async function UserList() {

  const users = await authorizedGetJSON<UserAdmin[]>(`${process.env.DATA_URL}/api/data/user/list_admin`);

  return (
    <UserListClient users={users}></UserListClient>
  )
}