'use server'

import { authorizedGetJSON } from "@/lib/org-filtering"
import { UserTeam } from "@/app/api/data/user/user"
import { EvalInputSchema } from "@/lib/eval-engine/types"
import { OrgUnit } from "@/app/api/data/org_unit/org_unit"
import { TeamAssignmentRulesClient } from "./TeamAssignmentRulesClient"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export async function TeamAssignmentRules() {

  const teams = authorizedGetJSON<UserTeam[]>(`${process.env.DATA_URL}/api/data/user/team`);
  const schemas = authorizedGetJSON<EvalInputSchema[]>(`${process.env.DATA_URL}/api/data/eval/schema`);
  const orgUnits = authorizedGetJSON<OrgUnit[]>(`${process.env.DATA_URL}/api/data/org_unit/org_unit`);
  
  const data = await Promise.all([teams, schemas, orgUnits]);

  return (
    <TeamAssignmentRulesClient teams={data[0]} schemas={data[1]} orgUnits={data[2]}/>
  )
}

export async function TeamAssignmentRulesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Skeleton className="h-6 w-48" />
        </CardTitle>
        <CardDescription>
          <Skeleton className="h-4 w-80 mt-2" />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input Schema Skeleton */}
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-4 w-24" /> {/* Label */}
            <Skeleton className="h-10 w-full rounded-md" /> {/* Select box */}
          </div>

          {/* Organizational Unit Skeleton */}
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-4 w-40" /> {/* Label */}
            <Skeleton className="h-10 w-full rounded-md" /> {/* Select box */}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}