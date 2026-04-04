'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useValidationForm, FormFieldRadioGroup, FormFieldSelect, FormFieldCheckBox } from "@/components/ui/custom/form-field"
import { AgentUserPreference } from "@/app/api/data/agent/types"
import { SaveSubmitFormButton } from "../../SaveSubmitFormButton"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"

type AgentModelConfigFormProps = {
  userName: string
  preference?: AgentUserPreference;
}

export function AgentUserPerferenceFormClient({ userName, preference }: AgentModelConfigFormProps) {
  const router = useRouter()
  const t = useTranslations('Admin.Agent.UserPreference')
  const tc = useTranslations('Common')
  const isEditing = !!preference  
  
  const [saving, setSaving] = useState(false)

  // Basic form fields
  const form = useValidationForm(
    {  
      communication_style: preference?.communication_style || "",
      explanation_depth: preference?.explantion_depth || "",
      risk_perspective: preference?.risk_perspective || "",
      output_format: preference?.output_format || "",
      use_visual: preference?.use_visual || "",
      planning_mode: preference?.planning_mode || "",
      preferred_language: preference?.preferred_language || 'en'
    },
    {
      communication_style: (v) => v.trim() ? undefined : t('validationCommunicationStyleRequired'),
      explanation_depth: (v) => v.trim() ? undefined : t('validationExplanationDepthRequired'),
      risk_perspective: (v) => v.trim() ? undefined : t('validationRiskPerspectiveRequired'),
      output_format: (v) => v.trim() ? undefined :t('validationOutputFormatRequired'),
      use_visual: (v) => v.trim() ? undefined : t('validationUseVisualRequired'), 
      planning_mode: (v) => v.trim() ? undefined : t('validationPlanningModeRequired'),
      preferred_language: (v) => v.trim() ? undefined : t('validationPreferredLanguangeRequired')
    }
  )

  const handleSubmit = async () => {
    setSaving(true)
  
    try {
      // Create or update config
      const url = '/api/action/agent/user_preference'
      const method = isEditing ? "PUT" : "POST"

      const pref:AgentUserPreference = {
        user_name: userName,
        communication_style: form.values.communication_style as 'concise' | 'balanced' | 'detailed',
        explantion_depth: form.values.explanation_depth as 'minimal' | 'standard' | 'comprehensive',
        risk_perspective: form.values.risk_perspective as 'balanced' | 'conservative' | 'risk_tolerant',
        output_format: form.values.output_format as 'narrative' | 'bullet_points' | 'structured',
        use_visual: form.values.use_visual as 'balanced' | 'minimal' | 'maximal',
        planning_mode: form.values.planning_mode as 'no_explicit_planning' | 'communicate_planning' | 'plan_and_stop_at_each_step',
        preferred_language: form.values.preferred_language,
        show_confidence_scores: false,
        highlight_assumptions: false
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pref),
      })

      if (!response.ok) {
        throw new Error("Failed to save agent user preference")
      }

      toast.success(isEditing ? t('toastUpdated') : t('toastCreated'))
      // Refresh the current page. If we did an insert we want to prompt to change the updating
      router.push("/admin/agent/user_preference")
      router.refresh()
    } catch (error) {
      console.error("Error saving user preference:", error)
      toast.error(t('toastSaveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Agent User Preferences</CardTitle>
          <CardDescription>
            {isEditing ? t('formDescriptionChange') : t('formDescriptionCreate')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4"/>
          <div className="space-y-4">
            <FormFieldRadioGroup
              id='communication_style'
              label={t('fieldCommunicationStyle')}
              value={form.values.communication_style}
              orientation="horizontal"
              onChange={(v) => {form.setField("communication_style", v)}}
              options={[
                { value: "concise", label: t('communicationStyleConcise') },
                { value: "balanced", label: t('communicationStyleBalanced') },
                { value: "detailed", label: t('communicationStyleDetailed') },
              ]}
              error={form.errors.communication_style}
              description={t('fieldCommunicationStyleDescription')}
            />
            <FormFieldRadioGroup
              id='explanation_depth'
              label={t('fieldExplanationDepth')}
              value={form.values.explanation_depth}
              orientation="horizontal"
              onChange={(v) => {form.setField("explanation_depth", v)}}
              options={[
                { value: "minimal", label: t('explantionDepthMinimal')},
                { value: "standard", label: t('explantionDepthStandard')},
                { value: "comprehensive", label: t('explantionDepthComprehensive')}
              ]}
              error={form.errors.explanation_depth}
              description={t('fieldExplanationDepthDescription')}
            />
            <FormFieldRadioGroup
              id='risk_perspective'
              label={t('fieldRiskPerpsective')}
              value={form.values.risk_perspective}
              orientation="horizontal"
              onChange={(v) => {form.setField("risk_perspective", v)}}
              options={[
                { value: "conservative", label: t('riskPerspectiveConservative')},
                { value: "balanced", label: t('riskPerspectiveBalanced')},
                { value: "risk_tolerant", label: t('riskPerspectiveTolerant')}
              ]}
              error={form.errors.risk_perspective}
              description={t('fieldRiskPerspectiveDescription')}
            />
            <FormFieldRadioGroup 
              id='output_format'
              label={t('fieldOutputFormat')}
              value={form.values.output_format}
              orientation="horizontal"
              onChange={(v) => {form.setField("output_format", v)}}
              options={[
                { value: "narrative", label: t('outputFormatNarrative') },
                { value: "bullet_points", label: t('outputFormatBulletPoints') },
                { value: "structured", label: t('outputFormatStructured')}
              ]}
              error={form.errors.output_format}
              description={t('fieldOutputFormatDescription')}
            />
            <FormFieldRadioGroup
             id='use_visual'
             label={t('fieldUseOfVisuals')}
             value={form.values.use_visual}
             orientation="horizontal"
             onChange={(v) => {form.setField("use_visual", v)}}
             options={[
              { value: "minimal", label: t('useOfVisualsMinimal') },
              { value: "balanced", label: t('useOfVisualsBalanced') },
              { value: "maximal", label: t('useOfVisualsMaximal') }
             ]}
             error={form.errors.use_visual}
             description={t('fieldUseOfVisualsDescription')}
            />
            <FormFieldRadioGroup 
              id='planning_mode'
              label={t('fieldPlanningMode')}
              value={form.values.planning_mode}
              orientation="horizontal"
              onChange={(v) => {form.setField("planning_mode", v)}}
              options={[
                { value: 'no_explicit_planning', label: t('planningModeNoExplicit') },
                { value: 'communicate_planning', label: t('planningModeTodo') },
                { value: 'plan_and_stop_at_each_step', label: t('planningModeTodoAndStop') }
              ]}
              error={form.errors.planning_mode}
              description={t('fieldPlanningModeDescription')}
            />
            <Separator />
            <FormFieldSelect 
              id='preferred_language'
              label={t('fieldPreferredLanguage')}
              value={form.values.preferred_language}
              onChange={(v) => {form.setField("preferred_language", v)}}
              options={[
                { value: "en", label: tc('languageEnglish') },
                { value: "fr", label: tc('languageFrench')},
                { value: "es", label: tc('languageSpanish')}
              ]}
              error={form.errors.preferred_language}
              description={t('fieldPreferredLanguageDescription')}
            />
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <SaveSubmitFormButton 
            saving={saving}
            isEditing={isEditing}
            editText={t('submitUpdate')}
            newText={t('submitCreate')}
          />
        </CardFooter>
      </Card>
    </form>
  )
}