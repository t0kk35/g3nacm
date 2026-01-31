import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"

type ChartTrendIndicatorProps = {
	data: number[] | undefined
}

export function ChartTrendIndicator({ data } : ChartTrendIndicatorProps) {
	const trend = calculateTrend(data);
	return (
		<>
    	{trend && (
      	<Badge variant="outline" className="text-xs">
        	{trend.direction === 'up' ? (
          		<TrendingUp className="h-3 w-3 mr-1" />
        	) : (
          		<TrendingDown className="h-3 w-3 mr-1 " />
        	)}
        	{trend.percentage}%
      	</Badge>
    	)}
		</>
	)
}

/**
 * Helper function to calculate the trend of a data-series. Used in graphs.
 * @param data The data to analyse
 * @returns a direction (up/down) and a percentage up or down.
 */
function calculateTrend(data: number[] | undefined) {
  if (!data) return undefined
  if (data.length < 2) return undefined
    
  const recent = data.slice(-3).reduce((sum, d) => sum + d, 0) / 3
  const previous = data.slice(-6, -3).reduce((sum, d) => sum + d, 0) / 3
    
  if (previous === 0) return undefined
  const change = ((recent - previous) / previous) * 100
  
	return {
    direction: change > 0 ? 'up' : 'down',
    percentage: Math.abs(change).toFixed(1)
  }
}