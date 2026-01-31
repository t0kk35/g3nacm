'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { AgentUserPreference } from "@/app/api/data/agent/types"
import { AgentUserPerferenceFormClient } from "./AgentUserPreferenceFormClient"

type Props = {
  userName: string;
}

export async function AgentUserPreferenceForm({ userName }: Props) {
  const userPreference = await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/user_preference`)
    .then(res => {
      if (!res.ok) throw new Error(`Error fetching agent user preference for user`);
        return res.json();
      })
    .then(j => j as AgentUserPreference)

  return (
    <AgentUserPerferenceFormClient userName={userName} preference={userPreference} />
  )
}