'use client'

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ArrowLeft, Save, KeyRound } from "lucide-react"
import { UserAdmin } from "@/app/api/data/user/user"
import { UserRole } from "@/app/api/data/user/user"
import { UserTeam } from "@/app/api/data/user/user"
import { OrgUnitNode } from "@/app/api/data/org_unit/org_unit"
import { UserRequest } from "@/app/api/action/user/user/types"
import { UserFormRoleTab } from "./UserFormRoleTab"
import { UserFormTeamTab } from "./UserFormTeamTab"
import { UserFormOrgTab } from "./UserFormOrgTab"
import { ChangePasswordModal } from "../ChangePasswordModal"
import { useValidationForm, FormFieldInput } from "@/components/ui/custom/form-field"
import { clientFetch } from "@/lib/client-api-connection"

// Update the Permission interface
export type FormUserRoles =  {
	id: number
  	name: string
  	description: string;
  	selected?: boolean
}

export type FormUserTeams = {
	id: number;
	name: string;
	description: string;
	rank?: number;
	selected?: boolean
}

export type FormUserOrgs = {
	id: number;
	name: string;
	selected?:boolean
}

type UserFormProps = {
  iRoles: UserRole[];
  iTeams: UserTeam[];
  iOrgs: OrgUnitNode[];
  user?: UserAdmin;
}

export function UserFormClient({ user, iRoles, iTeams, iOrgs }: UserFormProps) {
  const router = useRouter()
  const [roles, setRoles] = useState<FormUserRoles[]>([]);
  const [teams, setTeams] = useState<FormUserTeams[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const isEditing = !!user;

  const form = useValidationForm(
    {
      name: user?.name || "",
      firstName: user?.first_name || "",
      lastName: user?.last_name || ""
    },
    {
      name: (v) => v.trim() ? undefined : "User name is required",
      firstName: (v) => v.trim() ? undefined : "User first name is required",
      lastName: (v) => v.trim() ? undefined : "User last name is required",
    }
  )

	useEffect(() => {
		const initRoles = async () => {
			const roles:FormUserRoles[] = iRoles
			// If editing, mark selected roles
			if (user?.role_ids) {
				roles.forEach((role) => {
					role.selected = user.role_ids.includes(role.id)
				})
			}
			setRoles(roles);
		}
		const initTeams = async () => {
			const teams:FormUserTeams[] = iTeams
			// If editing, mark selected teams
			if (user?.team_infos) {
				teams.forEach((team) => {
					const ft = user.team_infos.find(t=>t.team_id === team.id);
					if (ft) {
						team.selected = true
						team.rank = ft.team_rank
					}
				})
			}
			setTeams(teams);
		}
		const initOrgs = async () => {
			// If editing, mart the selected orgs
			if (user?.org_ids) {
				setSelectedOrgIds(user.org_ids)
				console.log('user_ids ' + user?.org_ids)
				console.log('selected_ids ' + selectedOrgIds)
			}
		}
		initRoles();
		initTeams();
		initOrgs();
	}, [])
	
	const handleSubmit = async () => {
		setSaving(true)

		try {
			const userData: UserRequest = {
				name: form.values.name,
				first_name: form.values.firstName,
				last_name: form.values.lastName,
				role_ids: roles.filter((r) => r.selected).map((r) => r.id),
				team_infos: teams.filter((t) => t.selected).map((t) => ({team_id: t.id, team_rank: t.rank || -1})),
				org_unit_ids: selectedOrgIds.filter((o) => o !== null)
			}
			// Create or update user
			const url = isEditing ? `/api/action/user/user/${user.id}` : "/api/action/user/user"
			const method = isEditing ? "PUT" : "POST"

      await clientFetch(url, method, userData, 'Failed to save User');

			toast.success(isEditing ? "User updated successfully" : "User created successfully");
			router.push("/admin/user");
			router.refresh();
		} catch (error) {
			console.error("Error saving user:", error)
			toast.error("Failed to save user. Please try again.")
		} finally {
			setSaving(false)
		}
	}

	const toggleRole = (id: number) => {
    setRoles(roles.map((role) => role.id === id ? { ...role, selected: !role.selected } : role))
  }
	
	const toggleOrg = (id: number) => {
		if (selectedOrgIds.indexOf(id) === -1) setSelectedOrgIds([...selectedOrgIds, id])
		else setSelectedOrgIds(selectedOrgIds.filter(sid=>sid !== id))
	}

  const toggleTeam = (id: number) => {
    setTeams(
      teams.map((team) => {
        if (team.id === id) {
          // If selecting a team for the first time, initialize rank to 1
          return {
            ...team,
            selected: !team.selected,
            rank: !team.selected ? 1 : team.rank,
          }
        }
        return team
      }),
    )
  }	

  const updateTeamRank = (id: number, rank: number) => {
    // Ensure rank is at least 1
    const validRank = Math.max(1, rank)
    setTeams(teams.map((team) => (team.id === id ? { ...team, rank: validRank } : team)))
  }

	return (
		<form onSubmit={form.handleSubmit(handleSubmit)}>
			<div className="space-y-2">
				<Card className="pt-5">
					<CardContent>
						<div className="flex justify-between">
							<Button type="button" variant="outline" onClick={() => router.push("/admin/user")}>
							<ArrowLeft className="mr-2 h-4 w-4" />
								Back to Users
							</Button>
							{ /* Only show if not editing, the user only exists if in editing mode */ } 
							{ (isEditing) && (
								<>
									<Button type="button" variant="default"  onClick={() => setIsPasswordModalOpen(true)}>
										<KeyRound className="mr-2 h-4 w-4" />
										Change Password
									</Button>
									<ChangePasswordModal
										open={isPasswordModalOpen}
										onOpenChange={setIsPasswordModalOpen}
										userName={user!.name}
									/>
								</>)  
							}
						</div>
					</CardContent>          
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>User Details</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
              <FormFieldInput 
                id="name"
                label="User Name"
                value={form.values.name}
                onChange={(v) => form.setField("name", v)}
                error={form.errors.name}
                disabled={isEditing}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <FormFieldInput 
                  id="firstName"
                  label="First Name"
                  value={form.values.firstName}
                  onChange={(v) => form.setField("firstName", v)}
                  error={form.errors.firstName}
                  required
                />
                <FormFieldInput 
                  id="lastName"
                  label="Last Name"
                  value={form.values.lastName}
                  onChange={(v) => form.setField("lastName", v)}
                  error={form.errors.lastName}
                  required
                />
							</div>
						</div>
					</CardContent>
				</Card>
				<Card className="p-4">
					<Tabs defaultValue="roles">
						<TabsList>
							<TabsTrigger value="roles">Roles</TabsTrigger>
							<TabsTrigger value="teams">Teams</TabsTrigger>
							<TabsTrigger value="orgs">Org Units</TabsTrigger>
						</TabsList>
						<TabsContent value="roles">
							<UserFormRoleTab roles={roles} toggleRole={toggleRole} />
						</TabsContent>
						<TabsContent value="teams">
							<UserFormTeamTab teams={teams} toggleTeam={toggleTeam} updateTeamRank={updateTeamRank} />
						</TabsContent>
						<TabsContent value="orgs">
							<UserFormOrgTab orgs={iOrgs} selectedIds={selectedOrgIds} toggleOrg={toggleOrg}/>
						</TabsContent>
					</Tabs>
		  			<CardFooter>
						<Button type="submit" disabled={saving} className="ml-auto">
			  				{saving && (
							<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
			  				)}
			  				<Save className="mr-2 h-4 w-4" />
			  				{isEditing ? "Update User" : "Create User"}
						</Button>
		  			</CardFooter>					
				</Card>
			</div>
		</form>			
	)
}