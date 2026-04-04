'use client'

import { useState, useMemo } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useTranslations } from 'next-intl'

type Props = { agentConfigs : AgentConfigAdmin[]}

export function AgentConfigListClient({ agentConfigs }: Props) {

	const t = useTranslations('Admin.Agent.Config')

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
				toast.success(t('toastDeleteSuccess'));
				setDeletedConfigCodes([...deletedConfigCodes, configCode]);
			} else {
				const err:ApiError = await response.json();
				toast.error(t('toastDeleteFailed', { message: err.message }));
			}
			setAgentToDelete(null);
		} catch (error) {
			console.error("Failed to delete agent config:", error);
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
        newButtonHref="/admin/agent/config/new"
      />

      {filteredAgentConfigs.length === 0 ? (
        <SearchNoMatch
          searchQuery={searchQuery}
          noMatchMessage={t('emptyNoMatch')}
          notFoundMessage={t('emptyNotFound')}
          newButtonLabel={t('emptyCreateFirst')}
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
                deleteDisabledMessage={t('deleteDisabled')}
              />
            </Card>
          ))}
        </div>
      ) : (
       <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tableHeaderName')}</TableHead>
								<TableHead>{t('tableHeaderDescription')}</TableHead>
                <TableHead className="w-[180px]">{t('tableHeaderActions')}</TableHead>
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
        title={t('deleteDialogTitle')}
        message={t('deleteDialogMessage', { name: agentToDelete?.name ?? '' })}
        open={agentToDelete !== null}
        onOpenChange={() => setAgentToDelete(null)}
        onConfirm={() => agentToDelete && handleDeleteAgentModelConfig(agentToDelete.code)}
      />
    </div>
  )
}
