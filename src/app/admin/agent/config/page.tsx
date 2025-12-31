'use server'

import { auth } from "@/auth";
import { Suspense } from "react";
import { AgentConfigList } from "@/components/admin/agent/config/AgentConfigList";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";

export default async function AgentConfigPage() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.agent.config']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1 pb-2">
            <h1 className="text-xl font-bold tracking-tight">Agent Configuration</h1>
            <p className="text-muted-foreground">Create an agent configuration</p>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <AgentConfigList />
        </Suspense>  
      </div>
    </PermissionGuard>
  )
  
}