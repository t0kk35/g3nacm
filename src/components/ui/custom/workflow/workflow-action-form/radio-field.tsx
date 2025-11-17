import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WorkflowFieldRendererProps } from "./workflow-action-form";

export const RadioField = ({ field, value, error, onChange }: WorkflowFieldRendererProps) => (
    <div className="space-y-2" key={field.code}>
        <Label>
            {field.label} {field.required && <span className="text-destructive">*</span>}
        </Label>
        <RadioGroup
            value={value || ""}
            onValueChange={(value) => onChange(field.code, value)}
            className="flex flex-col space-y-1"
        >
            {field.options?.map((option: any) => (
                <div className="flex items-center space-x-2" key={option.value}>
                    <RadioGroupItem value={option.value} id={`${field.code}-${option.value}`} />
                    <Label htmlFor={`${field.code}-${option.value}`}>{option.label}</Label>
                </div>
            ))}
        </RadioGroup>
        {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
);