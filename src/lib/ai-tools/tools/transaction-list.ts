import { z } from 'zod';
import { AIToolDefinition } from '../types';
import { objectToCSV } from '@/lib/json';
import { authorizedFetch } from '@/lib/org-filtering';

const transactionListSchema = z.object({
  subjectId: z.string().describe('The subject ID to get transactions for'),
  fromDate: z.string().optional().describe('Start date in ISO format (e.g., "2024-01-01")'),
  toDate: z.string().optional().describe('End date in ISO format (e.g., "2024-12-31")'),
  bookingTypes: z.array(z.string()).optional().describe('Filter by booking types'),
  creditDebit: z.enum(['D', 'C']).optional().describe('Filter by debit (D) or credit (C) transactions'),
  currencies: z.array(z.string()).optional().describe('Filter by currencies (base or original)'),
  channels: z.array(z.string()).optional().describe('Filter by transaction channels'),
  counterPartyCountries: z.array(z.string()).optional().describe('Filter by counterparty countries'),
  counterPartyName: z.string().optional().describe('Filter by counterparty name (partial match)'),
  minAmount: z.number().optional().describe('Minimum transaction amount'),
  maxAmount: z.number().optional().describe('Maximum transaction amount'),
  format: z.enum(['json', 'csv']).default('json').describe('Output format - JSON for data analysis, CSV for export'),
  orderBy: z.enum(['submit_date_time', 'amount_base', 'amount_orig']).default('submit_date_time').describe('Field to order by'),
  orderDirection: z.enum(['asc', 'desc']).default('desc').describe('Sort direction'),
  limit: z.number().min(1).max(10000).default(1000).describe('Maximum number of transactions to return (max 10,000)')
});

export const transactionListTool: AIToolDefinition = {
  name: 'transaction-list',
  description: 'Retrieve detailed GL transactions with advanced filtering options. Supports filtering by date range, amounts, counterparties, countries, booking types, and more. Can return data in JSON format for analysis or CSV format for export. Essential for detailed transaction investigation and evidence gathering.',
  inputSchema: transactionListSchema,
  handler: async (params) => {
    const { 
      subjectId, fromDate, toDate, bookingTypes, creditDebit, currencies, 
      channels, counterPartyCountries, counterPartyName, minAmount, maxAmount,
      format, orderBy, orderDirection, limit 
    } = params;
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      subject_id: subjectId,
      order_by: orderBy,
      order_direction: orderDirection,
      limit: limit.toString()
    });
    
    if (fromDate) queryParams.append('from_date', fromDate);
    if (toDate) queryParams.append('to_date', toDate);
    if (bookingTypes && bookingTypes.length > 0) queryParams.append('booking_types', bookingTypes.join(','));
    if (creditDebit) queryParams.append('credit_debit', creditDebit);
    if (currencies && currencies.length > 0) queryParams.append('currencies', currencies.join(','));
    if (channels && channels.length > 0) queryParams.append('channels', channels.join(','));
    if (counterPartyCountries && counterPartyCountries.length > 0) queryParams.append('counter_party_countries', counterPartyCountries.join(','));
    if (counterPartyName) queryParams.append('counter_party_name', counterPartyName);
    if (minAmount !== undefined) queryParams.append('min_amount', minAmount.toString());
    if (maxAmount !== undefined) queryParams.append('max_amount', maxAmount.toString());
    
    try {
      const response = await authorizedFetch(`${process.env.DATA_URL}/api/data/transaction/gl/list?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Flatten transactions for easier analysis and CSV conversion
      const flattenedTransactions = data.transactions.map((transaction: any) => ({
        id: transaction.id,
        submit_date_time: transaction.submit_date_time,
        identifier: transaction.identifier,
        org_unit_code: transaction.org_unit_code,
        type: transaction.type,
        // Flatten type_specific object
        ...transaction.type_specific
      }));
      
      let responseData: any = {
        transactions: flattenedTransactions,
        totalCount: data.totalCount,
        format: format,
        appliedFilters: data.filters,
        queryParameters: {
          subjectId,
          fromDate,
          toDate,
          bookingTypes,
          creditDebit,
          currencies,
          channels,
          counterPartyCountries,
          counterPartyName,
          minAmount,
          maxAmount,
          orderBy,
          orderDirection,
          limit
        }
      };
      
      // Convert to CSV if requested
      if (format === 'csv') {
        const csvData = objectToCSV(flattenedTransactions);
        responseData.csvData = csvData;
        responseData.downloadInfo = {
          filename: `transactions_${subjectId}_${new Date().toISOString().split('T')[0]}.csv`,
          size: csvData.length,
          rowCount: flattenedTransactions.length
        };
      }
      
      return {
        id: `transaction-list-${subjectId}-${Date.now()}`,
        toolName: 'transaction-list',
        data: responseData
      };
      
    } catch (error) {
      console.error('Error fetching transaction list:', error);
      return {
        id: `transaction-list-error-${Date.now()}`,
        toolName: 'transaction-list',
        data: {
          error: 'Failed to fetch transaction list',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
};