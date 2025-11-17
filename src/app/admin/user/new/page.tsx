'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { UserForm, UserFormSkeleton } from "@/components/admin/user/UserForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

export default async function UserNew() {

  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.user']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Create a new User and assign roles</p>
        </div>
        <Suspense fallback={<UserFormSkeleton />}>
          <UserForm />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}