'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { UserAdmin } from "@/app/api/data/user/user"
import { UserListClient } from "./UserListClient"

export async function UserList() {

  const users = await authorizedGetJSON<UserAdmin[]>(`${process.env.DATA_URL}/api/data/user/user_admin`);

  return (
    <UserListClient users={users}></UserListClient>
  )
}