'use client'

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { ArrowLeft, Save, Search, Check } from "lucide-react"
import { UserTeam } from "@/app/api/data/user/user"
import { UserTeamRequest } from "@/app/api/action/team/user-team"
import { UserRevokeEntityTable } from "../UserRevokeEntityTable"

type TeamFormProps = {
  team?: UserTeam;
}

export function TeamFormClient({ team }: TeamFormProps) {
  const router = useRouter()
  const [name, setName] = useState(team?.name || "")
  const [description, setDescription] = useState(team?.description || "")
  const [saving, setSaving] = useState(false)
  const isEditing = !!team

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const teamData: UserTeamRequest = {
        name: name,
        description: description
      }
      // Create or update role
      const url = isEditing ? `/api/action/user/team/${team.id}` : "/api/action/user/team"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(teamData),
      })

      if (!response.ok) {
        throw new Error("Failed to save team")
      }
      toast.success(isEditing ? "Team updated successfully" : "Team created successfully",)
      router.push("/admin/team")
      router.refresh()
    } catch (error) {
      console.error("Error saving team:", error)
      toast.error("Failed to save team. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleUserRevoked = (userId: number) => {
    //console.log(`User ${userId} role revoked`)
    // Update your role form state here if needed
  }  

  return (
    <form onSubmit={handleSubmit}>
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
          <CardHeader className="pb-3">
            <CardTitle>Team Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Team Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for the team"
                  required
                />
              </div>
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