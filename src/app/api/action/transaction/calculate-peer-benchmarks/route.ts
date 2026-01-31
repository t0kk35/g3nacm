import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pool } from '@/db';
import { ErrorCreators } from '@/lib/api-error-handling';

const origin = 'api/action/transaction/calculate-peer-benchmarks';

interface CalculatePeerBenchmarksRequest {
  mode: 'single' | 'batch';
  targetDate?: string; // YYYY-MM-DD for single mode
  startDate?: string; // YYYY-MM-DD for batch mode
  endDate?: string; // YYYY-MM-DD for batch mode
}

interface BatchResult {
  processingDate: string;
  peerGroupsCalculated: number;
  executionTime: string;
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const session = await auth();
    if (!session) {
      return ErrorCreators.auth.missingSession(origin);
    }

    if (!session.user?.name) {
      return ErrorCreators.auth.missingUser(origin);
    }

    // Parse request body
    let body: CalculatePeerBenchmarksRequest;
    try {
      body = await request.json();
    } catch (error) {
      return ErrorCreators.param.bodyMissing(origin, 'request body');
    }

    // Validate mode parameter
    if (!body.mode || !['single', 'batch'].includes(body.mode)) {
      return ErrorCreators.param.typeInvalid(
        origin,
        'mode',
        'single | batch',
        body.mode
      );
    }

    // Validate mode-specific parameters
    if (body.mode === 'single') {
      // Single mode: use targetDate or default to yesterday
      const targetDate =
        body.targetDate ||
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      try {
        // Call single date function
        const result = await pool.query<{ calculate_calculate_txn_peer_comparison: number }>(
          'SELECT calculate_calculate_txn_peer_comparison($1) as calculate_calculate_txn_peer_comparison',
          [targetDate]
        );

        const recordsCalculated = result.rows[0]?.calculate_calculate_txn_peer_comparison || 0;

        return NextResponse.json(
          {
            status: 'success',
            mode: 'single',
            recordsCalculated,
            targetDate,
            message: `Successfully calculated ${recordsCalculated} peer group benchmarks for ${targetDate}`,
          },
          { status: 200 }
        );
      } catch (error) {
        return ErrorCreators.db.queryFailed(origin, 'calculate peer benchmarks (single)', error as Error);
      }
    } else {
      // Batch mode: require startDate, endDate is optional
      if (!body.startDate) {
        return ErrorCreators.param.bodyMissing(
          origin,
          'startDate (required for batch mode)'
        );
      }

      const startDate = body.startDate;
      const endDate = body.endDate || null;

      try {
        // Call batch function
        const result = await pool.query<{
          processing_date: string;
          peer_groups_calculated: number;
          execution_time: string;
        }>(
          'SELECT * FROM calculate_calculate_txn_peer_comparison_batch($1, $2)',
          [startDate, endDate]
        );

        const batchResults: BatchResult[] = result.rows.map((row) => ({
          processingDate: row.processing_date,
          peerGroupsCalculated: row.peer_groups_calculated,
          executionTime: row.execution_time,
        }));

        const totalRecords = batchResults.reduce(
          (sum, r) => sum + r.peerGroupsCalculated,
          0
        );

        return NextResponse.json(
          {
            status: 'success',
            mode: 'batch',
            recordsCalculated: totalRecords,
            batchResults,
            startDate,
            endDate: endDate || startDate,
            message: `Successfully calculated peer group benchmarks for ${batchResults.length} dates`,
          },
          { status: 200 }
        );
      } catch (error) {
        return ErrorCreators.db.queryFailed(origin, 'calculate peer benchmarks (batch)', error as Error);
      }
    }
  } catch (error) {
    console.error('Error in calculate-peer-benchmarks:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
