import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WorkflowFieldRendererProps } from "./workflow-action-form";

export const SelectField = ({ field, value, error, onChange }: WorkflowFieldRendererProps) => (
    <div className="space-y-2" key={field.code}>
    <Label htmlFor={field.code}>
      {field.label} {field.required && <span className="text-destructive">*</span>}
    </Label>
    <Select value={value || ""} onValueChange={(e) => onChange(field.code, e)}>
      <SelectTrigger id={field.code} className={error ? "border-destructive" : ""}>
        <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((option: any) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
)