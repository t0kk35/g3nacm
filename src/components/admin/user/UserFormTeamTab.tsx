'use client'

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { FormUserTeams } from "./UserFormCient"

type Props = {
    teams: FormUserTeams[];
    toggleTeam: (id: number) => void;
	updateTeamRank: (id: number, rank: number) => void;
}

export function UserFormTeamTab({ teams, toggleTeam, updateTeamRank }: Props) {
    
    const [teamSearch, setTeamSearch] = useState("");    

    // Filter roles based on search query
    const filteredTeams = useMemo(() => {
        if (!teamSearch.trim()) return teams

        return teams.filter(
            (t) => 
                t.name.toLowerCase().includes(teamSearch.toLowerCase()) ||
                t.description.toLocaleLowerCase().includes(teamSearch.toLocaleLowerCase())
        )
    }, [teams, teamSearch])
    
    // Count selected teams
    const selectedTeamCount = teams.filter((t) => t.selected).length

    return (
		<>
		    <CardHeader className="pb-3">
        		<div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          			<div>
            			<CardTitle>Teams</CardTitle>
            			<CardDescription className="flex items-center gap-2">
              				Select teams for this user and set their rank
              				{selectedTeamCount > 0 && (
                			<Badge variant="secondary" className="ml-2">
                  				{selectedTeamCount} selected
                			</Badge>
              				)}
            			</CardDescription>
          			</div>
          			<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            			<div className="relative w-full sm:w-64">
              				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              					<Input
                					placeholder="Search teams..."
                					className="pl-8"
                					value={teamSearch}
                					onChange={(e) => setTeamSearch(e.target.value)}
              				/>
            			</div>
          			</div>
        		</div>
      		</CardHeader>
      		<CardContent>
        		{filteredTeams.length > 0 ? (
          			<div className="space-y-4">
            			{/* Selected teams section */}
            			{filteredTeams.some((team) => team.selected) && (
              				<div className="space-y-1">
                				<div className="text-sm font-medium text-chart-1 mb-2">Selected Teams (by rank)</div>
                					{filteredTeams
                  						.filter((team) => team.selected)
                  						.sort((a, b) => (a.rank || 999) - (b.rank || 999))
                  						.map((team) => (
                    						<div
                      							key={team.id}
                      							className="flex items-start py-2 bg-chart-1/5 hover:bg-chart-1/10 px-2 rounded border-l-2 border-chart-1"
                    						>
                      							<Checkbox
                        							id={`team-${team.id}`}
                        							checked={team.selected}
                        							onCheckedChange={() => toggleTeam(team.id)}
                        							className="mt-0.5"
                      							/>
                      							<div className="ml-2 flex-1 space-y-0.5">
                        							<div className="flex items-center justify-between">
                          								<Label htmlFor={`team-${team.id}`} className="font-medium text-sm">
                            								{team.name}
                          								</Label>
                          								<div className="flex items-center gap-2">
                            								<Label htmlFor={`rank-${team.id}`} className="text-xs text-muted-foreground">
                              									Rank:
                            								</Label>
                            								<Input
                              									id={`rank-${team.id}`}
                              									type="number"
                              									min="1"
                              									value={team.rank || 1}
                              									onChange={(e) => updateTeamRank(team.id, Number.parseInt(e.target.value) || 1)}
                              									className="w-16 h-7 text-xs"
                            								/>
                          								</div>
                        							</div>
                        							<p className="text-xs text-muted-foreground">{team.description}</p>
                      							</div>
                    						</div>
                  						))}
              				</div>
            			)}

            			{/* Available teams section */}
            			{filteredTeams.some((team) => !team.selected) && (
              				<div className="space-y-1">
                				{filteredTeams.some((team) => team.selected) && (
                  					<div className="text-sm font-medium text-muted-foreground mb-2">Available Teams</div>
                				)}
                				{filteredTeams
                  					.filter((team) => !team.selected)
                  					.map((team) => (
                    				<div key={team.id} className="flex items-start py-2 hover:bg-muted/50 px-1 rounded">
                      					<Checkbox
                        					id={`team-${team.id}`}
                        					checked={team.selected}
                        					onCheckedChange={() => toggleTeam(team.id)}
                        					className="mt-0.5"
                      					/>
                      					<div className="ml-2 flex-1 space-y-0.5">
                        					<div className="flex items-center justify-between">
                          						<Label htmlFor={`team-${team.id}`} className="font-medium text-sm">
                            						{team.name}
                          						</Label>
                        					</div>
                        					<p className="text-xs text-muted-foreground">{team.description}</p>
                      					</div>
                    				</div>
                  				))}
              				</div>
            			)}
          			</div>
        		) : (
          			<p className="text-muted-foreground">{teamSearch ? "No teams match your search." : "No teams available."}</p>
        		)}
      		</CardContent>
        </>
    )
}