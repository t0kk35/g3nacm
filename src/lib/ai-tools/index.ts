// Tool registry and initialization
import { toolRegistry } from './registry';
import { fetchCustomerHistoryTool } from './tools/fetch-customer-history';
import { createTimelineTool } from './tools/create-timeline';
import { fetchAlertDetailTool } from './tools/fetch-alert-details';
import { fetchSubjectDetailTool } from './tools/fetch-subject-detail';
import { fetchSubjectHistoryTool } from './tools/fetch-subject-history';
import { fetchSubjectEventsTool } from './tools/fetch-subject-events';
import { fetchNextWorkflowAction } from './tools/fetch-next-workflow-action';
import { todoListTool } from './tools/todo-list';
import { transactionOverviewTool } from './tools/transaction-overview';
import { transactionAggregationTool } from './tools/transaction-aggregation';
import { transactionListTool } from './tools/transaction-list';
import { chartDisplayTool } from './tools/chart-display';
import { subjectDisplayTool } from './tools/subject-display';
import { fetchAttachmentListTool } from './tools/fetch-attachment-list';
import { fetchAttachmentDetailTool } from './tools/fetch-attachment-detail';
import { executeWorkflowActionTool } from './tools/execute-workflow-action';
import { searchUser } from './tools/search-user';
import { transactionPeerComparisonTool } from './tools/transaction-peer-comparison';

// Register all tools
toolRegistry.registerTool(fetchCustomerHistoryTool);
toolRegistry.registerTool(createTimelineTool);
toolRegistry.registerTool(fetchAlertDetailTool);
toolRegistry.registerTool(fetchSubjectDetailTool);
toolRegistry.registerTool(fetchSubjectHistoryTool);
toolRegistry.registerTool(fetchSubjectEventsTool);
toolRegistry.registerTool(fetchNextWorkflowAction);
toolRegistry.registerTool(todoListTool);
toolRegistry.registerTool(transactionOverviewTool);
toolRegistry.registerTool(transactionAggregationTool);
toolRegistry.registerTool(transactionListTool);
toolRegistry.registerTool(chartDisplayTool);
toolRegistry.registerTool(subjectDisplayTool);
toolRegistry.registerTool(fetchAttachmentListTool);
toolRegistry.registerTool(fetchAttachmentDetailTool);
toolRegistry.registerTool(executeWorkflowActionTool);
toolRegistry.registerTool(searchUser);
toolRegistry.registerTool(transactionPeerComparisonTool);

// Export main interfaces
export { toolRegistry } from './registry';
export { substituteTemplate, getDefaultContext, mergeContexts } from './template-utils';
export { executeAgent } from './agent-executors';
export type { AIToolDefinition, ToolResult, AgentConfig, AgentConfigWithContext, ModelConfig, AgentType, StreamingAgentConfig, TextAgentConfig, ObjectAgentConfig } from './types';
export type { TemplateContext } from './template-utils';
export type { AgentResult, StreamingAgentResult, TextAgentResult, ObjectAgentResult, AgentExecutionOptions } from './agent-executors';