import { useState, useEffect } from 'react';
import { WorkflowFieldRendererProps } from "./workflow-action-form";
import { Loader2, ChevronDown } from "lucide-react";
import { Label } from '@/components/ui/label';

import { Popover, PopoverTrigger, PopoverContent } from "@radix-ui/react-popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generic props
interface SelectFieldProps<T> extends WorkflowFieldRendererProps {
    fetchOptions: () => Promise<T[]>;
    getLabel: (item: T) => string;
    getDescription?: (item: T) => string;
    loadingText?: string;
    emptyText?: string;
}

export const DynamicSelectField = <T extends { name: string }> ({ field, value, error, onChange, fetchOptions, getLabel, getDescription, loadingText = "Loading...", emptyText = "No results found."}: SelectFieldProps<T>) => {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<T | null>(null);
    const [options, setOptions] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOptions()
            .then(data => {
                setOptions(data);
                setLoading(false);
            })
            .catch(err => {
                error = err.message;
                setLoading(false);
            });
    }, [field.code]);

    // Set selected option when value is pre-populated
    useEffect(() => {
        if (value && options.length > 0 && !selected) {
            const matchedOption = options.find(option => option.name === value);
            if (matchedOption) {
                setSelected(matchedOption);
            }
        }
    }, [value, options, selected]);

    const handleSelect = (item: T) => {
        setSelected(item);
        setOpen(false);
        value = item.name;
        onChange(field.code, item.name);
    }

    return (
        <div className="space-y-2" key={field.code}>
            <Label htmlFor={field.code}>
                {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            {loading ? (
                <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">{loadingText}</span>
                </div>
            ) : (
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between bg-background"
                        >
                            {selected ? getLabel(selected) : field.placeholder}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                        <Command>
                            <CommandInput placeholder="Search..." />
                            <CommandList>
                                <CommandEmpty>{emptyText}</CommandEmpty>
                                <CommandGroup className="max-h-60 overflow-auto">
                                    {options.map((item) => (
                                        <CommandItem
                                            key={item.name}
                                            value={item.name}
                                            onSelect={() => handleSelect(item)}
                                            className="flex items-center justify-between"
                                        >
                                            <div>
                                                <span>{getLabel(item)}</span>
                                                {getDescription && (
                                                    <p className="text-xs text-muted-foreground">
                                                        {getDescription(item)}
                                                    </p>
                                                )}
                                            </div>
                                            {selected?.name === item.name && (
                                                <Check className="h-4 w-4 text-primary" />
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
};