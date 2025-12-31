'use client'

import { useState, useMemo } from "react"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DeleteDialog } from "../../DeleteDiaglog"
import { SearchAndActionsHeader } from "../../SearchAndActionHeader"
import { SearchNoMatch } from "../../SearchNoMatch"
import { EditDeleteCardFooter } from "../../EditDeleteCardFooter"
import { EditDeleteTableCell } from "../../EditDeleteTableCell"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { ApiError } from "next/dist/server/api-utils"
import { AgentConfigAdmin } from "@/app/api/data/agent/types"

type Props = { agentConfigs : AgentConfigAdmin[]}

export function AgentConfigListClient({ agentConfigs }: Props) { 

	const [agentToDelete, setAgentToDelete] = useState<AgentConfigAdmin | null>(null)
	const [searchQuery, setSearchQuery] = useState("")
	const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
	const [deletedConfigCodes, setDeletedConfigCodes] = useState<string[]>([])

	const filteredAgentConfigs = useMemo(()=>{
		if (!searchQuery.trim() && deletedConfigCodes.length === 0) return agentConfigs
		return agentConfigs.filter(c=> 
			(
				c.code.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
				c.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
				c.description.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase())
			) && !deletedConfigCodes.includes(c.code)
		)
	}, [searchQuery, deletedConfigCodes])

	const handleDeleteAgentModelConfig = async (configCode: string) => {
		try {
			// Replace with your actual API endpoint
			const response = await fetch(`/api/action/agent/config/${configCode}`, {
				method: "DELETE",
			});

			if (response.ok) {
				toast.success("Agent config deleted successfully");
				setDeletedConfigCodes([...deletedConfigCodes, configCode]);
			} else {
				const err:ApiError = await response.json();
				toast.error(`Failed to delete Agent config. Message ${err.message}`);
			}
			setAgentToDelete(null);
		} catch (error) {
			console.error("Failed to delete agent config:", error);
		}
	}

  return (
    <div className="space-y-4">
      <SearchAndActionsHeader
        searchPlaceholder="Search Agent Configuration..."
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        newButtonLabel="New agent"
        newButtonHref="/admin/agent/config/new"
      />

      {filteredAgentConfigs.length === 0 ? (
        <SearchNoMatch 
          searchQuery={searchQuery}
          noMatchMessage="No agent configs found matching your search"
          notFoundMessage="No agent configs found"
          newButtonLabel="Create your first agent"
          newButtonHref="/admin/agent/config/new"
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgentConfigs.map((config) => (
            <Card key={config.code} className="flex flex-col overflow-hidden">
              <CardHeader className="flex-1">
                <CardTitle className="text-base">{config.name}</CardTitle>
                <CardDescription className="flex flex-col text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {config.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="max-w-xs text-sm">{config.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>                                   
                </CardDescription>
              </CardHeader>
              <EditDeleteCardFooter 
                editHref={`/admin/agent/config/edit/${config.code}`}  
                onDelete={() => setAgentToDelete(config)}
                deleteDisabled={false}
                deleteDisabledMessage={"Can not delete agent config, there are agents using it"}
              />
            </Card>
          ))}
        </div>
      ) : (
       <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
								<TableHead>Description</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgentConfigs.map((config) => (
                <TableRow key={config.code}>
                  <TableCell className="font-medium">{config.name}</TableCell>
                  <TableCell>{config.description}</TableCell>
                  <EditDeleteTableCell
                    editHref={`/admin/agent/config/edit/${config.code}`} 
                    onDelete={() => setAgentToDelete(config)} 
                  />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteDialog
        title="Agent Delete"
        message={`Are you sure you want to delete the agent "${agentToDelete?.name}"? This action cannot be undone.`}
        open={agentToDelete !== null}
        onOpenChange={() => setAgentToDelete(null)}
        onConfirm={() => agentToDelete && handleDeleteAgentModelConfig(agentToDelete.code)}
      />
    </div>
  )
}
