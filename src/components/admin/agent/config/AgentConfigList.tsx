'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { AgentConfigListClient } from "./AgentConfigListClient";
import { AgentConfigAdmin } from "@/app/api/data/agent/types";
import { APIError } from "@/lib/api-error-handling";

export async function AgentConfigList() {
  const agentConfigs = await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/config`)
    .then(async res=> {
      if (!res.ok) {
        const error: APIError = await res.json();
        throw new Error(`Could not get Agent Config. Error-code = "${error.errorCode}". Erorr Message = "${error.message}"`);
      } 
      else return res.json();
    })
    .then(j => j as AgentConfigAdmin[])

  return (
    <AgentConfigListClient agentConfigs={agentConfigs}></AgentConfigListClient>
  )

}