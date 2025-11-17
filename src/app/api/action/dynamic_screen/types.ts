import { ResponsiveLayouts } from "../../data/dynamic_screen/types";

export type DynamicScreenLayoutUpdate = {
    name: string
    layout: ResponsiveLayouts
}

export type DynamicScreenWidgetDelete = {
    name: string;
    widgetId: string;
}

export type DynamicScreenWidgetCreate = {
    name: string;
    widgetCode: string;
    widgetName: string;
    widgetConfig: Record<string, any>;
}

export type DynamicScreenWidgetUpdate = {
    name: string;
    widgetId: string;
    widgetConfig: Record<string, any>;
}