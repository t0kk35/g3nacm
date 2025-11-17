'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { RoleForm, RoleFormSkeleton } from "@/components/admin/role/RoleForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

type Props = {params: Promise<{ roleId : number }>}

export default async function RoleEdit({ params } : Props) {

  const roleId  = (await params).roleId;
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user
  
  return (
    <PermissionGuard userName={user?.name} permissions={['admin.role']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">User Roles</h1>
          <p className="text-muted-foreground pb-2">Change Role Permissions</p>
        </div>
        <Suspense fallback={<RoleFormSkeleton />}>
          <RoleForm roleId={roleId} />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}