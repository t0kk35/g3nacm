'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { AgentModelConfigForm } from "@/components/admin/agent/model_config/AgentModelConfigForm"
import { AgentModelConfigFormSkeleton } from "@/components/admin/agent/model_config/AgentModelConfigForm"
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server"
import { NoPermission } from "@/components/ui/custom/no-permission"
import { getTranslations } from "next-intl/server"

type Props = {params: Promise<{ configCode : string }>}

export default async function AgentModelConfigEdit( { params }: Props) {

  const configCode  = (await params).configCode;
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user
  const t = await getTranslations('Admin.Agent.ModelConfig')

  return (
    <PermissionGuard userName={user?.name} permissions={['admin.agent.model.config']} fallback={<NoPermission />}>
      <div className="container p-4">
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">{t('listDescription')}</h1>
          <p className="text-muted-foreground">{(t('formDescription'))}</p>
        </div>
        <Suspense fallback={<AgentModelConfigFormSkeleton />}>
          <AgentModelConfigForm modelConfigCode={configCode} />
        </Suspense>
      </div>
    </PermissionGuard>
  )
}