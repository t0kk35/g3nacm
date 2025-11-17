'use server'

import { auth } from "@/auth";
import { authorizedFetch } from "@/lib/org-filtering";
import { Alert } from "@/app/api/data/alert/alert";
import { Suspense } from "react";
import { EntityLockProvider } from "@/contexts/entity-lock-context";
import { EntityLockIndicator, EntityLockIndicatorSkeleton } from "@/components/ui/custom/entity-lock-indicator";
import { APIError } from "@/lib/api-error-handling";
import { isAmlTmAlert } from "@/app/api/data/alert/alert";
import { AlertDetailsDetection } from "@/components/alert/detail/tm/AlertDetailsDetection";
import { ChatWindow } from "@/components/ui/custom/chat-window";
import { TemplateContext } from "@/lib/ai-tools";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";
import { EntityAttachments } from "@/components/ui/custom/entity-attachment";

type Props = {params: Promise<{ alertId : string }>}

export default async function AlertDetails({ params }: Props) { 
  
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  // Fetch alert details
  const alertId  = (await params).alertId;
  const alert = await authorizedFetch(`${process.env.DATA_URL}/api/data/alert/detail?alert_id=${alertId}`)
    .then(async res => {
      if (!res.ok) {
        const err: APIError = await res.json();
        throw new Error(`Alert with id ${alertId} not found. Error Code: ${err.errorCode}. Error Message ${err.message}`);
      } 
        return res.json();
      })
    .then(j => j as Alert)

  // Setup context for the agent
  const agentContext: TemplateContext = {
    'userName': user?.name!,
    'alert': alert
  }

  return(
    <PermissionGuard userName={user?.name} permissions={['data.alert']} fallback={ <NoPermission />}>
      <EntityLockProvider entityId={alertId} entityCode={alert.entity_state.entity_code}>
        <div className="flex flex-col px-4 py-4 gap-2">
          <Suspense fallback={<EntityLockIndicatorSkeleton />}>
            <EntityLockIndicator />
          </Suspense>
          
          { /* Transaction Monitoring Alert */ }
          { isAmlTmAlert(alert) && (
            <>   
              <div className="flex flex-col gap-2">
                <AlertDetailsDetection alert={alert} />
                <EntityAttachments 
                  entityCode={alert.entity_state.entity_code}
                  entityId={alert.id}
                  orgUnitCode={alert.org_unit_code}
                />
                <ChatWindow agent="claude-base" 
                  context={agentContext} 
                  orgUnitCode={alert.org_unit_code}
                  entityCode={alert.entity_state.entity_code}
                  entityId={alert.id} 
                />
              </div>
            </>
          )}

        </div>
      </EntityLockProvider>
    </PermissionGuard>
  )
}