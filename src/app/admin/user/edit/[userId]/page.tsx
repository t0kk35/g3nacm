'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { UserForm, UserFormSkeleton } from "@/components/admin/user/UserForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

type Props = {params: Promise<{ userId : number }>}

export default async function UserEdit({ params } : Props) {

    const userId  = (await params).userId;
    // Get user details for the permission guard
    const session = await auth()
    const user = session?.user
    
    return (
      <PermissionGuard userName={user?.name} permissions={['admin.user']} fallback={<NoPermission />}>
        <div className="container p-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground pb-2">Change User details</p>
          </div>
          <Suspense fallback={<UserFormSkeleton />}>
            <UserForm userId={userId} />
          </Suspense>
        </div>
      </PermissionGuard>
    )
}