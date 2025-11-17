'use server'

import { auth } from "@/auth";
import { Suspense } from "react";
import { UserList } from "@/components/admin/user/UserList";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";

export default async function UserPage() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user
  
  return (
    <PermissionGuard userName={user?.name} permissions={['admin.user']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1 pb-2">
          <h1 className="text-xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Create User</p>
        </div>  
        <Suspense fallback={<ListSkeleton />}>
          <UserList />
        </Suspense>  
      </div>
    </PermissionGuard>
  )
}