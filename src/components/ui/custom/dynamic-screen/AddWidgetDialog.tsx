'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Plus } from 'lucide-react'
import { widgetRegistry, WIDGET_CATEGORIES } from './widget-registry'
import { DynamicScreenWidgetConfigForm } from './DynamicScreenWidgetConfigForm'
import type { WidgetDefinition } from './widget-registry'

interface AddWidgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddWidget: (widgetData: {
    widgetCode: string
    widgetName: string
    widgetConfig: Record<string, any>
  }) => Promise<void>
  userPermissions?: string[]
}

type DialogStep = 'selection' | 'configuration'

export function AddWidgetDialog({ 
  open, 
  onOpenChange, 
  onAddWidget,
  userPermissions = []
}: AddWidgetDialogProps) {
  const [currentStep, setCurrentStep] = useState<DialogStep>('selection')
  const [selectedWidget, setSelectedWidget] = useState<WidgetDefinition | null>(null)
  const [widgetTitle, setWidgetTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get available widgets based on user permissions
  const availableWidgets = userPermissions.length > 0 
    ? widgetRegistry.getByPermission(userPermissions)
    : widgetRegistry.getAll()

  // Group widgets by category
  const widgetsByCategory = availableWidgets.reduce((acc, widget) => {
    const category = widget.category || WIDGET_CATEGORIES.OTHER
    if (!acc[category]) acc[category] = []
    acc[category].push(widget)
    return acc
  }, {} as Record<string, WidgetDefinition[]>)

  const handleWidgetSelect = (widget: WidgetDefinition) => {
    setSelectedWidget(widget)
    setWidgetTitle(widget.name)
    setCurrentStep('configuration')
  }

  const handleBackToSelection = () => {
    setCurrentStep('selection')
    setSelectedWidget(null)
    setWidgetTitle('')
  }

  const handleConfigSubmit = async (config: Record<string, any>) => {
    if (!selectedWidget) return

    setIsSubmitting(true)
    try {
      await onAddWidget({
        widgetCode: selectedWidget.code,
        widgetName: widgetTitle,
        widgetConfig: {
          ...config,
          title: widgetTitle // Ensure title is included in config
        }
      })
      
      // Reset dialog state
      setCurrentStep('selection')
      setSelectedWidget(null)
      setWidgetTitle('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to add widget:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (currentStep === 'configuration') {
      handleBackToSelection()
    } else {
      onOpenChange(false)
    }
  }

  const getCategoryDisplayName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'configuration' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBackToSelection}
                className="p-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {currentStep === 'selection' ? 'Add Widget' : `Configure ${selectedWidget?.name}`}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'selection' 
              ? 'Choose a widget to add to your dashboard'
              : 'Configure your widget settings'
            }
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'selection' && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6">
              {Object.entries(widgetsByCategory).map(([category, widgets]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">
                    {getCategoryDisplayName(category)}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {widgets.map((widget) => (
                      <Card 
                        key={widget.code}
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleWidgetSelect(widget)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base">{widget.name}</CardTitle>
                            <Button size="sm" variant="ghost" className="p-1">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardDescription className="text-sm">
                            {widget.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                          <div className="flex flex-wrap gap-1">
                            {widget.tags?.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {category !== Object.keys(widgetsByCategory)[Object.keys(widgetsByCategory).length - 1] && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {currentStep === 'configuration' && selectedWidget && (
          <div className="flex flex-col h-[60vh]">
            <div className="space-y-4 pb-4 border-b">
              <div className='space-y-2'>
                <Label htmlFor="widget-title">Widget Title</Label>
                <Input
                  id="widget-title"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  placeholder="Enter widget title"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-hidden pt-4">
              <h4 className="font-medium mb-3">Widget Configuration</h4>
              <div className="flex-1 min-h-0">
                <DynamicScreenWidgetConfigForm
                  schema={selectedWidget.configSchema}
                  defaultValues={selectedWidget.defaultConfig}
                  onSubmit={handleConfigSubmit}
                  onCancel={handleCancel}
                  submitLabel="Add Widget"
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}