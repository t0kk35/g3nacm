'use client'

import { useState, useEffect, useCallback } from 'react'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Plus, Lock, Unlock } from 'lucide-react'
import { DynamicScreenWidget } from './widget-registry'
import { AddWidgetDialog } from './AddWidgetDialog'
import { createDynamicScreenWidget } from './widget-registry'
import { DynamicScreenWidgetSizeObserver } from './DynamicScreenWidgetSizeObserver'

const ResponsiveGridLayout = WidthProvider(Responsive)

export interface DynamicScreenGridProps {
  widgets: DynamicScreenWidget[]
  layouts?: { [key: string]: Layout[] }
  isEditable?: boolean
  onLayoutChange?: (layout: Layout[], layouts: { [key: string]: Layout[] }) => void
  onWidgetRemove?: (widgetId: string) => void
  onWidgetAdd?: (widgetData: {
    widgetCode: string
    widgetName: string
    widgetConfig: Record<string, any>
  }) => Promise<void>
  onWidgetConfigure?: (widgetId: string) => void
  className?: string
}

export function DynamicScreenGrid({
  widgets,
  layouts = {},
  isEditable = false,
  onLayoutChange,
  onWidgetRemove,
  onWidgetAdd,
  onWidgetConfigure,
  className = ''
}: DynamicScreenGridProps) {
  const [currentWidgets, setCurrentWidgets] = useState<DynamicScreenWidget[]>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentLayouts, setCurrentLayouts] = useState<{ [key: string]: Layout[] }>({})
  const [mounted, setMounted] = useState(false)
  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false)

  // Generate default layout from widgets with responsive constraints
  const generateDefaultLayout = useCallback((breakpoint: 'lg' | 'md' | 'sm' | 'xs') => {
    const cols = breakpoint === 'lg' ? 12 : breakpoint === 'md' ? 10 : breakpoint === 'sm' ? 6 : 4
    const itemWidth = breakpoint === 'lg' ? 3 : breakpoint === 'md' ? 3 : breakpoint === 'sm' ? 3 : 2

    return widgets.map((widget, index) => ({
      i: widget.id,
      x: (index % Math.floor(cols / itemWidth)) * itemWidth,
      y: Math.floor(index / Math.floor(cols / itemWidth)) * 2,
      w: widget.responsiveConstraints[breakpoint].minW,
      h: widget.responsiveConstraints[breakpoint].minH,
      minW: widget.responsiveConstraints[breakpoint].minW,
      minH: widget.responsiveConstraints[breakpoint].minW,
      maxW: widget.responsiveConstraints[breakpoint].maxW,
      maxH: widget.responsiveConstraints[breakpoint].maxH
    }))
  }, [widgets])

  // Initialize layouts on mount
  useEffect(() => {
    if (mounted) {
      const initialLayouts = {
        lg: layouts.lg && layouts.lg.length > 0 ? layouts.lg : generateDefaultLayout('lg'),
        md: layouts.md && layouts.md.length > 0 ? layouts.md : generateDefaultLayout('md'),
        sm: layouts.sm && layouts.sm.length > 0 ? layouts.sm : generateDefaultLayout('sm'),
        xs: layouts.xs && layouts.xs.length > 0 ? layouts.xs : generateDefaultLayout('xs')
      }
      setCurrentWidgets(widgets);
      setCurrentLayouts(initialLayouts);
    }
  }, [mounted, widgets, layouts, generateDefaultLayout])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLayoutChange = useCallback((layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    // The onLayoutChange gets called a lot, on mount, resizes, deletes etc... 
    // Only call the parent save when in edit mode and something actually changed.
    if (isEditMode && (JSON.stringify(currentLayouts) !== JSON.stringify(layouts))) {
      setCurrentLayouts(layouts)
      onLayoutChange?.(layout, layouts)
    }
  }, [onLayoutChange, isEditMode])

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
  }

  const handleWidgetRemove = (widgetId: string) => {
    // Remove the widget from the widget list
    setCurrentWidgets(prev => prev.filter(w => w.id !== widgetId));
    // Remove the widget from the layouts. This will trigger onlayoutChange.
    setCurrentLayouts(prev => {
      const newLayouts = { ...prev };
      for (const breakpoint in newLayouts) {
        newLayouts[breakpoint] = newLayouts[breakpoint].filter(item => item.i !== widgetId);
      }
      return newLayouts;
    });
    onWidgetRemove?.(widgetId)
  }

  const handleWidgetConfigure = (widgetId: string) => {
    onWidgetConfigure?.(widgetId)
  }

  const handleAddWidget = async (widgetData: {
    widgetCode: string
    widgetName: string
    widgetConfig: Record<string, any>
  }) => {
    if (!onWidgetAdd) return

    try {
      // Call API to create widget
      await onWidgetAdd(widgetData)
      
      // Generate widget ID (consistent with API logic) and create widget
      const newWidgetId = `${widgetData.widgetCode}-1`
      const newWidget = createDynamicScreenWidget(widgetData.widgetCode, newWidgetId, 'test', widgetData.widgetConfig)
      
      // Find a good position for the new widget
      const findNextPosition = (id: string, widget: DynamicScreenWidget, breakpoint: 'lg' | 'md' | 'sm' | 'xs') => {
        const existingLayouts = currentLayouts[breakpoint] || []
        const defaultWidth = breakpoint === 'lg' ? 3 : breakpoint === 'md' ? 3 : breakpoint === 'sm' ? 3 : 2
        
        // Find the bottom-most Y position
        const maxY = existingLayouts.reduce((max, item) => Math.max(max, item.y + item.h), 0)
        
        // Get the widget constraints
        const constraints = widget.responsiveConstraints[breakpoint]

        return {
          i: id,
          x: 0,
          y: maxY,
          w: constraints ? constraints.minW : defaultWidth,
          h: constraints ? constraints.minH : 4,
          minW: constraints ? constraints.minW : 1,
          maxW: constraints ? constraints.maxW : 12,
          minH: constraints ? constraints.minH : 1,
          maxH: constraints ? constraints.maxH : 6
        }
      }
      
      // Display the widget.
      setCurrentWidgets(prev => [...prev, newWidget]);

      // Update the layouts
      setCurrentLayouts(prev => ({
        lg: [...prev.lg, findNextPosition(newWidgetId, newWidget, 'lg')],
        md: [...prev.md, findNextPosition(newWidgetId, newWidget, 'md')],
        sm: [...prev.sm, findNextPosition(newWidgetId, newWidget, 'sm')],
        xs: [...prev.xs, findNextPosition(newWidgetId, newWidget, 'xs')]       
      }));

    } catch (error) {
      console.error('Failed to add widget:', error)
      // Error handling is done in the parent component
    }
  }

  // Don't render until mounted to avoid SSR issues
  if (!mounted) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              <Settings className="h-4 w-4 mr-2" />
              Loading...
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Loading skeletons */}
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="h-64 animate-pulse bg-accent/10" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Dashboard</h2>
        {isEditable && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleEditMode}
            >
              {isEditMode ? (
                <>
                  <Unlock className="text-chart-1 h-4 w-4 mr-2" />
                  Edit Mode
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Locked
                </>
              )}
            </Button>
            {onWidgetAdd && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAddWidgetDialogOpen(true)}
                disabled={!isEditMode}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Widget
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={currentLayouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={60}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {currentWidgets.map((widget) => (
          <div key={widget.id} className="dashboard-widget">
            <Card className="h-full relative group">
              {/* Widget Controls - only show in edit mode */}
              {isEditMode && (
                <div className="absolute top-2 right-2 z-10 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWidgetConfigure(widget.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="h-6 w-6 p-0"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleWidgetRemove(widget.id)}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              )}

              {/* Widget Content */}
              <DynamicScreenWidgetSizeObserver>
                {({ width, height }) => (
                  <widget.component {...widget.config} width={width} height={height} />
                )}
              </DynamicScreenWidgetSizeObserver>
              {/* Widget Content 
              <div className="h-full">
                <widget.component {...widget.config} />
              </div> */}
            </Card>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground mb-4">
            <Settings className="h-12 w-12 mx-auto mb-2" />
            <p>No widgets configured</p>
          </div>
          {onWidgetAdd && (
            <Button onClick={() => setAddWidgetDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Widget
            </Button>
          )}
        </div>
      )}

      {/* Add Widget Dialog */}
      <AddWidgetDialog 
        open={addWidgetDialogOpen}
        onOpenChange={setAddWidgetDialogOpen}
        onAddWidget={handleAddWidget}
        userPermissions={[]} // TODO: Pass actual user permissions if needed
      />
    </div>
  )
}