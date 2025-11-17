"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Permission {
  id: number
  permission_group: string
  permission: string
  description: string
  selected?: boolean
}

interface BulkPermissionManagerProps {
  permissions: Permission[]
  onPermissionsChange: (permissions: Permission[]) => void
}

export function BulkPermissionManager({ permissions, onPermissionsChange }: BulkPermissionManagerProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<string>("all")

  // Get unique permission groups
  const permissionGroups = Array.from(new Set(permissions.map((p) => p.permission_group)))

  // Filter permissions based on search and active tab
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      permission.permission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab = activeTab === "all" || permission.permission_group === activeTab

    return matchesSearch && matchesTab
  })

  // Count selected permissions
  const selectedCount = permissions.filter((p) => p.selected).length

  // Toggle all filtered permissions
  const toggleAllFiltered = (selected: boolean) => {
    const updatedPermissions = [...permissions]

    // Get IDs of filtered permissions
    const filteredIds = new Set(filteredPermissions.map((p) => p.id))

    // Update only filtered permissions
    updatedPermissions.forEach((permission) => {
      if (filteredIds.has(permission.id)) {
        permission.selected = selected
      }
    })

    onPermissionsChange(updatedPermissions)
  }

  // Toggle a single permission
  const togglePermission = (id: number) => {
    const updatedPermissions = permissions.map((permission) =>
      permission.id === id ? { ...permission, selected: !permission.selected } : permission,
    )
    onPermissionsChange(updatedPermissions)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Bulk Manage
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Manage Permissions</DialogTitle>
          <DialogDescription>Search, filter, and select multiple permissions at once.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search permissions..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleAllFiltered(true)} className="whitespace-nowrap">
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleAllFiltered(false)}
                className="whitespace-nowrap"
              >
                Deselect All
              </Button>
            </div>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all" className="h-8 text-xs">
                All
              </TabsTrigger>
              {permissionGroups.map((group) => (
                <TabsTrigger key={group} value={group} className="h-8 text-xs">
                  {group}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="border rounded-md mt-4 p-4 max-h-[400px] overflow-y-auto">
              {filteredPermissions.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No permissions match your criteria</p>
              ) : (
                <div className="space-y-1">
                  {filteredPermissions.map((permission) => (
                    <div key={permission.id} className="flex items-start py-1 hover:bg-muted/50 px-1 rounded">
                      <Checkbox
                        id={`bulk-permission-${permission.id}`}
                        checked={permission.selected}
                        onCheckedChange={() => togglePermission(permission.id)}
                        className="mt-0.5"
                      />
                      <div className="ml-2 space-y-0.5">
                        <Label htmlFor={`bulk-permission-${permission.id}`} className="font-medium text-sm">
                          {permission.permission}
                          <span className="ml-2 text-xs text-muted-foreground">({permission.permission_group})</span>
                        </Label>
                        <p className="text-xs text-muted-foreground">{permission.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
