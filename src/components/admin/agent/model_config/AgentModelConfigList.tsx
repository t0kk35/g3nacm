'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { AgentModelConfigListClient } from "./AgentModelConfigListClient";
import { AgentModelConfigAdmin } from "@/app/api/data/agent/types";

export async function AgentModelConfigList() {

  const agentConfigs = await authorizedGetJSON<AgentModelConfigAdmin[]>(`${process.env.DATA_URL}/api/data/agent/model_config`)

  return (
    <AgentModelConfigListClient agentConfigs={agentConfigs}></AgentModelConfigListClient>
  )
}