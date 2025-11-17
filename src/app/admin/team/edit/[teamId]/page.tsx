'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { TeamForm, TeamFormSkeleton } from "@/components/admin/team/TeamForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"

type Props = {params: Promise<{ teamId : number }>}

export default async function RoleEdit({ params } : Props) {
    
    const teamId  = (await params).teamId;
    // Get user details for the permission guard
    const session = await auth()
    const user = session?.user
    
    return (
			<PermissionGuard userName={user?.name} permissions={['admin.team']} fallback={<NoPermission />}>
        <div className="container p-4">
          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight">User Roles</h1>
            <p className="text-muted-foreground pb-2">Change Role Permissions</p>
          </div>
          <Suspense fallback={<TeamFormSkeleton />}>
            <TeamForm teamId={teamId} />
          </Suspense>
        </div>
		</PermissionGuard>
  )
}