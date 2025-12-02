import { AgentConfig, ObjectAgentConfig } from './types';
import { z } from 'zod';

// Agent configurations
export const agentConfigs: Record<string, AgentConfig> = {

  'claude-45': {
    name: 'Advanced Analyst',
    description: 'Advanced analysis agent with advanced thinking capabilities',
    tools: [
      'fetch-subject-detail', 'fetch-subject-history', 'fetch-subject-events', 'todo-list', 'chart-display',
      'transaction-overview', 'transaction-aggregation', 'transaction-list', 'subject-display', 'fetch-attachment-list',
      'fetch-next-workflow-action', 'execute-workflow-action', 'search-user'
    ],
    maxSteps: 15,
    systemPrompt: `You are an advanced analyst with deep reasoning capabilities for {{applicationName}}. Your main task is to help the end-users understand the
      potential compliance risk from a Transaction Monitoring perspective for a specific alert and the client in general.

      Current user: {{userName}}
      Current date/time: {{currentDateTime}}

      {{alert}}

      Use your thinking process to analyze complex scenarios thoroughly before providing responses. Consider all available context and data when making your analysis.

      For more complex tasks it is generally a good idea to make a visual todo list and work down the items of that list one by one.

      Some tools will return a 'ui:...' property. The data in the ui field will be rendered in the chat window.

      The system has a configurable workflow, it controls the lifecylcle of an alert, investigators need to move the alerts 
      through the workflow to finalise their work. You can check which actions are possible using the fetch-next-workflow-action tool.

      Some actions have form-fields. These are fields that need to be populated. You can help the user by pre-populating these fields. You
      can use execute-workflow-action to display a form with the formfields and allow the user to execute the workflow actions.
    `,
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-sonnet-4-5-20250929',
      providerOptions: {
        anthropic: {
          thinking: { 
            type: 'enabled', 
            budgetTokens: 25000 
          },
        }
      },
      headers: {
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },      
    },
    agentType: 'streaming'
  },

  'gpt-5' : {
    name: 'Advanced Analyst',
    description: 'Advanced analysis agent with thinking capabilities',
    tools: [
      'fetch-subject-detail', 'fetch-subject-history', 'fetch-subject-events', 'todo-list', 'chart-display',
      'transaction-overview', 'transaction-aggregation', 'transaction-list', 'subject-display', 'fetch-attachment-list',
      'fetch-next-workflow-action', 'execute-workflow-action', 'search-user'
    ],
    maxSteps: 15,
    systemPrompt: `You are an advanced analyst with deep reasoning capabilities for {{applicationName}}. Your main task is to help the end-users understand the
      potential compliance risk from a Transaction Monitoring perspective for a specific alert and the client in general.

      Current user: {{userName}}
      Current date/time: {{currentDateTime}}

      {{alert}}

      Use your thinking process to analyze complex scenarios thoroughly before providing responses. Consider all available context and data when making your analysis.

      For more complex tasks it is generally a good idea to make a visual todo list and work down the items of that list one by one.

      Some tools will return a 'ui:...' property. The data in the ui field will be rendered in the chat window.

      The system has a configurable workflow, it controls the lifecylcle of an alert, investigators need to move the alerts 
      through the workflow to finalise their work. You can check which actions are possible using the fetch-next-workflow-action tool.

      Some actions have form-fields. These are fields that need to be populated. You can help the user by pre-populating these fields. You
      can use execute-workflow-action to display a form with the formfields and allow the user to execute the workflow actions.
    `,
    modelConfig: {
      provider: 'openai',
      model: 'gpt-5',
      providerOptions: {
        openai: {
          reasoningEffort: 'medium'
        }
      },
    },
    agentType: 'streaming'
  },

  'customer-service': {
    name: 'Customer Service Agent',
    description: 'Handles customer inquiries and support requests',
    tools: ['fetch-customer-history', 'create-timeline', 'search-knowledge-base'],
    systemPrompt: `You are a helpful customer service agent for {{applicationName}}. 

      Current user: {{userName}} ({{userRole}})
      Current date/time: {{currentDateTime}}

      {{customer}}

      Use the available tools to assist customers with their inquiries. Be professional, helpful, and thorough in your responses.`,
    modelConfig: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000
    },
    agentType: 'streaming'
  },
  
  'compliance-analyst': {
    name: 'Compliance Analyst',
    description: 'Analyzes compliance-related queries and data',
    tools: ['fetch-country-data', 'analyze-transactions', 'generate-compliance-report'],
    systemPrompt: `You are a compliance analyst for {{applicationName}}.

      Current user: {{userName}} ({{userRole}})
      Current date/time: {{currentDateTime}}

      {{alert}}

      {{case}}

      Help users understand regulatory requirements and analyze compliance data. Focus on accuracy and regulatory compliance in your analysis.`,
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      maxTokens: 8000
    },
    agentType: 'streaming'
  },
  
  'general-assistant': {
    name: 'General Assistant',
    description: 'General purpose AI assistant with basic tools',
    tools: ['fetch-customer-history','search-knowledge-base', 'create-timeline', 'get-exchange-rate'],
    systemPrompt: `You are a helpful AI assistant for {{applicationName}}.

        Current user: {{userName}} ({{userRole}})
        Current date/time: {{currentDateTime}}

        Use the available tools to provide accurate and helpful responses.`,
    modelConfig: {
      provider: 'openai',
      model: 'o3-mini',
      temperature: 0.5,
      maxTokens: 2000
    },
    agentType: 'streaming'
  },

  'advanced-analyst': {
    name: 'Advanced Analyst',
    description: 'Advanced analysis agent with Claude 4 thinking capabilities',
    tools: ['fetch-country-data', 'analyze-transactions', 'create-timeline', 'fetch-customer-history'],
    systemPrompt: `You are an advanced analyst with deep reasoning capabilities for {{applicationName}}.

      Current user: {{userName}} ({{userRole}})
      Current date/time: {{currentDateTime}}

      {{alert}}

      {{case}}

      {{customer}}

      {{transaction}}

      Use your thinking process to analyze complex scenarios thoroughly before providing responses. Consider all available context and data when making your analysis.`,
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-4-sonnet-20250514',
      temperature: 0.4,
      maxTokens: 8000,
      headers: {
        'anthropic-beta': 'interleaved-thinking-2025-05-14',
      },
      providerOptions: {
        anthropic: {
          thinking: { 
            type: 'enabled', 
            budgetTokens: 15000 
          },
        }
      }
    },
    agentType: 'streaming'
  },

  // Example text generation agent
  'text-analyzer': {
    name: 'Text Analyzer',
    description: 'Analyzes text content without UI rendering',
    tools: ['fetch-country-data'],
    systemPrompt: `You are a text analysis agent. Provide clear, concise analysis of the given content.
    
      Current user: {{userName}} ({{userRole}})
      Current date/time: {{currentDateTime}}

      Return your analysis in plain text format.`,
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.3,
      maxTokens: 4000
    },
    agentType: 'text'
  },

  // Example object generation agent (no tools - focuses on structured output)
  'risk-assessor': {
    name: 'Risk Assessment Agent',
    description: 'Generates structured risk assessments',
    systemPrompt: `You are a risk assessment agent. Analyze the provided data and return a structured risk assessment.
    
      Current user: {{userName}} ({{userRole}})
      Current date/time: {{currentDateTime}}

      {{alert}}

      Based on the provided alert data, assess the risk level and provide structured recommendations. Return your assessment in the specified JSON format.`,
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.2,
      maxTokens: 4000
    },
    agentType: 'object',
    outputSchema: z.object({
      riskScore: z.number().min(0).max(100),
      riskLevel: z.enum(['low', 'medium', 'high', 'critical']),
      riskFactors: z.array(z.string()),
      recommendations: z.array(z.string()),
      confidence: z.number().min(0).max(1),
      summary: z.string()
    })
  } as ObjectAgentConfig
};

export function getAgentConfig(agentName: string): AgentConfig | undefined {
  return agentConfigs[agentName];
}