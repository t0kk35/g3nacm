'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { AgentUserPreference } from "@/app/api/data/agent/types"
import { AgentUserPerferenceFormClient } from "./AgentUserPreferenceFormClient"

type Props = {
  userName: string;
}

export async function AgentUserPreferenceForm({ userName }: Props) {
  
  const userPreference = await authorizedGetJSON<AgentUserPreference>(`${process.env.DATA_URL}/api/data/agent/user_preference`)

  return (
    <AgentUserPerferenceFormClient userName={userName} preference={userPreference} />
  )
}