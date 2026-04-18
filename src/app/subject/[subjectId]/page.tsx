'use server'

import { auth } from "@/auth";
import { authorizedGetJSON } from "@/lib/org-filtering";
import { Suspense } from "react";
import { Subject } from "@/app/api/data/subject/types";
import { PermissionGuard } from "@/components/ui/custom/permission-guard-server";
import { NoPermission } from "@/components/ui/custom/no-permission";
import { SubjectDetailsGeneric, SubjectDetailsGenericSkeleton } from "@/components/subject/SubjectDetailsGeneric";

type Props = {params: Promise<{ subjectId : string }>}

export default async function SubhectDetails({ params }: Props) {
  
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user
  
  // Fetch alert details
  const subjectId  = (await params).subjectId;
  const subject = await authorizedGetJSON<Subject>(`${process.env.DATA_URL}/api/data/subject/detail?subject_id=${subjectId}`)

  return (
    <PermissionGuard userName={user?.name} permissions={['data.alert']} fallback={ <NoPermission />}>
      <div className="flex flex-col px-4 py-4 gap-2">
        <Suspense fallback={<SubjectDetailsGenericSkeleton />}>
          <SubjectDetailsGeneric subject={subject}/>
        </Suspense>
      </div>
    </PermissionGuard>
  )
}