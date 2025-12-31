'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { AgentConfigForm } from "@/components/admin/agent/config/AgentConfigForm"
import { AgentConfigSkeleton } from "@/components/admin/agent/config/AgentConfigForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

type Props = {params: Promise<{ configCode : string }>}

export default async function AgentConfigEdit({ params }: Props) {

  const configCode  = (await params).configCode;
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.agent.config']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">Agent Configuration</h1>
          <p className="text-muted-foreground">Create a new agent and set-up the parameters</p>
        </div>
        <Suspense fallback={<AgentConfigSkeleton />}>
          <AgentConfigForm configCode={configCode} />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}