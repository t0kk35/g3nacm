'use server'

import { authorizedFetch } from "@/lib/org-filtering"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamFormClient } from "./TeamFormClient";
import { UserTeam } from "@/app/api/data/user/user";

type Props = {
    teamId?: number;
}

export async function TeamForm({ teamId } : Props) {

    const team = teamId ? await authorizedFetch(`${process.env.DATA_URL}/api/data/user/team?team_id=${teamId}`)
        .then(res => {
            if (!res.ok) throw new Error(`Error looking for team with id ${teamId}`);
            return res.json();
        })
        .then(j => j as UserTeam[])
        .then(ut => { 
            if (ut.length === 0) throw new Error(`Team with id ${teamId} not found`)
            else return ut[0]
        }) : undefined

    return (
        <TeamFormClient team={team} />
    )

}

export async function TeamFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
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