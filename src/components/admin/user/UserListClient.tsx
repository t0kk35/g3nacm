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
import { useTranslations } from 'next-intl'

type Props = { users : UserAdmin[]}

export function UserListClient({ users }: Props) {

  const t = useTranslations('Admin.User')
  const tc = useTranslations('Common')

  const [userToDelete, setUserToDelete] = useState<UserAdmin | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [deletedUserIds, setDeletedUserIds] = useState<number[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  const filteredUsers = useMemo(()=>{
    if (!searchQuery.trim() && deletedUserIds.length === 0) return users
    return users.filter(u => 
      (
        u.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
        u.first_name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
        u.last_name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
      ) && !deletedUserIds.includes(u.id)
    )
  }, [searchQuery, deletedUserIds])  

  const handleDeleteUser = async (userId: number) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/action/user/${userId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t('toastDeleteSuccess'));
        setDeletedUserIds([...deletedUserIds, userId])
      } else {
        const err:ApiError = await response.json();
        toast.error(t('toastDeleteFailed', {message: err.message})); 
      }
      setUserToDelete(null);       
    } catch (error) {
      console.error("Failed to delete user:", error);
    }
  }

  return (
    <div className="space-y-4">
      <SearchAndActionsHeader
        searchPlaceholder={t('searchPlaceholder')}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        newButtonLabel={t('newButtonLabel')}
        newButtonHref="/admin/user/new"
      />

      {filteredUsers.length === 0 ? (
        <SearchNoMatch 
          searchQuery={searchQuery}
          noMatchMessage={t('emptyNoMatch')}
          notFoundMessage={t('emptyNotFound')}
          newButtonLabel={t('emptyCreateFirst')}
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
                <TableHead>{t('tableHeaderRoleName')}</TableHead>
                <TableHead>{t('tableHeaderFirstLastName')}</TableHead>
                <TableHead className="w-45">{t('tableHeaderActions')}</TableHead>
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
        title={t('deleteDialogTitle')}
        message={t('deleteDialogTitle',{name: userToDelete?.name || tc('unknown')})}
        open={userToDelete !== null}
        onOpenChange={() => setUserToDelete(null)}
        onConfirm={() => userToDelete && handleDeleteUser(userToDelete.id)}
      />
    </div>
  )
}