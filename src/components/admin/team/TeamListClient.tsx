'use client'

import { useState, useMemo } from "react"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; 
import { DeleteDialog } from "../DeleteDiaglog"
import { SearchAndActionsHeader } from "../SearchAndActionHeader"
import { SearchNoMatch } from "../SearchNoMatch"
import { EditDeleteCardFooter } from "../EditDeleteCardFooter"
import { EditDeleteTableCell } from "../EditDeleteTableCell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { UserTeam } from "@/app/api/data/user/user"
import { toast } from "sonner";
import { ApiError } from "next/dist/server/api-utils";

type Props = { teams : UserTeam[]}

export function TeamListClient({ teams }: Props) {
  const [teamToDelete, setTeamToDelete] = useState<UserTeam | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [deletedTeamIds, setDeletedTeamIds] = useState<number[]>([])

  const filteredTeams = useMemo(()=>{
    if (!searchQuery.trim() && deletedTeamIds.length === 0) return teams
    return teams.filter(t=> 
      (
        t.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
        t.description.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) 
      ) && !deletedTeamIds.includes(t.id)
    )
  }, [searchQuery, deletedTeamIds])

  const handleDeleteTeam = async (roleId: number) => {
    try {
      const response = await fetch(`/api/action/user/team/${roleId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Team deleted successfully");
        setDeletedTeamIds([...deletedTeamIds, roleId]);
      } else {
        const err:ApiError = await response.json();
        toast.error(`Failed to delete team. Message ${err.message}`); 
      }
      setTeamToDelete(null);
    } catch (error) {
      console.error("Failed to delete team:", error);
    }
  }

  return (
    <div className="space-y-4">
      <SearchAndActionsHeader  
        searchPlaceholder="Search teams..."
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        newButtonLabel="New Team"
        newButtonHref="/admin/team/new" 
      />

      {filteredTeams.length === 0 ? (
        <SearchNoMatch 
          searchQuery={searchQuery}
          noMatchMessage="No teams found matching your search"
          notFoundMessage="No teams found"
          newButtonLabel="Create your first team"
          newButtonHref="/admin/team/new"
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTeams.map((team) => (
            <Card key={team.id} className="flex flex-col overflow-hidden">
              <CardHeader className="flex-1">
                <CardTitle className="text-base">{team.name}</CardTitle>
                <CardDescription className="flex flex-col text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground line-clamp-2 cursor-help">
                          {team.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="max-w-xs text-sm">{team.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>                
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-mono text-chart-1">
                <span>({team.user_ids.length}) user{team.user_ids.length !== 1 ? "s" : ""}</span>
              </CardContent>
              <EditDeleteCardFooter 
                editHref={`/admin/team/edit/${team.id}`} 
                onDelete={() => setTeamToDelete(team)} 
                deleteDisabled={team.user_ids.length > 0}
                deleteDisabledMessage="Team can not be deleted, it has active users"
              />
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>{team.description}</TableCell>
                  <EditDeleteTableCell editHref={`/admin/team/edit/${team.id}`} onDelete={() => setTeamToDelete(team)} />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteDialog
        message={`Are you sure you want to delete the team "${teamToDelete?.name}"? This action cannot be undone.`}
        open={teamToDelete !== null}
        onOpenChange={() => setTeamToDelete(null)}
        onConfirm={() => teamToDelete && handleDeleteTeam(teamToDelete.id)}
      />
    </div>
  )
}