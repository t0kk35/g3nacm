'use client'

import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Badge } from "@/components/ui/badge"
import type { TemplateVariable, VariableCategory } from "./template-variables"
import { groupByCategory } from "./template-variables"

interface TemplateVariablePopoverProps {
  query: string;
  variables: TemplateVariable[];
  onSelect: (variable: TemplateVariable) => void;
}

export function TemplateVariablePopover({ query, variables, onSelect }: TemplateVariablePopoverProps) {
  // Filter variables based on query
  const filteredVariables = variables.filter(v =>
    v.name.toLowerCase().includes(query.toLowerCase()) ||
    v.description.toLowerCase().includes(query.toLowerCase())
  );

  // Group filtered variables by category
  const groupedVariables = groupByCategory(filteredVariables);
  const categories = Object.keys(groupedVariables) as VariableCategory[];

  // Get type badge color
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'auto-generated':
        return 'secondary';
      case 'string':
        return 'outline';
      case 'object':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <Command className="rounded-lg border shadow-md">
      <CommandList className="max-h-[300px]">
        {filteredVariables.length === 0 ? (
          <CommandEmpty>No variables found.</CommandEmpty>
        ) : (
          categories.map((category) => (
            <CommandGroup key={category} heading={category}>
              {groupedVariables[category].map((variable) => (
                <CommandItem
                  key={variable.name}
                  value={variable.name}
                  onSelect={() => onSelect(variable)}
                  className="flex flex-col items-start gap-1.5 py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      {variable.name}
                    </code>
                    <Badge variant={getTypeBadgeVariant(variable.type)} className="text-xs">
                      {variable.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {variable.description}
                  </p>
                  {variable.example && (
                    <p className="text-xs text-muted-foreground/70 font-mono">
                      Example: {variable.example}
                    </p>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
      </CommandList>
    </Command>
  );
}
