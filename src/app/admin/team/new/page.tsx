'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { TeamForm, TeamFormSkeleton } from "@/components/admin/team/TeamForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

export default async function TeamNew() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user
  
  return (
    <PermissionGuard userName={user?.name} permissions={['admin.role']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">User Teams</h1>
          <p className="text-muted-foreground">Create a new team.</p>
        </div>
        <Suspense fallback={<TeamFormSkeleton />}>
          <TeamForm />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}