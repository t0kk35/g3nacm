'use client'

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'

interface WidgetConfigFormProps {
  schema: z.ZodType<any, any, any>
  defaultValues: Record<string, any>
  onSubmit: (config: Record<string, any>) => void
  onCancel?: () => void
  submitLabel?: string
  isSubmitting?: boolean
}

export function DynamicScreenWidgetConfigForm({
  schema,
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isSubmitting = false
}: WidgetConfigFormProps) {
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues
  })

  const renderField = (key: string, fieldSchema: z.ZodTypeAny, value: any) => {
    
    const fieldType = fieldSchema._def

    // Handle Zod default() wrapper
    if (fieldType.typeName === 'ZodDefault') {
      return renderField(key, fieldSchema._def.innerType, value)
    }

    // Handle Zod optional() wrapper
    if (fieldType.typeName === 'ZodOptional') {
      return renderField(key, fieldSchema._def.innerType, value)
    }

    return (
      <FormField
        key={key}
        control={form.control}
        name={key}
        render={({ field }) => (
          <FormItem>
            <FormLabel className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</FormLabel>
            <FormControl>
              {(() => {
                switch (fieldType.typeName) {
                  case 'ZodString':
                    // Check if it's a long text field based on key name
                    if (key.toLowerCase().includes('description') || key.toLowerCase().includes('content')) {
                      return <Textarea {...field} />
                    }
                    return <Input {...field} />

                  case 'ZodNumber':
                    return <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />

                  case 'ZodBoolean':
                    return (
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    )

                  case 'ZodEnum':
                    return (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${key}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldSchema._def.values.map((option: string) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )

                  case 'ZodArray':
                    const arrayType = fieldSchema._def.type
                    
                    // Handle array of enums (checkboxes)
                    if (arrayType._def?.typeName === 'ZodEnum') {
                      const options = arrayType._def.values
                      return (
                        <div className="space-y-2">
                          {options.map((option: string) => (
                            <div key={option} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value?.includes(option) || false}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || []
                                  if (checked) {
                                    field.onChange([...currentValue, option])
                                  } else {
                                    field.onChange(currentValue.filter((v: string) => v !== option))
                                  }
                                }}
                              />
                              <label className="text-sm">{option}</label>
                            </div>
                          ))}
                        </div>
                      )
                    }
                    
                    // For other array types, fall back to textarea
                    return (
                      <Textarea
                        {...field}
                        value={Array.isArray(field.value) ? field.value.join(', ') : field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                          field.onChange(value)
                        }}
                        placeholder="Enter values separated by commas"
                      />
                    )

                  default:
                    // Fallback to text input
                    return <Input {...field} />
                }
              })()}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  }

  const handleSubmit = (data: Record<string, any>) => {
    onSubmit(data)
  }

  // Get the schema shape to render fields
  let schemaShape: Record<string, any> = {}
  
  // Try different ways to get the schema shape. I initally had problems if the schema was not cached.
  if ((schema as any)._cached?.shape) {
    schemaShape = (schema as any)._cached.shape
  } else if (schema._def.shape) {
    // If shape is a function, call it
    if (typeof schema._def.shape === 'function') {
      schemaShape = schema._def.shape()
    } else {
      schemaShape = schema._def.shape
    }
  } else if (schema._def.typeName === 'ZodObject') {
    // Try to parse the schema to generate the cache
    try {
      schema.safeParse({})
      schemaShape = (schema as any)._cached?.shape || {}
    } catch (e) {
      schemaShape = {}
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {Object.entries(schemaShape)
            .filter(([key]) => key !== 'title') // Exclude title field since it's handled separately
            .map(([key, fieldSchema]) =>
              renderField(key, fieldSchema as z.ZodTypeAny, defaultValues[key])
            )}
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t mt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}