'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { TeamListClient } from "./TeamListClient"
import { UserTeam } from "@/app/api/data/user/user"
import { APIError } from "@/lib/api-error-handling"

export async function TeamList() {
  
  const teams = await authorizedFetch(`${process.env.DATA_URL}/api/data/user/team`)
    .then(async res=> {
      if (!res.ok) {
        const err: APIError = await res.json();
        throw new Error(`Could not get teams. Error Code: ${err.errorCode}. Error Message: ${err.message}`);
      } 
      else return res.json();
    })
    .then(j => j as UserTeam[])

  return (
    <TeamListClient teams={teams}></TeamListClient>
  )
}