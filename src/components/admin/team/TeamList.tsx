'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { TeamListClient } from "./TeamListClient"
import { UserTeam } from "@/app/api/data/user/user"

export async function TeamList() {
  
  const teams = await authorizedGetJSON<UserTeam[]>(`${process.env.DATA_URL}/api/data/user/team`)

  return (
    <TeamListClient teams={teams}></TeamListClient>
  )
}