'use server'

import { auth } from "@/auth";
import { Suspense } from "react";
import { RoleList } from "@/components/admin/role/RoleList";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";

export default async function RolesPage() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.role']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1 pb-2">
            <h1 className="text-xl font-bold tracking-tight">User Roles</h1>
            <p className="text-muted-foreground">Create user role</p>
        </div>  
        <Suspense fallback={<ListSkeleton />}>
          <RoleList />
        </Suspense>  
      </div>
    </PermissionGuard>
  )
}
