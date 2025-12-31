'use client'

import { useState, useMemo } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteDialog } from "../DeleteDiaglog"
import { SearchAndActionsHeader } from "../SearchAndActionHeader"
import { SearchNoMatch } from "../SearchNoMatch"
import { EditDeleteCardFooter } from "../EditDeleteCardFooter"
import { EditDeleteTableCell } from "../EditDeleteTableCell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserAdmin } from "@/app/api/data/user/user"
import { toast } from "sonner"
import { ApiError } from "next/dist/server/api-utils"

type Props = { users : UserAdmin[]}

export function UserListClient({ users }: Props) {

  const [userToDelete, setUserToDelete] = useState<UserAdmin | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  const filteredUsers = useMemo(()=>{
    if (!searchQuery.trim()) return users
    return users.filter(u => 
      u.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
      u.first_name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
      u.last_name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
    )
  }, [searchQuery])  

  const handleDeleteUser = async (userId: number) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/action/user/user/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("User deleted successfully");
      } else {
        const err:ApiError = await response.json();
        toast.error(`Failed to delete user. Message ${err.message}`); 
      }
      setUserToDelete(null);       
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  return (
    <div className="space-y-4">
      <SearchAndActionsHeader
        searchPlaceholder="Search users..."
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        newButtonLabel="New User"
        newButtonHref="/admin/user/new"
      />

      {filteredUsers.length === 0 ? (
        <SearchNoMatch 
          searchQuery={searchQuery}
          noMatchMessage="No users found matching your search"
          notFoundMessage="No users found"
          newButtonLabel="Create your first user"
          newButtonHref="/admin/user/new"
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredUsers.map((user) => (
            <Card key={user.id} className="flex flex-col overflow-hidden">
              <CardHeader className="flex-1">
                <CardTitle className="text-base">{user.name}</CardTitle>
                <CardDescription className="text-xs">
                  <span>{user.first_name} {user.last_name}</span>
                </CardDescription>
              </CardHeader>
              <EditDeleteCardFooter 
                editHref={`/admin/user/edit/${user.id}`} 
                onDelete={() => setUserToDelete(user)}
                deleteDisabled={false}
                deleteDisabledMessage=""
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
                <TableHead>First and Last Name</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.first_name} {user.last_name}</TableCell>
                  <EditDeleteTableCell editHref={`/admin/user/edit/${user.id}`} onDelete={() => setUserToDelete(user)}/>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <DeleteDialog
        title="User Delete"
        message={`Are you sure you want to delete the user "${userToDelete?.name}"?`}
        open={userToDelete !== null}
        onOpenChange={() => setUserToDelete(null)}
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete.id)}
      />
    </div>
  )
}