import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { WorkflowFieldRendererProps } from "./workflow-action-form";

export const CheckBoxField = ({ field, value, error, onChange }: WorkflowFieldRendererProps) => (
    <div className="flex items-center space-x-2" key={field.code}>
        <Checkbox
            id={field.code}
            checked={value || false}
            onCheckedChange={(checked) => onChange(field.code, checked)}
        />
        <Label htmlFor={field.code}>
            {field.label} {field.required && <span className="text-destructive">*</span>}
        </Label>
        {error && <p className="text-xs text-destructive ml-2">{error}</p>}
    </div>
);