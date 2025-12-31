'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentConfigAdmin } from "@/app/api/data/agent/types"
import { AgentToolAdmin } from "@/app/api/data/agent/types"
import { AgentModelConfig } from "@/lib/cache/agent-model-config-cache"
import { AgentConfigFormClient } from "./AgentConfigFormClient"

type Props = {
    configCode?: string;
}

export async function AgentConfigForm({ configCode } : Props) {

  const agentConfig = configCode ? await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/config?code=${configCode}`)
    .then(res => {
      if (!res.ok) throw new Error(`Error fetching agent config code with code "${configCode}"`);
        return res.json();
      })
    .then(j => j as AgentConfigAdmin[])
    .then(ac => { 
      if (ac.length === 0) throw new Error(`Agent model with code "${configCode}" not found`)
      else return ac[0]
    }) : undefined

  const agentTools = authorizedFetch(`${process.env.DATA_URL}/api/data/agent/tool`)
    .then(res => { 
      if (!res.ok) throw new Error(`Could not get agent tools`)
      else return res.json()
    })
    .then(j => j as AgentToolAdmin[])

  const agentModelConfig = authorizedFetch(`${process.env.DATA_URL}/api/data/agent/model_config`)
    .then(res => { 
      if (!res.ok) throw new Error(`Could not get agent model config`)
      else return res.json()
    })
    .then(j => j as AgentModelConfig[])

  const data = await Promise.all([agentTools, agentModelConfig]);

  return(
    <AgentConfigFormClient config={agentConfig} iTools={data[0]} iModelConfig={data[1]}/>
  )

}

export async function AgentConfigSkeleton() {
  return (
    <div className="space-y-2">
      {/* Back button card */}
      <Card className="pt-5">
        <CardContent>
          <Skeleton className="h-9 w-56" />
        </CardContent>
      </Card>

      {/* Agent Configuration Details */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Input fields */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Selects */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Textarea */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>

            {/* Optional Max Steps */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Tools Section */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>

            <Skeleton className="h-10 w-full sm:w-64" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20" />
            ))}
          </div>

          {/* Tool list */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="space-y-1 w-full">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>

        <CardFooter>
          <Skeleton className="h-10 w-56" />
        </CardFooter>
      </Card>
    </div>
  )
}