'use server'

import { authorizedFetch } from "@/lib/org-filtering";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAdmin, UserTeam } from "@/app/api/data/user/user";
import { UserRole } from "@/app/api/data/user/user";
import { UserFormClient } from "./UserFormCient";
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit";

type Props = {
    userId?: number;
}

export async function UserForm({ userId } : Props) {

    const user = userId ? await authorizedFetch(`${process.env.DATA_URL}/api/data/user/user_admin?user_id=${userId}`)
        .then(res => {
            if (!res.ok) throw new Error(`User with id ${userId} not found`);
            return res.json();
        })
        .then(j => j as UserAdmin[])
        .then(u => { 
            if (u.length === 0) throw new Error(`User with id ${userId} not found`);
            else return u[0];
        }) : undefined

    const roles = authorizedFetch(`${process.env.DATA_URL}/api/data/user/role`)
        .then(res => {
          if (!res.ok) throw new Error(`Could not fetch roles list`);
          return res.json();
        })
        .then(j => j as UserRole[])
    
    const teams = authorizedFetch(`${process.env.DATA_URL}/api/data/user/team`)
        .then(res => {
          if (!res.ok) throw new Error(`Could not fetch teams list`);
          return res.json();
        })
        .then(j => j as UserTeam[]);

	  const orgHierarchy = authorizedFetch(`${process.env.DATA_URL}/api/data/org_unit/hierarchy`)
	      .then(res => {
          if (!res.ok) throw new Error(`Could not fetch orgs`);
          return res.json();
        })
        .then(j => j as OrgUnitNode[]);

    const data = await Promise.all([roles, teams, orgHierarchy]);

    return (
        <UserFormClient user={user} iRoles={data[0]} iTeams={data[1]} iOrgs={data[2]} />
    )

}

export async function UserFormSkeleton() {
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