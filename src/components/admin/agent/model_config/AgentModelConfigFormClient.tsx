'use client'

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { AgentModelConfig } from "@/lib/cache/agent-model-config-cache"
import { modelProviders, modelProviderModels } from "@/lib/ai-tools/types"
import { useValidationForm, formValidateNumber, FormFieldSelect, FormFieldInput, FormFieldCheckBox, FormFieldTextArea } from "@/components/ui/custom/form-field"
import { SaveSubmitFormButton } from "../../SaveSubmitFormButton"

type AgentModelConfigFormProps = {
  config?: AgentModelConfig;
}

export function AgentModelConfigFormClient({ config }: AgentModelConfigFormProps) {
  const router = useRouter()
  const isEditing = !!config

  // Basic form fields
  const form = useValidationForm(
    {
      code: config?.code || "",
      name: config?.name || "",
      provider: config?.provider || "",
      model: config?.model || "",
      temperature: config?.temperature?.toString() || "",
      maxTokens: config?.max_tokens?.toString() || "",
      topP: config?.top_p?.toString() || "",
      apiKey: config?.api_key || "",
      budgetTokens: "",
      reasoningEffort: "",
      reasoningSummary: ""
    },
    {
      code: (v) => v.trim() ? undefined : "Agent Model code is required",
      name: (v) => v.trim() ? undefined : "Agent Model name is required",
      provider: (v) => v.trim() ? undefined : "Agent Model provider is required",
      model: (v) => v.trim() ? undefined: "Agent Model model is required",
      temperature: (v) => formValidateNumber(v, { min: 0, max: 2 }),
      maxTokens: (v) => formValidateNumber(v, { min: 1, step: 1 }),
      topP: (v) => formValidateNumber(v, { min: 0, max: 1 }),
      budgetTokens: (v, av) => {
        if (av.provider === 'anthropic' && reasoningEnabled) return formValidateNumber(v, { min: 1000, step: 1000, required: true })
        else return undefined
      }
    }
  )

  // Reasoning flags
  const [reasoningEnabled, setReasoningEnabled] = useState(false)
  const [interleavedThinkingEnabled, setInterleavedThinkingEnabled] = useState(false)

  const [saving, setSaving] = useState(false)

  // Ref for scrolling to Model Parameters section
  const modelParametersRef = useRef<HTMLDivElement>(null)

  // Initialize from existing config
  useEffect(() => {
    if (config) {
      // Check for Anthropic reasoning
      if (config.provider === 'anthropic' && config.provider_options?.anthropic.thinking) {
        setReasoningEnabled(config.provider_options.anthropic.thinking.type === 'enabled')
        if (config.provider_options.anthropic.thinking.budgetTokens) {
          form.setField("budgetTokens",config.provider_options.anthropic.thinking.budgetTokens.toString())
        }
      }

      // Check for interleaved thinking (anthropic beta header)
      if (config.provider === 'anthropic' && config.headers?.['anthropic-beta']) {
        setInterleavedThinkingEnabled(true)
      }

      // Check for OpenAI reasoning
      if (config.provider === 'openai' && config.provider_options) {
        if (config.provider_options.reasoningEffort) {
          setReasoningEnabled(true)
          form.setField("reasoningEffort", config.provider_options.reasoningEffort as string)
        }
        if (config.provider_options.reasoningSummary) {
          form.setField("reasoningSummary", config.provider_options.reasoningSummary as string)
        }
      }

      // Mark initialization as complete
      hasInitialized.current = true
    }
  }, [config])

  // Filter available models based on selected provider
  const availableModels = form.values.provider? modelProviderModels.filter(m => 
    {
      const selectedProvider = modelProviders.find(p => p.name.toLowerCase() === form.values.provider.toLowerCase())
      return selectedProvider ? m.providerId === selectedProvider.id : false
    }): []

  // Reset model when provider changes
  useEffect(() => {
    if (form.values.provider && !availableModels.find(m => m.name === form.values.model)) {
      form.setField("model", "")
    }
  }, [form.values.provider])

  // Scroll to Model Parameters section when it becomes visible
  useEffect(() => {
    if (form.values.provider && form.values.model && modelParametersRef.current) {
      // Use setTimeout to ensure the section is rendered before scrolling
      setTimeout(() => {
        modelParametersRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }, 100)
    }
  }, [form.values.provider, form.values.model])

  // Reset reasoning options when provider changes (but not on initial mount when editing)
  const isInitialMount = useRef(true)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Don't reset if we're still initializing from config
    if (isEditing && !hasInitialized.current) {
      return
    }

    setReasoningEnabled(false)
    setInterleavedThinkingEnabled(false)
    form.setField("budgetTokens", "")
    form.setField("reasoningEffort", "")
    form.setField("reasoningSummary", "")
  }, [form.values.provider, isEditing])

  const handleSubmit = async () => {
    setSaving(true)

    try {
      // Build headers object
      const headers: Record<string, string> = {}
      if (form.values.provider === 'anthropic' && interleavedThinkingEnabled) {
        headers['anthropic-beta'] = 'interleaved-thinking-2025-12-13'
      }

      // Build provider options
      const providerOptions: Record<string, any> = {}

      if (form.values.provider === 'anthropic' && reasoningEnabled) {
        providerOptions.anthropic = {}
        providerOptions.anthropic.thinking = {
          type: 'enabled',
          ...(form.values.budgetTokens && { budgetTokens: parseInt(form.values.budgetTokens) })
        }
      }

      if (form.values.provider === 'openai' && reasoningEnabled) {
        providerOptions.openai = {}
        if (form.values.reasoningEffort) {
          providerOptions.openai.reasoningEffort = form.values.reasoningEffort
        }
        if (form.values.reasoningSummary) {
          providerOptions.openai.reasoningSummary = form.values.reasoningSummary
        }
      }

      // Build the request payload
      const configData = {
        code: form.values.code,
        name: form.values.name,
        provider: form.values.provider,
        model: form.values.model,
        ...(form.values.temperature && { temperature: parseFloat(form.values.temperature) }),
        ...(form.values.maxTokens && { max_tokens: parseInt(form.values.maxTokens) }),
        ...(form.values.topP && { top_p: parseFloat(form.values.topP) }),
        api_key: form.values.apiKey,
        headers,
        provider_options: providerOptions
      }

      // Create or update config
      const url = isEditing
        ? `/api/action/agent/model_config/${config.code}`
        : "/api/action/agent/model_config"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configData),
      })

      if (!response.ok) {
        throw new Error("Failed to save agent model configuration")
      }

      toast.success(isEditing ? "Configuration updated successfully" : "Configuration created successfully")
      router.push("/admin/agent/model_config")
      router.refresh()
    } catch (error) {
      console.error("Error saving configuration:", error)
      toast.error("Failed to save configuration. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  // Show reasoning options based on provider and model
  const showReasoningOptions = () => {
    if (form.values.provider === 'anthropic' && form.values.model === 'claude-sonnet-4-5-20250929') {
      return true
    }
    if (form.values.provider === 'openai' && (form.values.model === 'gpt-5')) {
      return true
    }
    return false
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <div className="space-y-2">
        <Card className="pt-5">
          <CardContent>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/agent/model_config")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Model Configurations
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Basic Configuration</CardTitle>
            <CardDescription>Configure the agent model settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <FormFieldInput 
                id="code"
                label="Configuration Code"
                value={form.values.code}
                onChange={(v) => {form.setField("code", v)}}
                error={form.errors.code}
                placeholder="e.g., claude-4-5-reasoni"
                description="Unique identifier for this configuration"
                disabled={isEditing}
                required
              />
              <FormFieldInput 
                id="name"
                label="Configuration Name"
                value={form.values.name}
                onChange={(v) => {form.setField("name", v)}}
                error={form.errors.name}
                placeholder="e.g., Claude 4.5 with Extended Reasoning"
                required
              />
              <FormFieldSelect 
                id="provider"
                label="Provider"
                placeholder="Select a provider"
                value={form.values.provider}
                onChange={(v) => {form.setField("provider", v)}}
                error={form.errors.provider}
                options={modelProviders.map((p) => ({
                  value: p.name.toLocaleLowerCase(),
                  label: p.name
                }))}
                required
              />
              {form.values.provider && (
                <FormFieldSelect 
                  id="model"
                  label="Model"
                  placeholder="Select a model"
                  value={form.values.model}
                  onChange={(v) => {form.setField("model", v)}}
                  error={form.errors.model}
                  options={availableModels.map((m) => ({
                    value: m.name,
                    label: m.name
                  }))}
                  required
                />
              )}
            </div>
          </CardContent>
        </Card>

        {form.values.provider && form.values.model && (
          <Card ref={modelParametersRef}>
            <CardHeader className="pb-2">
              <CardTitle>Model Parameters</CardTitle>
              <CardDescription>Optional parameters to control model behavior <span className="text-sm text-muted-foreground">(If left blank the model standards are used)</span> </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FormFieldTextArea
                  id="apiKey"
                  label="API Key"
                  value={form.values.apiKey}
                  onChange={(v) => {form.setField("apiKey", v)}}
                  error={form.errors.apiKey}
                  rows={3}
                  description="(Optional) API key. If not provided, the keys in the env.local will be used"
                />
                <FormFieldInput 
                  id="temperature"
                  label="Temperature"
                  value={form.values.temperature}
                  onChange={(v) => {form.setField("temperature", v)}}
                  error={form.errors.temperature}
                  description="Controls randomness (0-2). Higher values make output more random."
                />
                <FormFieldInput 
                  id="maxTokens"
                  label="Max Tokens"
                  value={form.values.maxTokens}
                  onChange={(v) => {form.setField("maxTokens", v)}}
                  error={form.errors.maxTokens}
                  description="Maximum number of tokens to generate"
                />
                <FormFieldInput 
                  id="topP"
                  label="Top P"
                  value={form.values.topP}
                  onChange={(v) => {form.setField("topP", v)}}
                  error={form.errors.topP}
                  description="Nucleus sampling parameter (0-1)"
                />

                {showReasoningOptions() && (
                  <Card className="border-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Reasoning Configuration</CardTitle>
                      <CardDescription>Enable extended thinking capabilities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <FormFieldCheckBox 
                          id="reasoning"
                          label="Enable Reasoning"
                          checked={reasoningEnabled}
                          onCheckedChange={(checked) => {
                            setReasoningEnabled(!!checked)
                            if (!checked) {
                              setInterleavedThinkingEnabled(false)
                            }
                          }}
                          description={form.values.provider === 'anthropic'
                            ? "Enable extended thinking for more thoughtful responses"
                            : "Enable reasoning mode for complex problem solving"
                          }
                        />

                        {reasoningEnabled && form.values.provider === 'anthropic' && (
                          <>
                            <div className="ml-6">
                              <FormFieldInput 
                                id="budgetTokens"
                                label="Budget Tokens"
                                value={form.values.budgetTokens}
                                onChange={(v) => {form.setField("budgetTokens", v)}}
                                error={form.errors.budgetTokens}
                                description="Maximum tokens allocated for thinking (optional)"
                              />

                              <FormFieldCheckBox 
                                id="interleavedThinking"
                                label="Enable Interleaved Thinking"
                                checked={interleavedThinkingEnabled}
                                onCheckedChange={(checked) => setInterleavedThinkingEnabled(!!checked)}
                                description="Allow thinking to be interleaved with responses (experimental)"
                              />
                            </div>
                          </>
                        )}

                        {reasoningEnabled && form.values.provider === 'openai' && (
                          <>
                            <div className="ml-6">
                              <FormFieldSelect 
                                id="reasoningEffort"
                                label="Reasoning Effort"
                                placeholder="Select effort level"
                                value={form.values.reasoningEffort}
                                onChange={(v) => {form.setField("reasoningEffort", v)}}
                                error={form.errors.reasoningEffort}
                                options={([
                                  {value: "low", label: "Low"},
                                  {value: "medium", label: "Medium"},
                                  {value: "high", label: "High"}
                                ])}
                                description=" Amount of reasoning effort to apply"
                              />
                              <FormFieldSelect 
                                id="reasoningSummary"
                                label="Reasoning Summary"
                                placeholder="Select summary type"
                                value={form.values.reasoningSummary}
                                onChange={(v) => {form.setField("reasoningSummary", v)}}
                                error={form.errors.reasoningSummary}
                                options={([
                                  { label: "auto", value: "Auto"},
                                  { label: "detailed", value: "Detailed"}
                                ])}
                                description="How to summarize reasoning process (optional)"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-6">
              <SaveSubmitFormButton 
                saving={saving}
                isEditing={isEditing}
                editText="Update Model Configuration"
                newText="Create Model Configuration"
              />
            </CardFooter>
          </Card>
        )}
      </div>
    </form>
  )
}