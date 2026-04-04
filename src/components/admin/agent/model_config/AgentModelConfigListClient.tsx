'use client'

import type React from "react"

import { useState, useMemo } from "react"
import { SearchAndActionsHeader } from "../../SearchAndActionHeader"
import { SearchNoMatch } from "../../SearchNoMatch"
import { EditDeleteCardFooter } from "../../EditDeleteCardFooter"
import { EditDeleteTableCell } from "../../EditDeleteTableCell"
import { DeleteDialog } from "../../DeleteDiaglog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { AgentModelConfig } from "@/lib/cache/agent-model-config-cache";
import { AgentModelConfigAdmin } from "@/app/api/data/agent/types"
import { toast } from "sonner"
import { ApiError } from "next/dist/server/api-utils"
import { useTranslations } from "next-intl"

type Props = { agentConfigs : AgentModelConfigAdmin[]}

export function AgentModelConfigListClient({ agentConfigs }: Props) {

  const t = useTranslations('Admin.Agent.ModelConfig')

  const [modelConfigToDelete, setModelConfigToDelete] = useState<AgentModelConfig | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")
  const [deletedModelConfigCodes, setDeletedModelConfigCodes] = useState<string[]>([])

  const filteredAgentModelConfigs = useMemo(()=>{
    if (!searchQuery.trim() && deletedModelConfigCodes.length === 0) return agentConfigs
    return agentConfigs.filter(c=> 
      (
        c.code.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) ||
        c.name.toLocaleLowerCase().includes(searchQuery.toLocaleLowerCase()) 
      ) && !deletedModelConfigCodes.includes(c.code)
    )
  }, [searchQuery, deletedModelConfigCodes])

  const handleDeleteAgentModelConfig = async (configCode: string) => {
    try {
      // Replace with your actual API endpoint
      const response = await fetch(`/api/action/agent/model_config/${configCode}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t('toastDeleteSuccess'));
        setDeletedModelConfigCodes([...deletedModelConfigCodes, configCode]);
      } else {
        const err:ApiError = await response.json();
        toast.error(t('toastDeleteFailed', { message: err.message}));
      }
      setModelConfigToDelete(null);
    } catch (error) {
      console.error("Failed to delete agent model config:", error);
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
        newButtonHref="/admin/agent/model_config/new"
      />

      {filteredAgentModelConfigs.length === 0 ? (
        <SearchNoMatch 
          searchQuery={searchQuery}
          noMatchMessage={t('emptyNoMatch')}
          notFoundMessage={t('emptyNotFound')}
          newButtonLabel={t('emptyCreateFirst')}
          newButtonHref="/admin/agent/model_config/new"
        />
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredAgentModelConfigs.map((config) => (
            <Card key={config.code} className="flex flex-col overflow-hidden">
              <CardHeader className="flex-1">
                <CardTitle className="text-base">{config.code}</CardTitle>
                <CardDescription className="flex flex-col text-xs">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-xs text-muted-foreground line-clamp-2">
                          {config.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="max-w-xs text-sm">{config.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>                                   
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm font-mono text-chart-1">
                <span>({config.agent_codes.length}) agent{config.agent_codes.length !== 1 ? "s" : ""}</span>
              </CardContent>
              <EditDeleteCardFooter 
                editHref={`/admin/agent/model_config/edit/${config.code}`}  
                onDelete={() => setModelConfigToDelete(config)}
                deleteDisabled={config.agent_codes.length > 0}
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
                <TableHead>{t('tableHeaderCode')}</TableHead>
                <TableHead>{t('tableHeaderName')}</TableHead>
                <TableHead className="w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAgentModelConfigs.map((config) => (
                <TableRow key={config.code}>
                  <TableCell className="font-medium">{config.code}</TableCell>
                  <TableCell>{config.name}</TableCell>
                  <EditDeleteTableCell
                    editHref={`/admin/agent/model_config/edit/${config.code}`} 
                    onDelete={() => setModelConfigToDelete(config)} 
                  />
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <DeleteDialog
        title={t('deleteDialogTitle')}
        message={t('deleteDialogMessage', { name: modelConfigToDelete?.name ?? '' })}
        open={modelConfigToDelete !== null}
        onOpenChange={() => setModelConfigToDelete(null)}
        onConfirm={() => modelConfigToDelete && handleDeleteAgentModelConfig(modelConfigToDelete.code)}
      />
    </div>

  )
}