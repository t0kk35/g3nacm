'use client'

import { DynamicScreenGrid } from '@/components/ui/custom/dynamic-screen'
import { toast } from 'sonner'
import { DynamicScreenConfig } from '@/app/api/data/dynamic_screen/types'
import { createDynamicScreenWidget } from '@/components/ui/custom/dynamic-screen'
import { DynamicScreenLayoutUpdate } from '@/app/api/action/dynamic_screen/types'
import { DynamicScreenWidgetDelete, DynamicScreenWidgetCreate } from '@/app/api/action/dynamic_screen/types'
import { APIError } from '@/lib/api-error-handling'

interface DynamicScreenContainerProps {
  dynamicScreenConfig: DynamicScreenConfig
}

export function DynamicScreenContainer({ dynamicScreenConfig }: DynamicScreenContainerProps) {
  
  const layouts = dynamicScreenConfig.layout
  const widgets = dynamicScreenConfig.widget_config.map(c => createDynamicScreenWidget(c.code, c.id, c.title, c.config ))

  const handleLayoutChange = async (_layout: any, layouts: any) => {
    const layoutData: DynamicScreenLayoutUpdate = {
      name: dynamicScreenConfig.name,
      layout: layouts
    }
    try {
      const method = 'POST'
      const response = await fetch('/api/action/dynamic_screen/layout', {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(layoutData),
      });
      if (!response.ok) {
        const msg: APIError = await response.json();
        throw new Error("Failed to save layout Message : " + msg)
      }
      toast.success("Saved new layout.")
    } catch (error) {
      console.log('Error Updating layout for screen ' + dynamicScreenConfig.name + ' Error ' + error);
      toast.error('Failed to update layout')
    }
  }

  const handleWidgetRemove = async (widgetId: string) => {
    const deleteData: DynamicScreenWidgetDelete = {
      name: dynamicScreenConfig.name,
      widgetId: widgetId
    }
    
    try {
      const method = 'DELETE'
      const response = await fetch('/api/action/dynamic_screen/widget', {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(deleteData),
      });
      if (!response.ok) {
        const msg: APIError = await response.json();
        throw new Error("Failed to save layout Message : " + msg)
      }
    toast.success(`Deleted widget ${widgetId}`)
    } catch (error) {
      console.log('Error Deleting widget' + error);
      toast.error(`Error Delting widget ${widgetId}`);
    }
  }

  const handleWidgetAdd = async (widgetData: {
    widgetCode: string
    widgetName: string
    widgetConfig: Record<string, any>
  }) => {
    const createData: DynamicScreenWidgetCreate = {
      name: dynamicScreenConfig.name,
      widgetCode: widgetData.widgetCode,
      widgetName: widgetData.widgetName,
      widgetConfig: widgetData.widgetConfig
    }
    
    try {
      const response = await fetch('/api/action/dynamic_screen/widget', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createData),
      });
      
      if (!response.ok) {
        const msg: APIError = await response.json();
        throw new Error("Failed to create widget: " + msg)
      }
      
      toast.success(`Added widget: ${widgetData.widgetName}`)
    } catch (error) {
      console.log('Error creating widget:', error);
      toast.error(`Failed to add widget: ${widgetData.widgetName}`);
      throw error // Re-throw so Grid can handle the error
    }
  }

  const handleWidgetConfigure = (widgetId: string) => {
    // In a real app, show widget configuration dialog
    console.log('Configure widget:', widgetId)
  }

  return (
    <div className="w-full">
      <DynamicScreenGrid
        widgets={widgets}
        layouts={layouts}
        isEditable={true}
        onLayoutChange={handleLayoutChange}
        onWidgetRemove={handleWidgetRemove}
        onWidgetAdd={handleWidgetAdd}
        onWidgetConfigure={handleWidgetConfigure}
      />
    </div>
  )
}