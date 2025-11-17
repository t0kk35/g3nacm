'use client'

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { FormUserRoles } from "./UserFormCient"

type Props = {
    roles: FormUserRoles[]; 
    toggleRole: (id: number) => void
}

export function UserFormRoleTab({ roles, toggleRole }: Props) {

    const [roleSearch, setRoleSearch] = useState("");    

    // Filter roles based on search query
    const filteredRoles = useMemo(() => {
        if (!roleSearch.trim()) return roles

        return roles.filter(
            (r) => 
                r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
                r.description.toLocaleLowerCase().includes(roleSearch.toLocaleLowerCase())
        )
    }, [roles, roleSearch])

    // Count selected roles
    const selectedRoleCount = roles.filter((r) => r.selected).length

    return (
		<>
			<CardHeader className="pb-3">
				<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
					<div>
						<CardTitle>Roles</CardTitle>
						<CardDescription className="flex items-center gap-2">
							Select roles for this user
							{selectedRoleCount > 0 && (
								<Badge variant="secondary" className="ml-2">
									{selectedRoleCount} selected
								</Badge>
							)}
						</CardDescription>
					</div>
					<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
						<div className="relative w-full sm:w-64">
							<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search roles..."
								className="pl-8"
								value={roleSearch}
								onChange={(e) => setRoleSearch(e.target.value)}
							/>
						</div>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				{filteredRoles.length > 0 ? ( 
					<div className="space-y-1">
						{filteredRoles
							.map((role) => (
								<div key={role.id} className="flex items-start py-1 hover:bg-muted/50 px-1 rounded">
									<Checkbox
										id={`role-${role.id}`}
										checked={role.selected}
										onCheckedChange={() => toggleRole(role.id)}
										className="mt-0.5"
									/>
									<div className="ml-2 space-y-0.5">
										<Label htmlFor={`role-${role.id}`} className="font-medium text-sm">
											{role.name}
										</Label>
										<p className="text-xs text-muted-foreground">{role.description}</p>
									</div>
								</div>
						))}
					</div>
				) : (
					<p className="text-muted-foreground"> 
						{roleSearch ? "No roles match your search." : "No roles available."}
					</p>
				)}
			</CardContent>
		</>
    )
}