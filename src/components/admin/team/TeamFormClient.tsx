'use client'

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Save } from "lucide-react"
import { UserTeam } from "@/app/api/data/user/user"
import { UserTeamRequest } from "@/app/api/action/team/user-team"
import { UserRevokeEntityTable } from "../UserRevokeEntityTable"
import { useValidationForm, FormFieldInput } from "@/components/ui/custom/form-field"
import { clientFetch } from "@/lib/client-api-connection"

type TeamFormProps = {
  team?: UserTeam;
}

export function TeamFormClient({ team }: TeamFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const isEditing = !!team

  const form = useValidationForm(
    {
      name: team?.name || "",
      description: team?.description || ""
    },
    {
      name: (v) => v.trim() ? undefined : "Team name is required",
      description: (v) => v.trim() ? undefined : "Team Description is required",
    }
  )

  const handleSubmit = async () => {
    setSaving(true)

    try {
      const teamData: UserTeamRequest = {
        name: form.values.name,
        description: form.values.description
      }
      // Create or update role
      const url = isEditing ? `/api/action/team/${team.id}` : "/api/action/team"
      const method = isEditing ? "PUT" : "POST"
      
      await clientFetch(url, method, teamData, 'Failed to save team' )

      toast.success(isEditing ? "Team updated successfully" : "Team created successfully",)
      router.push("/admin/team")
      router.refresh()
    } catch (error) {
      console.error("Error saving team:", error)
      toast.error(`Failed to save team. Error: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const handleUserRevoked = (userId: number) => {
    //console.log(`User ${userId} role revoked`)
    // Update your role form state here if needed
  }  

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="space-y-2">
        <Card className="pt-5">
          <CardContent>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/team")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teams
            </Button>
          </CardContent>          
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormFieldInput
                id="name"
                label="Team Name"
                value={form.values.name}
                onChange={(v) => form.setField("name", v)}
                placeholder="Enter team name"
                error={form.errors.name}
                required
              />
              <FormFieldInput 
                id="description"
                label="Team Description"
                value={form.values.description}
                onChange={(v) => form.setField("description", v)}
                placeholder="Enter Team Decription"
                error={form.errors.description}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving} className="ml-auto">
              {saving && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "Update Team" : "Create Team"}
            </Button>
          </CardFooter>
        </Card>
        { team &&
          <UserRevokeEntityTable 
            entityId={team.id}
            entityName={team.name}
            userIds={team.user_ids}
            onUserRevoked={handleUserRevoked}
            actionEndpoint="/api/action/user/revoke"
            requestBuilder={(userIds, enityId) => { 
              return {
                user_ids: userIds,
                team_id: enityId
              }}
            }
            entityLabel="Team"
          />}
      </div>
    </form>
  )
}