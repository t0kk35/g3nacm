'use server'

import { auth } from "@/auth";
import { authorizedGetJSON } from "@/lib/org-filtering";
import { Suspense } from "react";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";
import { RfiRequestDetails } from "@/components/rfi/RfiRequestDetails";
import { SubjectDetailsGenericSkeleton } from "@/components/subject/SubjectDetailsGeneric";
import { RfiRequest, RfiResponse } from "@/lib/data/queries/rfi/type";
import { TemplateContext } from "@/lib/ai-tools";
import { ChatWindow } from "@/components/ui/custom/chat-window";

type Props = {params: Promise<{ rfiId : string }>}

export default async function RfiDetails({ params }: Props) {
  
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  // Fetch alert details
  const rfiId  = (await params).rfiId;
  const rfiRequest = await authorizedGetJSON<RfiRequest[]>(`${process.env.DATA_URL}/api/data/rfi/rfi_request?rfi_id=${rfiId}`).
    then(r=> {
      if(r.length === 0) throw new Error(`Could not find RFI Request with ${rfiId}`)
      else return r[0]
    });
  const rfiReponses = await authorizedGetJSON<RfiResponse[]>(`${process.env.DATA_URL}/api/data/rfi/rfi_response?rfi_id=${rfiId}`)

  // Get the agent code for the chat window 
  const agentCode = await authorizedGetJSON<string | undefined>(`${process.env.DATA_URL}/api/data/agent/workflow?workflow_state_code=${rfiRequest.entity_state.to_state_code}`)

  // Setup context for the agent
  const agentContext: TemplateContext = {
    'userName': user?.name!,
    'rfi_request': rfiRequest,
    'rfi_responses': rfiReponses
  }

  return (
    <PermissionGuard userName={user?.name} permissions={['data.rfi_request']} fallback={ <NoPermission />}>
      <div className="flex flex-col px-4 py-4 gap-2">
        <Suspense fallback={<SubjectDetailsGenericSkeleton />}>
          <RfiRequestDetails rfiRequest={rfiRequest} rfiResponses={rfiReponses}/>
          { agentCode && (
            <ChatWindow agent={agentCode} 
              context={agentContext} 
              orgUnitCode={rfiRequest.org_unit_code}
              entityCode={rfiRequest.entity_code}
              entityId={rfiRequest.id}
            />
          )}
        </Suspense>
      </div>
    </PermissionGuard>  
  )

}