'use server'

import { auth } from "@/auth";
import { Suspense } from "react";
import { TeamList } from "@/components/admin/team/TeamList";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";

export default async function TeamsPage() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.team']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1 pb-2">
          <h1 className="text-xl font-bold tracking-tight">User Teams</h1>
            <p className="text-muted-foreground">Create user team</p>
        </div>  
        <Suspense fallback={<ListSkeleton />}>
          <TeamList />
        </Suspense>  
      </div>
    </PermissionGuard>
  )
}
