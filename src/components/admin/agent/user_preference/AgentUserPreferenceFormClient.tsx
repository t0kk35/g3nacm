'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useValidationForm, FormFieldRadioGroup, FormFieldSelect, FormFieldCheckBox } from "@/components/ui/custom/form-field"
import { AgentUserPreference } from "@/app/api/data/agent/types"
import { SaveSubmitFormButton } from "../../SaveSubmitFormButton"
import { Separator } from "@/components/ui/separator"

type AgentModelConfigFormProps = {
  userName: string
  preference?: AgentUserPreference;
}

export function AgentUserPerferenceFormClient({ userName, preference }: AgentModelConfigFormProps) {
  const router = useRouter()
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
      communication_style: (v) => v.trim() ? undefined : "Please select an option for communication style",
      explanation_depth: (v) => v.trim() ? undefined : "Please select an option for explanation depth",
      risk_perspective: (v) => v.trim() ? undefined : "Please select an option for risk persective",
      output_format: (v) => v.trim() ? undefined : "Please select an option for output format",
      use_visual: (v) => v.trim() ? undefined : "Please select an option for the use of visuals", 
      planning_mode: (v) => v.trim() ? undefined : "Please select an option for planning mode",
      preferred_language: (v) => v.trim() ? undefined : "Please select a preferred language"
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

      toast.success(isEditing ? "User Preference updated successfully" : "User Preference created successfully")
      // Refresh the current page. If we did an insert we want to prompt to change the updating
      router.push("/admin/agent/user_preference")
      router.refresh()
    } catch (error) {
      console.error("Error saving user preference:", error)
      toast.error("Failed to save user preference. Please try again.")
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
            {isEditing ? 'Change Agent User Preference' : 'Create Agent User Preference'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4"/>
          <div className="space-y-4">
            <FormFieldRadioGroup
              id='communication_style'
              label="Communication Style"
              value={form.values.communication_style}
              orientation="horizontal"
              onChange={(v) => {form.setField("communication_style", v)}}
              options={[
                { value: "concise", label: "Concise" },
                { value: "balanced", label: "Balanced" },
                { value: "detailed", label: "Detailed" },
              ]}
              error={form.errors.communication_style}
              description="Go straight to the point vs full explanations"
            />
            <FormFieldRadioGroup
              id='explanation_depth'
              label="Explanation Depth"
              value={form.values.explanation_depth}
              orientation="horizontal"
              onChange={(v) => {form.setField("explanation_depth", v)}}
              options={[
                { value: "minimal", label: "Minimal"},
                { value: "standard", label: "Standard"},
                { value: "comprehensive", label: "Comprehensive"}
              ]}
              error={form.errors.explanation_depth}
              description="How much reasoning to show"
            />
            <FormFieldRadioGroup
              id='risk_perspective'
              label="Risk Perspective"
              value={form.values.risk_perspective}
              orientation="horizontal"
              onChange={(v) => {form.setField("risk_perspective", v)}}
              options={[
                { value: "conservative", label: "Conservative"},
                { value: "balanced", label: "Balanced"},
                { value: "risk_tolerant", label: "Risk Tolerant"}
              ]}
              error={form.errors.risk_perspective}
              description="Threshold for flagging concerns"
            />
            <FormFieldRadioGroup 
              id='output_format'
              label="Output Format"
              value={form.values.output_format}
              orientation="horizontal"
              onChange={(v) => {form.setField("output_format", v)}}
              options={[
                { value: "narrative", label: "Narrative" },
                { value: "bullet_points", label: "Bullet Points" },
                { value: "structured", label: "Structured"}
              ]}
              error={form.errors.output_format}
              description="Preferred output style"
            />
            <FormFieldRadioGroup
             id='use_visual'
             label="Use of Visuals"
             value={form.values.use_visual}
             orientation="horizontal"
             onChange={(v) => {form.setField("use_visual", v)}}
             options={[
              { value: "minimal", label: "Minimal" },
              { value: "balanced", label: "Balanced" },
              { value: "maximal", label: "Maximal"}
             ]}
             error={form.errors.use_visual}
             description="Use of visuals such as charts and UI elements"
            />
            <FormFieldRadioGroup 
              id='planning_mode'
              label="Planning Mode"
              value={form.values.planning_mode}
              orientation="horizontal"
              onChange={(v) => {form.setField("planning_mode", v)}}
              options={[
                { value: 'no_explicit_planning', label: "No Explicit Planning" },
                { value: 'communicate_planning', label: "Create a Todo List" },
                { value: 'plan_and_stop_at_each_step', label: "Create Todo List and stop at steps"}
              ]}
              error={form.errors.planning_mode}
              description="Make a plan or not, with the option to stop after each step"
            />
            <Separator />
            <FormFieldSelect 
              id='preferred_language'
              label="Preferred Language"
              value={form.values.preferred_language}
              onChange={(v) => {form.setField("preferred_language", v)}}
              options={[
                { value: "en", label: "English" },
                { value: "fr", label: "French"},
                { value: "es", label: "Spanish"}
              ]}
              error={form.errors.preferred_language}
              description="The preferred output language"
            />
          </div>
        </CardContent>
        <CardFooter className="pt-6">
          <SaveSubmitFormButton 
            saving={saving}
            isEditing={isEditing}
            editText="Update User Preferences"
            newText="Create User Preferences"
          />
        </CardFooter>
      </Card>
    </form>
  )
}