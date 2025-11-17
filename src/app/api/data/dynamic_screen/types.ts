export type DynamicScreenWidgetLayout = {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW: number;
    minH: number;
    maxW: number;
    maxH: number;
}

export type DynamicScreenWidgetConfig = {
  id: string,
  code: string;
  title: string;
  config: Record<string, any>;
}

export type ResponsiveLayouts = {
    lg: DynamicScreenWidgetLayout[];
    md: DynamicScreenWidgetLayout[];
    sm: DynamicScreenWidgetLayout[];
    xs: DynamicScreenWidgetLayout[];
}

export type DynamicScreenConfig = {
    name: string;
    widget_config: DynamicScreenWidgetConfig[];
    layout: ResponsiveLayouts;
}
