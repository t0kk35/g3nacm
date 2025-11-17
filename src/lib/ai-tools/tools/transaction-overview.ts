import { z } from 'zod';
import { AIToolDefinition } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';

const transactionOverviewSchema = z.object({
  subjectId: z.string().describe('The subject ID to analyze transactions for'),
  contextDate: z.string().optional().describe('The reference date for analysis in ISO format (YYYY-MM-DD). When provided, analysis looks back from this date instead of current date. Useful for investigating historical alerts.'),
  periods: z.object({
    daily: z.string().default('7d').describe('Number of days for daily analysis (e.g., "7d", "14d")'),
    weekly: z.string().default('4w').describe('Number of weeks for weekly analysis (e.g., "4w", "8w")'),
    monthly: z.string().default('6m').describe('Number of months for monthly analysis (e.g., "6m", "12m")')
  }).optional().describe('Period configuration for multi-frequency aggregate analysis. Defaults to 7 days, 4 weeks, 6 months')
});

export const transactionOverviewTool: AIToolDefinition = {
  name: 'transaction-overview',
  description: 'Get a comprehensive multi-frequency analysis of a customer\'s transaction patterns for AML risk assessment. Provides daily, weekly, and monthly behavioral analysis including volume patterns, risk indicators, and geographic distribution. Uses calendar-aligned periods (daily, weekly, monthly) for accurate pattern detection. Supports historical analysis by specifying a context date to analyze patterns as they were at a specific point in time.',
  inputSchema: transactionOverviewSchema,
  handler: async (params) => {
    const { subjectId, contextDate, periods } = params;
    
    // Default periods if not provided
    const defaultPeriods = {
      daily: '7d',
      weekly: '4w',
      monthly: '6m'
    };
    
    const analysisPeriods = periods || defaultPeriods;
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      subject_id: subjectId,
      periods: JSON.stringify(analysisPeriods)
    });
    
    // Add context date if provided
    if (contextDate) {
      queryParams.set('context_date', contextDate);
    }
    
    try {
      const response = await authorizedFetch(`${process.env.DATA_URL}/api/data/transaction/gl/overview?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        id: `transaction-overview-${subjectId}-${Date.now()}`,
        toolName: 'transaction-overview',
        data: {
          overview: data,
          analysisParameters: {
            subjectId,
            contextDate,
            periods: analysisPeriods,
            analysisDate: data.analysisDate
          }
        }
      };
    } catch (error) {
      console.error('Error fetching transaction overview:', error);
      return {
        id: `transaction-overview-error-${Date.now()}`,
        toolName: 'transaction-overview',
        data: {
          error: 'Failed to fetch transaction overview',
          details: error instanceof Error ? error.message : 'Unknown error',
          subjectId,
          requestedPeriods: analysisPeriods
        }
      };
    }
  }
};