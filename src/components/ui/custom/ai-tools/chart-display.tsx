import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { 
  Bar, 
  BarChart, 
  Line, 
  LineChart, 
  Area, 
  AreaChart, 
  Pie, 
  PieChart, 
  Scatter, 
  ScatterChart, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

interface ChartDisplayProps {
  title: string;
  subtitle?: string;
  description?: string;
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter';
  data: Array<Record<string, string | number>>;
  chartConfig: ChartConfig;
  xAxisKey?: string;
  valueKey?: string;
  nameKey?: string;
  error?: string;
}

export function ChartDisplay({ 
  title, 
  subtitle, 
  description, 
  chartType, 
  data, 
  chartConfig, 
  xAxisKey, 
  valueKey, 
  nameKey, 
  error 
}: ChartDisplayProps) {
  if (error) {
    return (
      <Card className="w-full max-w-4xl border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Chart Display Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const getSeriesKeys = () => {
    if (['pie', 'donut'].includes(chartType)) {
      return [];
    }
    return Object.keys(chartConfig).filter(key => key !== xAxisKey);
  };

  const seriesKeys = getSeriesKeys();

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={{ fill: `var(--color-${key})` }}
              />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`var(--color-${key})`}
                fill={`var(--color-${key})`}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'scatter':
        return (
          <ScatterChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {seriesKeys.map((key) => (
              <Scatter
                key={key}
                dataKey={key}
                fill={`var(--color-${key})`}
              />
            ))}
          </ScatterChart>
        );

      case 'pie':
      case 'donut':
        const COLORS = Object.keys(chartConfig).map(key => `var(--color-${key})`);
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={chartType === 'donut' ? 80 : 120}
              innerRadius={chartType === 'donut' ? 60 : 0}
              fill="#8884d8"
              dataKey={valueKey!}
              nameKey={nameKey!}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        );

      default:
        return <div>Unsupported chart type: {chartType}</div>;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {title}
        </CardTitle>
        {subtitle && <CardDescription>{subtitle}</CardDescription>}
        {description && (
          <div className="text-sm text-muted-foreground mt-2">
            {description}
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No data available to display</p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            {renderChart()}
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}