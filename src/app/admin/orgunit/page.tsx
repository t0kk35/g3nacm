'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { OrgUnitManager, OrgUnitManagerSkeleton } from "@/components/admin/orgunit/OrgUnitManager"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"
import { getTranslations } from "next-intl/server"

export default async function OrgUnitPage() {
  
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user
  const t = await getTranslations('Admin.OrgUnit')

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.org_unit']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">{ t('pageTitle') }</h1>
          <p className="text-muted-foreground pb-2">{ t('pageDescription') }</p>
        </div>
        <Suspense fallback={<OrgUnitManagerSkeleton />}>
          <OrgUnitManager />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}
