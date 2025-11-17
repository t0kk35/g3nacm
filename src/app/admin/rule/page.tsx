'use server'

import { auth } from "@/auth"
import { Suspense } from "react"
import { Settings } from "lucide-react"
import { TeamAssignmentRules, TeamAssignmentRulesSkeleton } from "@/components/admin/rule/TeamAssignmentRules"

export default async function AdminRules() {
  
  // Get user details for the permission guard
  const session = await auth()
  const user = session?.user

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Assignment Rules</h1>
          <p className="text-muted-foreground mt-2">
            Configure rules to automatically assign alerts and cases to teams
          </p>
        </div>
        <Settings className="h-8 w-8 text-muted-foreground" />
      </div>
      <Suspense fallback={<TeamAssignmentRulesSkeleton />}>
          <TeamAssignmentRules />
      </Suspense>
    </div>
  )
}