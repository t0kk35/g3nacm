'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { UserAdmin } from "@/app/api/data/user/user"
import { UserListClient } from "./UserListClient"

export async function UserList() {
  const users = await authorizedFetch(`${process.env.DATA_URL}/api/data/user/user_admin`)
    .then(res=> {
      if (!res.ok) throw new Error(`Could not get users`);
      else return res.json();
    })
    .then(j => j as UserAdmin[])

  return (
    <UserListClient users={users}></UserListClient>
  )
}