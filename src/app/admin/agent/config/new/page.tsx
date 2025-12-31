'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { AgentConfigForm } from "@/components/admin/agent/config/AgentConfigForm"
import { RoleFormSkeleton } from "@/components/admin/role/RoleForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

export default async function AgentConfigNew() {

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
        <Suspense fallback={<RoleFormSkeleton />}>
          <AgentConfigForm />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}