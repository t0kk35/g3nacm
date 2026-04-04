'use client'

import type React from "react"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ArrowLeft, Search, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AgentConfigAdmin, AgentToolAdmin } from "@/app/api/data/agent/types"
import { AgentModelConfig } from "@/lib/cache/agent-model-config-cache"
import { useValidationForm, FormFieldSelect, FormFieldInput, FormFieldTemplateTextArea } from "@/components/ui/custom/form-field"
import { formValidateTemplateText, formValidateNumber } from "@/components/ui/custom/form-field"
import { SaveSubmitFormButton } from "../../SaveSubmitFormButton"
import { useTranslations } from 'next-intl'

type FormAgentTool = {
  code: string
  agent_group: string
  description: string
  selected?: boolean
}

type AgentConfigFormProps = {
  config?: AgentConfigAdmin;
  iTools: AgentToolAdmin[];
  iModelConfig: AgentModelConfig[]
}

export function AgentConfigFormClient({ config, iTools, iModelConfig }: AgentConfigFormProps) {
  const router = useRouter()
  const t = useTranslations('Admin.Agent.Config')

  const [tools, setTools] = useState<FormAgentTool[]>([])
  const [toolGroups, setToolGroups] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toolSearch, setToolSearch] = useState("")

  const form = useValidationForm(
    {
      code: config?.code || "",
      name: config?.name || "",
      description: config?.description || "",
      agentType: config?.agent_type || 'streaming',
      modelConfigCode: config?.model_config_code || "",
      systemPrompt: config?.system_prompt || "",
      maxSteps: (config && 'max_steps' in config) ? config.max_steps?.toString() || "" : "",
    },
    {
      code: (v) => v.trim() ? undefined : t('validationCodeRequired'),
      name: (v) => v.trim() ? undefined : t('validationNameRequired'),
      description: (v) => v.trim() ? undefined : t('validationDescriptionRequired'),
      maxSteps: (v) => formValidateNumber(v, { min:1, required: false }),
      systemPrompt: (v) => formValidateTemplateText(v)
    }
  )

  const isEditing = !!config

  useEffect(() => {
    const initTools = async () => {
      const formTools: FormAgentTool[] = iTools.map(tool => ({
        code: tool.code,
        agent_group: tool.agent_group,
        description: tool.description,
        selected: false
      }))

      // If editing, mark selected tools
      if (config && 'tools' in config && config.tools) {
        const tools = config.tools
        formTools.forEach((tool) => {
          tool.selected = tools.includes(tool.code)
        })
      }
      setTools(formTools)

      // Extract unique tool groups
      const groups = Array.from(new Set(formTools.map((t) => t.agent_group)))
      setToolGroups(groups)
    }

    initTools()
  }, [config, iTools])

  // Filter tools based on search query
  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return tools

    return tools.filter(
      (t) =>
        t.code.toLowerCase().includes(toolSearch.toLowerCase()) ||
        t.description.toLowerCase().includes(toolSearch.toLowerCase()),
    )
  }, [tools, toolSearch])

  // Get filtered tool groups (only show groups that have matching tools)
  const filteredToolGroups = useMemo(() => {
    if (!toolSearch.trim()) return toolGroups

    const groupsWithMatchingTools = new Set(filteredTools.map((t) => t.agent_group))

    return toolGroups.filter((group) => groupsWithMatchingTools.has(group))
  }, [toolGroups, filteredTools, toolSearch])

  const handleSubmit = async () => {
    setSaving(true)

    try {
      const selectedTools = tools.filter((t) => t.selected).map((t) => t.code)

      // Build agent config based on agent type
      let agentData: AgentConfigAdmin = {
        code: form.values.code,
        name: form.values.name,
        description: form.values.description,
        agent_type: form.values.agentType,
        model_config_code: form.values.modelConfigCode,
        system_prompt: form.values.systemPrompt || undefined,
      }

      // Add tools and maxSteps for streaming and text agents
      if (form.values.agentType === 'streaming' || form.values.agentType === 'text') {
        agentData.tools = selectedTools
        if (form.values.maxSteps) {
          agentData.max_steps = parseInt(form.values.maxSteps)
        }
      }

      // TODO: Add outputSchema handling for object agent type if needed

      // Create or update agent config
      const url = isEditing ? `/api/action/agent/config/${config.code}` : "/api/action/agent/config"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentData),
      })

      if (!response.ok) {
        throw new Error("Failed to save agent configuration")
      }
      toast.success(isEditing ? t('toastUpdated') : t('toastCreated'))
      router.push("/admin/agent/config")
      router.refresh()
    } catch (error) {
      console.error("Error saving agent configuration:", error)
      toast.error(t('toastSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  const toggleTool = (code: string) => {
    setTools(
      tools.map((tool) =>
        tool.code === code ? { ...tool, selected: !tool.selected } : tool,
      ),
    )
  }

  const toggleToolGroup = (group: string, selected: boolean) => {
    setTools(
      tools.map((tool) =>
        tool.agent_group === group ? { ...tool, selected } : tool,
      ),
    )
  }

  const isGroupSelected = (group: string) => {
    const groupTools = tools.filter((t) => t.agent_group === group)
    return groupTools.length > 0 && groupTools.every((t) => t.selected)
  }

  const isGroupIndeterminate = (group: string) => {
    const groupTools = tools.filter((t) => t.agent_group === group)
    const selectedCount = groupTools.filter((t) => t.selected).length
    return selectedCount > 0 && selectedCount < groupTools.length
  }

  // Count selected tools
  const selectedToolCount = tools.filter((t) => t.selected).length

  // Check if tools should be shown (only for streaming and text agents)
  const showTools = form.values.agentType === 'streaming' || form.values.agentType === 'text'

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="space-y-2">
        <Card className="pt-5">
          <CardContent>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/agent/config")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('backButton')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>{t('detailsCardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormFieldInput
                id="code"
                label={t('fieldCode')}
                value={form.values.code}
                onChange={(v) => form.setField("code", v)}
                error={form.errors.code}
                placeholder={t('fieldCodePlaceHolder')}
                disabled={isEditing}
                required
              />
              <FormFieldInput
                id="name"
                label={t('fieldName')}
                value={form.values.name}
                onChange={(v) => form.setField("name", v)}
                error={form.errors.name}
                placeholder={t('fieldNamePlaceholder')}
                required
              />
              <FormFieldInput
                id="description"
                label={t('fieldDescription')}
                value={form.values.description}
                onChange={(v) => form.setField("description", v)}
                error={form.errors.description}
                placeholder={t('fieldDescriptionPlaceholder')}
                required
              />
              <FormFieldSelect
                id="agentType"
                label={t('fieldAgentType')}
                placeholder="Select agent type"
                value={form.values.agentType}
                onChange={(v) => form.setField("agentType", v)}
                error={form.errors.agentType}
                options={[
                  { value: 'streaming', label: t('agentTypeStreaming') },
                  { value: 'text', label: t('agentTypeText') },
                  { value: 'object', label: t('agentTypeObject') },
                ]}
              />
              <FormFieldSelect
                id="modelConfigCode"
                label={t('fieldModelConfig')}
                placeholder="Select model configuration"
                value={form.values.modelConfigCode}
                onChange={(v) => form.setField("modelConfigCode", v)}
                error={form.errors.modelConfigCode}
                options={iModelConfig.map((modelConfig) => ({
                  value: modelConfig.code,
                  label: `${modelConfig.name} (${modelConfig.provider} - ${modelConfig.model})`,
                }))}
                required
              />
              <FormFieldTemplateTextArea
                id="systemPrompt"
                label={t('fieldSystemPrompt')}
                value={form.values.systemPrompt}
                onChange={(v) => form.setField("systemPrompt", v)}
                placeholder={t('fieldSystemPromptPlaceholder')}
                rows={8}
                error={form.errors.systemPrompt}
                description={t('fieldSystemPromptDescription')}
              />
              {showTools && (
                <FormFieldInput
                  id="maxSteps"
                  label={t('fieldMaxSteps')}
                  value={form.values.maxSteps}
                  onChange={(v) => form.setField("maxSteps", v)}
                  error={form.errors.maxSteps}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {showTools && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div>
                  <CardTitle>{t('toolsSectionTitle')}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    {t('toolsSectionDescription')}
                    {selectedToolCount > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {t('toolsSelectedCount', { count: selectedToolCount })}
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('toolsSearchPlaceholder')}
                      className="pl-8"
                      value={toolSearch}
                      onChange={(e) => setToolSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredToolGroups.length > 0 ? (
                <Tabs defaultValue={filteredToolGroups[0]}>
                  <TabsList className="mb-4 flex flex-wrap h-auto">
                    {filteredToolGroups.map((group) => (
                      <TabsTrigger key={group} value={group} className="h-8 text-xs">
                        {group}
                        {isGroupSelected(group) && <Check className="ml-1 h-3 w-3" />}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {filteredToolGroups.map((group) => (
                    <TabsContent key={group} value={group} className="space-y-4">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <Checkbox
                          id={`group-${group}`}
                          checked={isGroupSelected(group)}
                          onCheckedChange={(checked) => toggleToolGroup(group, !!checked)}
                          data-indeterminate={isGroupIndeterminate(group)}
                          className={
                            isGroupIndeterminate(group)
                              ? "data-[indeterminate=true]:bg-primary data-[indeterminate=true]:opacity-50"
                              : ""
                          }
                        />
                        <Label htmlFor={`group-${group}`} className="font-semibold">
                          {t('toolsSelectAllGroup', { group })}
                        </Label>
                      </div>

                      <div className="space-y-1">
                        {filteredTools
                          .filter((t) => t.agent_group === group)
                          .map((tool) => (
                            <div key={tool.code} className="flex items-start py-1 hover:bg-muted/50 px-1 rounded">
                              <Checkbox
                                id={`tool-${tool.code}`}
                                checked={tool.selected}
                                onCheckedChange={() => toggleTool(tool.code)}
                                className="mt-0.5"
                              />
                              <div className="ml-2 space-y-0.5">
                                <Label htmlFor={`tool-${tool.code}`} className="font-medium text-sm">
                                  {tool.code}
                                </Label>
                                <p className="text-xs text-muted-foreground">{tool.description}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <p className="text-muted-foreground">
                  {toolSearch ? t('toolsNoMatch') : t('toolsNoneAvailable')}
                </p>
              )}
            </CardContent>
            <CardFooter>
              <SaveSubmitFormButton
                saving={saving}
                isEditing={isEditing}
                editText={t('submitUpdate')}
                newText={t('submitCreate')}
              />
            </CardFooter>
          </Card>
        )}

        {!showTools && (
          <Card>
            <CardFooter className="pt-6">
              <SaveSubmitFormButton
                saving={saving}
                isEditing={isEditing}
                editText={t('submitUpdate')}
                newText={t('submitCreate')}
              />
            </CardFooter>
          </Card>
        )}
      </div>
    </form>
  )
}
