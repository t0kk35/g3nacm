'use client'

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ArrowLeft, Save, Search, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { BulkPermissionManager } from "./BulkPermissionManager"
import { UserRole } from "@/app/api/data/user/user"
import { UserPermission } from "@/app/api/data/user/user"
import { UserRoleRequest } from "@/app/api/action/role/user-role"
import { UserRevokeEntityTable } from "../UserRevokeEntityTable"

// Update the Permission interface
type FormUserPermission =  {
  id: number
  group: string
  permission: string
  description: string
  selected?: boolean
}

type RoleFormProps = {
  iPermissions: UserPermission[];
  role?: UserRole;
}

export function RoleFormClient({ role, iPermissions }: RoleFormProps) {
  const router = useRouter()
  const [name, setName] = useState(role?.name || "")
  const [description, setDescription] = useState(role?.description || "")
  const [permissions, setPermissions] = useState<FormUserPermission[]>([])
  const [permissionGroups, setPermissionGroups] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [permissionSearch, setPermissionSearch] = useState("")
  const isEditing = !!role

  // Update the fetchPermissions function in useEffect
  useEffect(() => {
    const initPermissions = async () => {
      const permissions:FormUserPermission[] = iPermissions
      // If editing, mark selected permissions
      if (role?.permission_ids) {
        permissions.forEach((permission) => {
          permission.selected = role.permission_ids.includes(permission.id)
        })
      }
      setPermissions(permissions)

      // Extract unique permission groups
      const groups = Array.from(new Set(permissions.map((p) => p.group)))
      setPermissionGroups(groups)
    }

    initPermissions()
  }, [])

  // Filter permissions based on search query
  const filteredPermissions = useMemo(() => {
    if (!permissionSearch.trim()) return permissions

    return permissions.filter(
      (p) =>
        p.permission.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        p.description.toLowerCase().includes(permissionSearch.toLowerCase()),
    )
  }, [permissions, permissionSearch])

  // Get filtered permission groups (only show groups that have matching permissions)
  const filteredPermissionGroups = useMemo(() => {
    if (!permissionSearch.trim()) return permissionGroups

    const groupsWithMatchingPermissions = new Set(filteredPermissions.map((p) => p.group))

    return permissionGroups.filter((group) => groupsWithMatchingPermissions.has(group))
  }, [permissionGroups, filteredPermissions, permissionSearch])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const roleData: UserRoleRequest = {
        name: name,
        description: description,
        permission_ids: permissions.filter((p) => p.selected).map((p) => p.id),
      }
      // Create or update role
      const url = isEditing ? `/api/action/role/${role.id}` : "/api/action/role"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(roleData),
      })

      if (!response.ok) {
        throw new Error("Failed to save role")
      }
      toast.success(isEditing ? "Role updated successfully" : "Role created successfully")
      router.push("/admin/role")
      router.refresh()
    } catch (error) {
      console.error("Error saving role:", error)
      toast.error("Failed to save role. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const togglePermission = (id: number) => {
    setPermissions(
      permissions.map((permission) =>
        permission.id === id ? { ...permission, selected: !permission.selected } : permission,
      ),
    )
  }

  const togglePermissionGroup = (group: string, selected: boolean) => {
    setPermissions(
      permissions.map((permission) =>
        permission.group === group ? { ...permission, selected } : permission,
      ),
    )
  }

  const isGroupSelected = (group: string) => {
    const groupPermissions = permissions.filter((p) => p.group === group)
    return groupPermissions.length > 0 && groupPermissions.every((p) => p.selected)
  }

  const isGroupIndeterminate = (group: string) => {
    const groupPermissions = permissions.filter((p) => p.group === group)
    const selectedCount = groupPermissions.filter((p) => p.selected).length
    return selectedCount > 0 && selectedCount < groupPermissions.length
  }

  const handleUserRevoked = (userId: number) => {
    // console.log(`User ${userId} role revoked`)
    // Update your role form state here if needed
  }

  // Count selected permissions
  const selectedPermissionCount = permissions.filter((p) => p.selected).length

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Card className="pt-5">
          <CardContent>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/role")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Roles
            </Button>
          </CardContent>          
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Role Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter role name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Role Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for the role"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  Select permissions for this role
                  {selectedPermissionCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedPermissionCount} selected
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search permissions..."
                    className="pl-8"
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                  />
                </div>
        { /*        <BulkPermissionManager permissions={permissions} onPermissionsChange={setPermissions} /> */ }
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPermissionGroups.length > 0 ? (
              <Tabs defaultValue={filteredPermissionGroups[0]}>
                <TabsList className="mb-4 flex flex-wrap h-auto">
                  {filteredPermissionGroups.map((group) => (
                    <TabsTrigger key={group} value={group} className="h-8 text-xs">
                      {group}
                      {isGroupSelected(group) && <Check className="ml-1 h-3 w-3" />}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {filteredPermissionGroups.map((group) => (
                  <TabsContent key={group} value={group} className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id={`group-${group}`}
                        checked={isGroupSelected(group)}
                        onCheckedChange={(checked) => togglePermissionGroup(group, !!checked)}
                        data-indeterminate={isGroupIndeterminate(group)}
                        className={
                          isGroupIndeterminate(group)
                            ? "data-[indeterminate=true]:bg-primary data-[indeterminate=true]:opacity-50"
                            : ""
                        }
                      />
                      <Label htmlFor={`group-${group}`} className="font-semibold">
                        Select All {group} Permissions
                      </Label>
                    </div>

                    <div className="space-y-1">
                      {filteredPermissions
                        .filter((p) => p.group === group)
                        .map((permission) => (
                          <div key={permission.id} className="flex items-start py-1 hover:bg-muted/50 px-1 rounded">
                            <Checkbox
                              id={`permission-${permission.id}`}
                              checked={permission.selected}
                              onCheckedChange={() => togglePermission(permission.id)}
                              className="mt-0.5"
                            />
                            <div className="ml-2 space-y-0.5">
                              <Label htmlFor={`permission-${permission.id}`} className="font-medium text-sm">
                                {permission.permission}
                              </Label>
                              <p className="text-xs text-muted-foreground">{permission.description}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-muted-foreground">
                {permissionSearch ? "No permissions match your search." : "No permissions available."}
              </p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={saving} className="ml-auto">
              {saving && (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "Update Role" : "Create Role"}
            </Button>
          </CardFooter>
        </Card>
        { role &&
          <UserRevokeEntityTable 
            entityId={role.id}
            entityName={role.name}
            userIds={role.user_ids}
            onUserRevoked={handleUserRevoked}
            actionEndpoint="/api/action/user/revoke"
            requestBuilder={(userIds, enityId) => { 
              return {
                user_ids: userIds,
                role_id: enityId
              }}
            }
            entityLabel="Role"
          />
        }
      </div>
    </form>
  )
}