'use server'

import { auth } from "@/auth";
import { authorizedGetJSON } from "@/lib/org-filtering";
import { Suspense } from "react";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";
import { RfiRequestDetails } from "@/components/rfi/RfiRequestDetails";
import { SubjectDetailsGenericSkeleton } from "@/components/subject/SubjectDetailsGeneric";
import { RfiRequest, RfiResponse } from "@/app/api/data/rfi/type";

type Props = {params: Promise<{ rfiId : string }>}

export default async function RfiDetails({ params }: Props) {
  
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  // Fetch alert details
  const rfiId  = (await params).rfiId;
  const rfi = await authorizedGetJSON<RfiRequest[]>(`${process.env.DATA_URL}/api/data/rfi/rfi_request?rfi_id=${rfiId}`).
    then(r=> {
      if(r.length === 0) throw new Error(`Could not find RFI Request with ${rfiId}`)
      else return r[0]
    });
  const reponses = await authorizedGetJSON<RfiResponse[]>(`${process.env.DATA_URL}/api/data/rfi/rfi_response?rfi_id=${rfiId}`)

  return (
    <PermissionGuard userName={user?.name} permissions={['data.rfi_request']} fallback={ <NoPermission />}>
      <div className="flex flex-col px-4 py-4 gap-2">
        <Suspense fallback={<SubjectDetailsGenericSkeleton />}>
          <RfiRequestDetails rfiRequest={rfi} rfiResponses={reponses}/>
        </Suspense>
      </div>
    </PermissionGuard>  
  )

}