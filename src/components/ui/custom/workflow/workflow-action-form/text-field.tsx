import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { WorkflowFieldRendererProps } from "./workflow-action-form";

export const TextField = ({ field, value, error, onChange }: WorkflowFieldRendererProps) => (
    <div className="space-y-2" key={field.code}>
      <Label htmlFor={field.code}>
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
      <Input
        id={field.code}
        name={field.code}
        placeholder={field.placeholder}
        value={value || ""}
        onChange={(e) => onChange(field.code, e.target.value)}
        className={error ? "border-destructive" : ""}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )