import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';

const schema = z.object({
  title: z.string().describe('Title of the chart'),
  subtitle: z.string().optional().describe('Subtitle of the chart'),
  description: z.string().optional().describe('Description explaining what the chart shows'),
  chartType: z.enum(['bar', 'line', 'area', 'pie', 'donut', 'scatter']).describe('Type of chart to display'),
  data: z.array(
    z.object({}).catchall(z.union([z.string(), z.number()]).describe('values to plot'))
  ).describe('Array of data points. Each object contains category/x-axis key and one or more series values'),
  xAxisKey: z.string().optional().describe('Key to use for X-axis/categories (required for bar/line/area/scatter charts)'),
  seriesKeys: z.array(z.string()).optional().describe('List of Series keys to plot (required for bar/line/area/scatter charts)'),
  valueKey: z.string().optional().describe('Key to use for values (required for pie/donut charts)'),
  nameKey: z.string().optional().describe('Key to use for names/labels (required for pie/donut charts)')
});

export const chartDisplayTool: AIToolDefinition = {
  name: 'chart-display',
  description: 'Displays interactive charts using Recharts. Supports multiple data series in bar, line, area, and scatter charts. Series are defined by chartConfig keys. Perfect for visualizing data insights for users. This tool will create a chart in the users chat. There is no need to send a chart in the text',
  inputSchema: schema,
  handler: async (params): Promise<ToolResult> => {
    const { 
      title, 
      subtitle, 
      description, 
      chartType, 
      data, 
      xAxisKey,
      seriesKeys, 
      valueKey, 
      nameKey 
    } = params;

    // Infer chartConfig from data structure
    const chartConfig = inferChartConfig(data, chartType, xAxisKey, seriesKeys, valueKey, nameKey);
    
    try {
      // Validate required keys based on chart type
      if (['bar', 'line', 'area', 'scatter'].includes(chartType)) {
        if (!xAxisKey) {
          throw new Error(`Chart type '${chartType}' requires xAxisKey`);
        }
        
        // Validate that at least one series is defined in chartConfig
        const seriesKeys = Object.keys(chartConfig).filter(key => key !== xAxisKey);
        if (seriesKeys.length === 0) {
          throw new Error(`Chart type '${chartType}' requires at least one series defined in chartConfig`);
        }
      }
      
      if (['pie', 'donut'].includes(chartType)) {
        if (!valueKey || !nameKey) {
          throw new Error(`Chart type '${chartType}' requires both valueKey and nameKey`);
        }
      }
      
      // Validate that data has the required keys
      if (data.length > 0) {
        const firstItem = data[0];
        if (xAxisKey && !(xAxisKey in firstItem)) {
          throw new Error(`xAxisKey '${xAxisKey}' not found in data`);
        }
        if (valueKey && !(valueKey in firstItem)) {
          throw new Error(`valueKey '${valueKey}' not found in data`);
        }
        if (nameKey && !(nameKey in firstItem)) {
          throw new Error(`nameKey '${nameKey}' not found in data`);
        }
        
        // For multi-series charts, validate that at least one series key exists in data
        if (['bar', 'line', 'area', 'scatter'].includes(chartType)) {
          const seriesKeys = Object.keys(chartConfig).filter(key => key !== xAxisKey);
          const hasAnySeries = seriesKeys.some(key => key in firstItem);
          if (!hasAnySeries) {
            throw new Error(`No series keys from chartConfig found in data. Available keys: ${Object.keys(firstItem).join(', ')}`);
          }
        }
      }

      return {
        id: crypto.randomUUID(),
        toolName: 'chart-display',
        data: {
          title,
          subtitle,
          description,
          chartType,
          data,
          chartConfig,
          xAxisKey,
          valueKey,
          nameKey
        },
        ui: {
          component: 'ChartDisplay',
          props: {
            title,
            subtitle,
            description,
            chartType,
            data,
            chartConfig,
            xAxisKey,
            valueKey,
            nameKey
          }
        }
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        toolName: 'chart-display',
        data: {
          title,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
        },
        ui: {
          component: 'ChartDisplay',
          props: {
            title,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          }
        }
      };
    }
  },
  uiComponent: 'ChartDisplay'
};

// Function to infer chart configuration from data
function inferChartConfig(
  data: Record<string, string | number>[],
  chartType: string,
  xAxisKey?: string,
  seriesKeys?: string[],
  valueKey?: string,
  nameKey?: string
): Record<string, { label?: string; color?: string }> {
  const config: Record<string, { label?: string; color?: string }> = {};
  
  if (data.length === 0) {
    return config;
  }
  
  const firstItem = data[0];
  
  // For pie/donut charts, generate config for each segment
  if (['pie', 'donut'].includes(chartType)) {
    if (nameKey) {
      // Get unique segment names from data
      const uniqueNames = [...new Set(data.map(item => String(item[nameKey])))];
      
      // Generate config for each segment
      uniqueNames.forEach((name, index) => {
        const colorIndex = (index % 12) + 1; // Support up to 12 colors
        const color = `var(--chart-${colorIndex})`;
        
        config[name] = { 
          label: name,
          color 
        };
      });
    }
    return config;
  }
  
  // Generate config for each series key
  seriesKeys && seriesKeys.forEach((key, index) => {
    // Convert camelCase/snake_case to readable labels
    const label = key
      .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
      .replace(/_/g, ' ') // snake_case to spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // capitalize words
    
    // Assign chart color variables (cycling through available colors)
    const colorIndex = (index % 12) + 1; // Support up to 12 colors
    const color = `var(--chart-${colorIndex})`;
    
    config[key] = { label, color };
  });
  
  return config;
}
