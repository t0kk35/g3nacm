'use server'

import { authorizedFetch, authorizedGetJSON } from "@/lib/org-filtering"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { OrgUnitManagerClient } from "./OrgUnitManagerClient"

export async function OrgUnitManager() {

    const hierarchy = await authorizedGetJSON<OrgUnitNode[]>(`${process.env.DATA_URL}/api/data/org_unit/hierarchy?include_deleted=y`)

    return (
        <OrgUnitManagerClient orgUnits={hierarchy} />
    )
}

export async function OrgUnitManagerSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <Skeleton className="h-10 w-full" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <div className="pl-6 space-y-2">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-6 w-36" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}