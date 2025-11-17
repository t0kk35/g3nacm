"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { User } from "@/app/api/data/user/user"

type UserRevokeEntityTableProps = {
  entityId: number
  entityName: string // e.g., "Admin", "Team A"
  userIds: number[]
  onUserRevoked?: (userId: number) => void
  actionEndpoint: string // e.g., "/api/action/user/revoke-role"
  requestBuilder: (userIds: number[], entityId: number) => any
  entityLabel?: string // e.g., "Role" or "Team"
}

export function UserRevokeEntityTable({
  entityId,
  entityName,
  userIds,
  onUserRevoked,
  actionEndpoint,
  requestBuilder,
  entityLabel = "Role"
}: UserRevokeEntityTableProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [revoking, setRevoking] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])
  const [bulkRevoking, setBulkRevoking] = useState(false)
  const usersPerPage = 10

  const startIndex = (currentPage - 1) * usersPerPage
  const endIndex = startIndex + usersPerPage
  const paginatedUsers = users.slice(startIndex, endIndex)

  useEffect(() => {
    const fetchUsers = async () => {
      if (userIds.length === 0) {
        setUsers([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const queryString = userIds.map(id => `user_ids=${id}`).join('&')
        const response = await fetch(`/api/data/user/user?${queryString}`)
        if (!response.ok) throw new Error("Failed to fetch users")
        const userData: User[] = await response.json()
        setUsers(userData)
        setTotalPages(Math.ceil(userData.length / usersPerPage))
      } catch (error) {
        toast.error("Failed to load user details")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [userIds, toast])

  const handleSelectUser = (userId: number, checked: boolean) => {
    setSelectedUsers(prev =>
      checked ? [...prev, userId] : prev.filter(id => id !== userId)
    )
  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedUsers(checked ? paginatedUsers.map(u => u.id) : [])
  }

  const revokeUsers = async (ids: number[]) => {
    const body = requestBuilder(ids, entityId)

    const response = await fetch(actionEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })

    if (!response.ok) throw new Error("Failed to revoke access")

    // Update UI
    setUsers(prev => prev.filter(user => !ids.includes(user.id)))
    const newTotalPages = Math.ceil((users.length - ids.length) / usersPerPage)
    setTotalPages(newTotalPages)
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages)
    }
    onUserRevoked && ids.forEach(onUserRevoked)
  }

  const handleBulkRevoke = async () => {
    try {
      setBulkRevoking(true)
      await revokeUsers(selectedUsers)
      setSelectedUsers([])
      toast.success(`Successfully revoked ${entityLabel.toLowerCase()} from ${selectedUsers.length} user(s)`)
    } catch (error) {
      toast.error(`Failed to revoke ${entityLabel.toLowerCase()}`)
    } finally {
      setBulkRevoking(false)
    }
  }

  const handleSingleRevoke = async (userId: number, userName: string) => {
    try {
      setRevoking(userId)
      await revokeUsers([userId])
      toast.success(`Revoked ${entityLabel.toLowerCase()} from ${userName}`)
    } catch {
      toast.error(`Failed to revoke ${entityLabel.toLowerCase()}`)
    } finally {
      setRevoking(null)
    }
  }

  useEffect(() => {
    setSelectedUsers([])
  }, [currentPage])

  if (loading) return <Skeleton className="h-[300px] w-full" />

  if (users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users with {entityLabel} "{entityName}"</CardTitle>
          <CardDescription>No users currently have this {entityLabel.toLowerCase()}</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8 font-semibold text-muted-foreground">No users to display</CardContent>
      </Card>
    )
  }

  const isAllSelected = paginatedUsers.every(u => selectedUsers.includes(u.id))
  const isIndeterminate = selectedUsers.length > 0 && !isAllSelected
  const checkboxState = isAllSelected ? true : isIndeterminate ? "indeterminate" : false

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Users with '{entityName}' {entityLabel}</CardTitle>
            <CardDescription>{users.length} total users</CardDescription>
          </div>
          {selectedUsers.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={bulkRevoking}>
                  {bulkRevoking ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Revoke from {selectedUsers.length} user(s)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revoke {entityLabel}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to revoke the "{entityName}" {entityLabel.toLowerCase()} from{" "}
                    {selectedUsers.length} user{selectedUsers.length !== 1 && "s"}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkRevoke}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Revoke
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={checkboxState}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>User</TableHead>
                <TableHead>First/Last Name</TableHead>
                <TableHead>Deleted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id} className={selectedUsers.includes(user.id) ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.firstName} {user.lastName}</TableCell>
                  <TableCell>
                    <Badge className={user.deleted ? "bg-chart-1" : ""}>{user.deleted ? "Y" : "N"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={revoking === user.id || bulkRevoking}
                          className="text-destructive hover:text-destructive"
                        >
                          {revoking === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="ml-2">Revoke</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke {entityLabel}</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke {entityLabel.toLowerCase()} from {user.name}?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleSingleRevoke(user.id, user.name)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1} to {Math.min(endIndex, users.length)} of {users.length} users
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
