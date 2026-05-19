'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { AgentConfigListClient } from "./AgentConfigListClient";
import { AgentConfigAdmin } from "@/lib/data/queries/agent/types";

export async function AgentConfigList() {
  
  const agentConfigs = await authorizedGetJSON<AgentConfigAdmin[]>(`${process.env.DATA_URL}/api/data/agent/config`)

  return (
    <AgentConfigListClient agentConfigs={agentConfigs}></AgentConfigListClient>
  )
}