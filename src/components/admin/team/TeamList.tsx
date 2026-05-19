'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { TeamListClient } from "./TeamListClient"
import { UserTeam } from "@/lib/data/queries/user/user"

export async function TeamList() {
  
  const teams = await authorizedGetJSON<UserTeam[]>(`${process.env.DATA_URL}/api/data/team/list`)

  return (
    <TeamListClient teams={teams}></TeamListClient>
  )
}