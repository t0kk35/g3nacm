import { z } from 'zod';
import { AIToolDefinition } from '../types';
import { authorizedFetch } from '@/lib/org-filtering';

const peerComparisonSchema = z.object({
  subjectId: z.string().describe('The subject ID to compare against their peer group'),
  timeRange: z.string().optional().default('3m').describe('Time range for analysis (e.g., "1m", "3m", "6m", "1y"). Defaults to 3 months'),
  contextDate: z.string().optional().describe('The reference date for analysis in ISO format (YYYY-MM-DD). When provided, analysis looks back from this date instead of current date. Useful for investigating historical alerts'),
  includeRaw: z.boolean().optional().default(true).describe('Include raw (non-log-transformed) metrics for human interpretation. Defaults to true'),
  includeLog: z.boolean().optional().default(true).describe('Include log-transformed metrics for AI/scoring analysis. Defaults to true')
});

const TOOL_NAME = 'transactiion-peer-comparison';

export const transactionPeerComparisonTool: AIToolDefinition = {
  name: TOOL_NAME,
  description: 'Compares a subject\'s transaction behavior against their peer group to identify unusual patterns. Peers are matched by organization unit, subject type (individual/corporate), and segment. Returns statistical analysis including means, medians, percentiles, z-scores, and outlier detection. Essential for determining if a subject\'s behavior (transaction volumes, amounts, counterparties, geographic diversity) deviates significantly from similar customers. Supports both raw metrics (for human review) and log-transformed metrics (for AI analysis of skewed distributions like transaction amounts). Use this tool to establish behavioral baselines and identify statistical anomalies.',
  inputSchema: peerComparisonSchema,
  handler: async (params) => {
    const { subjectId, timeRange, contextDate, includeRaw, includeLog } = params;

    // Build query parameters
    const queryParams = new URLSearchParams({
      subject_id: subjectId,
      time_range: timeRange || '3m',
      include_raw: String(includeRaw ?? true),
      include_log: String(includeLog ?? true)
    });

    // Add context date if provided
    if (contextDate) {
      queryParams.set('context_date', contextDate);
    }

    try {
      const response = await authorizedFetch(`${process.env.DATA_URL}/api/data/transaction/gl/peer_comparison?${queryParams.toString()}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();

      return {
        id: `peer-comparison-${subjectId}-${Date.now()}`,
        toolName: TOOL_NAME,
        data: {
          comparison: data,
          analysisParameters: {
            subjectId,
            timeRange: timeRange || '3m',
            contextDate,
            includeRaw: includeRaw ?? true,
            includeLog: includeLog ?? true,
            analysisDate: data.analysisDate
          }
        }
      };
    } catch (error) {
      console.error('Error fetching peer comparison:', error);
      return {
        id: `peer-comparison-error-${Date.now()}`,
        toolName: TOOL_NAME,
        data: {
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          subjectId,
          timeRange: timeRange || '3m',
          contextDate
        }
      };
    }
  }
};
