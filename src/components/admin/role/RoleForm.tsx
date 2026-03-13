'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RoleFormClient } from "./RoleFormClient"
import { UserRole } from "@/app/api/data/user/user"
import { UserPermission } from "@/app/api/data/user/user"

type Props = {
  roleId?: number;
}

export async function RoleForm({ roleId } : Props) {

  const role = roleId ? await authorizedGetJSON<UserRole[]>(`${process.env.DATA_URL}/api/data/user/role?role_id=${roleId}`)
    .then(ur => { 
      if (ur.length === 0) throw new Error(`Roless with id ${roleId} not found`)
      else return ur[0]
    }): undefined

  const permissions = await authorizedGetJSON<UserPermission[]>(`${process.env.DATA_URL}/api/data/user/permission`)

  return (
    <RoleFormClient role={role} iPermissions={permissions} />
  )
}

export async function RoleFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 w-36" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start space-x-2">
                  <Skeleton className="h-4 w-4" />
                  <div className="space-y-1 w-full">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Skeleton className="h-10 w-32 ml-auto" />
        </CardFooter>
      </Card>
    </div>
  )
}