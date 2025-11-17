'use client'

import { useState, useMemo } from "react"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DeleteDialog } from "../DeleteDiaglog"
import { SearchAndActionsHeader } from "../SearchAndActionHeader"
import { SearchNoMatch } from "../SearchNoMatch"
import { EditDeleteCardFooter } from "../EditDeleteCardFooter"
import { EditDeleteTableCell } from "../EditDeleteTableCell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { UserRole } from "@/app/api/data/user/user"
import { toast } from "sonner"
import { ApiError } from "next/dist/server/api-utils"

type Props = { roles : UserRole[]}

export function RoleListClient({ roles }: Props) {
  const [roleToDelete, setRoleToDelete] = useState<UserRole | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [deletedRoleIds, setDeletedRoleIds] = useState<number[]>([])

  const filteredRoles = useMemo(()=>{
    if (!searchQuery.trim() && deletedRoleIds.length === 0) return roles
    return roles.filter(r=> 
      (
        r.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
        r.description.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) 
      ) && !deletedRoleIds.includes(r.id)
    )
  }, [searchQuery, deletedRoleIds])

  const handleDeleteRole = async (roleId: number) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/action/user/role/${roleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Role deleted successfully");
        setDeletedRoleIds([...deletedRoleIds, roleId]);
      } else {
        const err:ApiError = await response.json();
        toast.error(`Failed to delete role. Message ${err.message}`);
      }
      setRoleToDelete(null);
    } catch (error) {
      console.error("Failed to delete role:", error);
    }
  }

  return (
    <div className="space-y-4">
      <SearchAndActionsHeader
        searchPlaceholder="Search roles..."
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        newButtonLabel="New Role"
        newButtonHref="/admin/role/new"
      />

      {filteredRoles.length === 0 ? (
        <SearchNoMatch 
          searchQuery={searchQuery}
          noMatchMessage="No roles found matching your search"
          notFoundMessage="No roles found"
          newButtonLabel="Create your first role"
          newButtonHref="/admin/role/new"
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRoles.map((role) => (
            <Card key={role.id} className="flex flex-col overflow-hidden">
              <CardHeader className="flex-1">
                <CardTitle className="text-base">{role.name}</CardTitle>
                <CardDescription className="flex flex-col text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {role.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="max-w-xs text-sm">{role.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>                                   
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-mono text-chart-1">
                <span>({role.user_ids.length}) user{role.user_ids.length !== 1 ? "s" : ""}</span>
              </CardContent>
              <EditDeleteCardFooter 
                editHref={`/admin/role/edit/${role.id}`}  
                onDelete={() => setRoleToDelete(role)}
                deleteDisabled={role.user_ids.length > 0}
                deleteDisabledMessage={"Can not delete role, it has active users"}
              />
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <EditDeleteTableCell editHref={`/admin/role/edit/${role.id}`} onDelete={() => setRoleToDelete(role)} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteDialog
        message={`Are you sure you want to delete the role "${roleToDelete?.name}"? This action cannot be undone.`}
        open={roleToDelete !== null}
        onOpenChange={() => setRoleToDelete(null)}
        onConfirm={() => roleToDelete && handleDeleteRole(roleToDelete.id)}
      />
    </div>
  )
}