import { JSX } from "react"
import { WorkflowFormField } from "@/app/api/data/workflow/types"
import { TextField } from "./text-field"
import { TextAreaField } from "./text-area-field"
import { SelectField } from "./select-field"
import { CheckBoxField } from "./checkbox-field"
import { RadioField } from "./radio-field"
import { UserSelectField } from "./user-select-field"
import { UserTeamSelectField } from "./user-team-select-field"

type WorkflowActionFormProps = {
  fields: WorkflowFormField[]
  formData: Record<string, any>
  formErrors: Record<string, string>
  onChange: (code: string, value: any) => void
};

export type WorkflowFieldRendererProps = {
  field: WorkflowFormField;
  value: any;
  error: string;
  onChange: (code: string, value: any) => void
};

const fieldRenderers: { [key: string]: (p: WorkflowFieldRendererProps) => JSX.Element }= {
  "text": TextField,
  "textarea": TextAreaField,
  "select": SelectField,
  "checkbox": CheckBoxField,
  "radio": RadioField,
  "userselect": UserSelectField,
  "userteamselect": UserTeamSelectField
};

// The base workflow form. This renders each fo the field types in order.
export function WorkflowActionForm({ fields, formData, formErrors, onChange }: WorkflowActionFormProps) {
  return (
    <div className="space-y-4">
      {fields.sort(field => field.order).map((field) => {
        const Renderer = fieldRenderers[field.type]
        if (!Renderer) return null

        return (
          <Renderer
            key={field.code}
            field={field}
            value={formData[field.code]}
            error={formErrors[field.code]}
            onChange={onChange}
          />
        )
      })}
    </div>
  )
};