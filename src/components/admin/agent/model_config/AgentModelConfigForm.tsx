'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AgentModelConfigAdmin } from "@/app/api/data/agent/types"
import { AgentModelConfigFormClient } from "./AgentModelConfigFormClient"

type Props = {
    modelConfigCode?: string;
}

export async function AgentModelConfigForm({ modelConfigCode } : Props) {

  // Theorecticall we could get away with not fetching here, but in order to keep things consistent....
  const modelConfig = modelConfigCode ? await authorizedFetch(`${process.env.DATA_URL}/api/data/agent/model_config?code=${modelConfigCode}`)
    .then(res => {
      if (!res.ok) throw new Error(`Error fetching agent model config code with code "${modelConfigCode}"`);
        return res.json();
      })
    .then(j => j as AgentModelConfigAdmin[])
    .then(ac => { 
      if (ac.length === 0) throw new Error(`Agent model config with code "${modelConfigCode}" not found`)
      else return ac[0]
    }) : undefined

  return(
    <AgentModelConfigFormClient config={modelConfig}/>
  )

}

export async function AgentModelConfigFormSkeleton() {
  return (
    <div className="space-y-2">
      {/* Back Button Skeleton */}
      <Card className="pt-5">
        <CardContent>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-9 w-48 rounded-md" />
          </div>
        </CardContent>
      </Card>

      {/* Basic Configuration Skeleton */}
      <Card>
        <CardHeader className="pb-2 space-y-2">
          <CardTitle>
            <Skeleton className="h-5 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Configuration Code */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-56" />
            </div>

            {/* Configuration Name */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Provider Select */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Model Select (conditional placeholder) */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}