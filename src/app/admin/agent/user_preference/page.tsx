'use server'

import { auth } from "@/auth";
import { Suspense } from "react";
import { AgentUserPreferenceForm } from "@/components/admin/agent/user_preference/AgentUserPreferenceForm";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";

export default async function AgentModelConfigPage() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <>
      {user?.name ? (
        <PermissionGuard userName={user?.name} permissions={['user.agent.preference']} fallback={<NoPermission />}>
          <div className="container p-4">
            <div className="space-y-1 pb-2">
                <h1 className="text-xl font-bold tracking-tight">Agent User Preferences</h1>
                <p className="text-muted-foreground">Set-up preferences for AI Agent interaction</p>
            </div>
            <Suspense fallback={<ListSkeleton />}>
              <AgentUserPreferenceForm userName={user.name}/>
            </Suspense> 
          </div>
        </PermissionGuard>
        ) : (
          <NoPermission />
        )}
    </>
  )
}