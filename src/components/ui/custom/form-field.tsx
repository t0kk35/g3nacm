import { useState } from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Checkbox } from "../checkbox"
import { TemplateTextarea } from "./template-textarea/TemplateTextarea"
import { Label } from "../label"
import { Input } from "../input"
import { FormError } from "./form-error"
import { VALID_TEMPLATE_VARIABLES } from "@/components/ui/custom/template-textarea/template-variables"
import { validateTemplate, extractTemplateVariables } from "@/lib/ai-tools/template-utils"
import { Textarea } from "../textarea"

// Input Field
type FormFieldInputProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  description?: string
  required?: boolean
  disabled?: boolean
}

export function FormFieldInput({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  description,
  required,
  disabled,
}: FormFieldInputProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {required && <FormFieldMandatory />}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
	  	<FormError error={error} /> 
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

// Checkbox Field
type FormFieldCheckBoxProps = {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (value: string | boolean) => void
  description?: string
}

export function FormFieldCheckBox({
  id,
  label,
  checked,
  onCheckedChange,
  description
}: FormFieldCheckBoxProps) {
  return (
    <div className="flex items-start space-x-1">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c)}
      />
      <div className="space-y-1">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}

// Select Field
type FormFieldSelectOption = {
  value: string
  label: string
}

type FormFieldSelectProps = {
  id: string
  label: string
  placeholder?: string
  value?: string
  onChange: (value: string) => void
  options: FormFieldSelectOption[]
  error?: string
  description?: string
  required?: boolean
}

export function FormFieldSelect({
  id,
  label,
  placeholder,
  value,
  onChange,
  options,
  error,
  description,
  required
}: FormFieldSelectProps) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}
        {required && <FormFieldMandatory />}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormError error={error} />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  )
}

type FormFieldTextArea = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows: number
  error?: string
  description?: string
}

export function FormFieldTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows,
  error,
  description
}: FormFieldTextArea) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(t) => onChange(t.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
      <FormError error={error} />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}      
    </div>
  )
}

type FormFieldTemplateTextArea = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows: number
  error?: string
  description?: string
}

// Template Text Area Field
export function FormFieldTemplateTextArea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows,
  error,
  description
}: FormFieldTemplateTextArea) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <TemplateTextarea
        id={id}
        value={value}
        onChange={(t) => onChange(t)}
        placeholder={placeholder}
        rows={rows}
        error={error}
      />
      <FormError error={error} />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}      
    </div>
  )
}

/**
 * Function that bundles all the fields and errors on a form. And allows us to set-up validation rules for them.
 * In order to use, just register the field and make sure to call the 'handleSubmit' as standard submit function for the form. 
 * 
 * @param initialValues Set of key value pair for the form fields and their initail values. 
 * @param rules A set of validation rules that will be applied to the field upon submit.
 * @returns 
 */
export function useValidationForm<T extends Record<string, string>>(
  initialValues: T,
  rules?: Partial<Record<keyof T, (value: string, allValues: T) => string | undefined>>
) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})

  const setField = (field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = (onValid: () => void) => (e: React.FormEvent) => {
    e.preventDefault()

    if (!rules) {
      onValid()
      return
    }

    const newErrors: Partial<Record<keyof T, string>> = {}

    for (const key in rules) {
      const rule = rules[key]
      if (!rule) continue

      const error = rule(values[key], values)
      if (error) newErrors[key] = error
      }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    onValid()
  }

  return {
    values,
    errors,
    setField,
    handleSubmit,
  }
}

export function FormFieldMandatory() {
  return (
	  <HoverCard>
			<HoverCardTrigger asChild>
        <span className="text-destructive">(*)</span>
			</HoverCardTrigger>
			<HoverCardContent className="w-auto bg-muted text-sm text-muted-foreground">
				<span>(*) This is a mandatory field</span>
			</HoverCardContent>
		</HoverCard> 
  )
}

type NumberValidationOptions = {
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
};

/**
 * A custom form validation for a number.
 * @param value The value to check.
 * @param options Options include min, max, step and required
 * @returns 
 */
export function formValidateNumber(value: string, options: NumberValidationOptions): string | undefined {

  if (options.required && value.trim() === "") {
    return "This field is required.";
  }

  if (value === "") return undefined;

  const num = Number(value);

  if (Number.isNaN(num)) {
    return "Please enter a valid number.";
  }

  if (options.min !== undefined && num < options.min) {
    return `Value must be at least ${options.min}.`;
  }

  if (options.max !== undefined && num > options.max) {
    return `Value must be at most ${options.max}.`;
  }

  if (
    options.step !== undefined &&
    ((num - (options.min ?? 0)) % options.step !== 0)
  ) {
    return `Value must be in steps of ${options.step}.`;
  }

  return undefined;
}

export function formValidateTemplateText(v: string) {
  
  if (!v.trim()) return undefined; // Empty is allowed
  
  // Extract variables and validate
  const variables = extractTemplateVariables(v);
  const invalidVars = variables.filter(varName => !VALID_TEMPLATE_VARIABLES.has(varName.trim()));
  
  if (invalidVars.length > 0) return `Invalid template variables: ${invalidVars.join(', ')}. Only predefined variables are allowed.`;
  
  // Check syntax
  const validation = validateTemplate(v);
  if (!validation.isValid) return `Template syntax errors: ${validation.errors.join(', ')}`;
  
  return undefined;
}