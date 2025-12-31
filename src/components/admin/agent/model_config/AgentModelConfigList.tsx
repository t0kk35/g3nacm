'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { AgentModelConfigListClient } from "./AgentModelConfigListClient";
import { AgentModelConfigAdmin } from "@/app/api/data/agent/types";
import { APIError } from "@/lib/api-error-handling";

export async function AgentModelConfigList() {
  const agentConfigs = await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/model_config`)
    .then(async res=> {
      if (!res.ok) {
        const error: APIError = await res.json();
        throw new Error(`Could not get Model Config. Error-code = "${error.errorCode}". Erorr Message = "${error.message}"`);
      } 
      else return res.json();
    })
    .then(j => j as AgentModelConfigAdmin[])

  return (
    <AgentModelConfigListClient agentConfigs={agentConfigs}></AgentModelConfigListClient>
  )
}