# AI Tools Framework

This framework provides a flexible, extensible system for integrating AI tools with custom UI components in your Next.js application.

## Architecture

- **Tool Registry**: Central registry for all AI tools
- **Agent System**: Configurable agents with specific tool sets and model providers
- **Multi-Provider Support**: Flexible model provider system (OpenAI, Anthropic, etc.)
- **UI Components**: Custom React components for tool results
- **Type Safety**: Full TypeScript support

## Usage

### 1. Creating a New Tool

```typescript
// src/lib/ai-tools/tools/my-tool.ts
import { z } from 'zod';
import { AIToolDefinition, ToolResult } from '../types';

const schema = z.object({
  param1: z.string().describe('Description of param1'),
  param2: z.number().optional().describe('Optional param2')
});

export const myTool: AIToolDefinition = {
  name: 'my-tool',
  description: 'Description of what this tool does',
  inputSchem: schema,
  handler: async (params): Promise<ToolResult> => {
    // Tool implementation
    return {
      id: crypto.randomUUID(),
      toolName: 'my-tool',
      data: { /* your data */ },
      ui: {
        component: 'MyToolDisplay',
        props: { /* props for UI component */ }
      }
    };
  },
  uiComponent: 'MyToolDisplay'
};
```

### 2. Creating a UI Component

```typescript
// src/components/ui/custom/ai-tools/my-tool-display.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MyToolDisplayProps {
  // Define your props
}

export function MyToolDisplay({ /* props */ }: MyToolDisplayProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>My Tool Result</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Your UI */}
      </CardContent>
    </Card>
  );
}
```

### 3. Registering the Tool

```typescript
// src/lib/ai-tools/index.ts
import { myTool } from './tools/my-tool';

// Register the tool
toolRegistry.registerTool(myTool);
```

```typescript
// src/components/ui/custom/ai-tools/tool-component-registry.tsx
import { MyToolDisplay } from './my-tool-display';

// Add to component registry
const componentRegistry = {
  // ... existing components
  'MyToolDisplay': MyToolDisplay,
};
```

### 4. Using with Agents

```typescript
// src/lib/ai-tools/agents.ts
export const agentConfigs: Record<string, AgentConfig> = {
  'my-agent': {
    name: 'My Agent',
    description: 'Agent with my tools',
    tools: ['my-tool', 'other-tool'],
    systemPrompt: 'You are a helpful assistant with access to specific tools.',
    modelConfig: {
      provider: 'openai',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000
    }
  }
};
```

### 5. Using Different Agent Types

#### Streaming Agents (Chat Interface)
```typescript
// In your chat component
const { messages, input, handleInputChange, handleSubmit } = useChat({
  body: {
    agent: 'customer-service' // Specify which streaming agent to use
  }
});
```

#### Text Agents (API Endpoints)
```typescript
// In your API route or server component
import { executeAgent, getAgentConfig } from '@/lib/ai-tools';

const config = getAgentConfig('text-analyzer');
const result = await executeAgent(config, {
  message: 'Analyze this text for sentiment...',
  context: {
    userName: 'John Doe',
    userRole: 'Analyst'
  }
});

if (result.type === 'text') {
  console.log(result.text); // Plain text response
  console.log(result.toolResults); // Tool execution results
}
```

#### Object Agents (Structured Data)
```typescript
// In your API route or server component
import { executeAgent, getAgentConfig } from '@/lib/ai-tools';

const config = getAgentConfig('risk-assessor');
const result = await executeAgent(config, {
  message: 'Assess risk for this transaction...',
  context: {
    userName: 'Risk Manager',
    userRole: 'Senior Analyst',
    alert: {
      id: 'ALERT-123',
      type: 'AML Transaction Monitoring',
      amount: 50000,
      // ... alert data
    }
  }
});

if (result.type === 'object') {
  console.log(result.object.riskScore); // 75
  console.log(result.object.riskLevel); // 'high'
  console.log(result.object.recommendations); // ['Investigate further', ...]
}
```

### 6. Creating New Agent Types

#### Text Agent
```typescript
// src/lib/ai-tools/agents.ts
'my-text-agent': {
  name: 'My Text Agent',
  description: 'Generates text responses',
  tools: ['relevant-tools'],
  systemPrompt: 'You are a text generation agent...',
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 4000
  },
  agentType: 'text'
}
```

#### Object Agent
```typescript
// src/lib/ai-tools/agents.ts
import { z } from 'zod';

'my-object-agent': {
  name: 'My Object Agent',
  description: 'Generates structured data',
  // Note: Object agents don't support tools
  systemPrompt: 'You are a structured data agent...',
  modelConfig: {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    temperature: 0.2,
    maxTokens: 4000
  },
  agentType: 'object',
  outputSchema: z.object({
    field1: z.string(),
    field2: z.number(),
    field3: z.array(z.string())
  })
} as ObjectAgentConfig
```

## Agent Types

The framework supports three types of agents, each optimized for different use cases:

### 1. Streaming Agents (`agentType: 'streaming'`)
- **Purpose**: Interactive chat with real-time streaming responses and UI rendering
- **Use Cases**: Customer service, general assistance, interactive analysis
- **Features**: 
  - Real-time text streaming
  - Custom UI components for tool results
  - Optimal for chat interfaces
- **API**: Uses `streamText` from Vercel AI SDK

### 2. Text Agents (`agentType: 'text'`)
- **Purpose**: Simple text generation without UI rendering
- **Use Cases**: Batch processing, automated analysis, API endpoints
- **Features**:
  - Complete text response
  - Tool execution with data results
  - No UI component rendering
- **API**: Uses `generateText` from Vercel AI SDK

### 3. Object Agents (`agentType: 'object'`)
- **Purpose**: Structured data generation with predefined schema
- **Use Cases**: Risk assessments, form validation, data transformation
- **Features**:
  - Schema-validated JSON output
  - Type-safe structured responses
  - **No tool support** - focuses purely on structured output
- **API**: Uses `generateObject` from Vercel AI SDK

## Available Agents

### Streaming Agents
- `general-assistant`: Basic assistant with timeline and search tools (OpenAI o3-mini)
- `customer-service`: Customer support with history and timeline tools (OpenAI GPT-4o)
- `compliance-analyst`: Compliance analysis with country data and transaction tools (Anthropic Claude 3.5 Sonnet)
- `advanced-analyst`: Advanced analysis with thinking capabilities (Anthropic Claude 4 Sonnet with thinking enabled)

### Text Agents
- `text-analyzer`: Analyzes text content without UI rendering (Anthropic Claude 3.5 Sonnet)

### Object Agents
- `risk-assessor`: Generates structured risk assessments (Anthropic Claude 3.5 Sonnet)

## Model Provider Configuration

Each agent can specify its own model provider and configuration:

### OpenAI Configuration
```typescript
modelConfig: {
  provider: 'openai',
  model: 'gpt-4o', // or 'o3-mini', 'gpt-4o-mini', etc.
  temperature: 0.7,
  maxTokens: 4000,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  seed: 42
}
```

### Anthropic Configuration
```typescript
modelConfig: {
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  temperature: 0.3,
  maxTokens: 8000,
  topP: 1.0,
  topK: 40
}
```

### Claude 4 with Thinking
```typescript
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
}
```

### Adding New Model Providers

1. Extend the `ModelConfig` union type in `types.ts`
2. Add provider-specific configuration interface
3. Update the `createModelInstance` function in `model-factory.ts`
4. Add the new provider import and instance creation logic

## Template Variables in System Prompts

Agents now support dynamic template variables in their system prompts using `{{variableName}}` syntax. This allows you to inject context-specific information directly into the agent's system prompt.

### Usage Example

```typescript
// In your chat component
const { messages, input, handleInputChange, handleSubmit } = useChat({
  body: {
    agent: 'customer-service',
    context: {
      userName: 'John Smith',
      userRole: 'Customer Service Rep',
      customer: {
        id: 'CUST-123',
        name: 'Acme Corp',
        status: 'Active',
        accountType: 'Premium',
        lastContact: '2024-01-15',
        riskLevel: 'Low'
      }
    }
  }
});
```

### Template Variables

#### Simple Variables
```typescript
context: {
  userName: 'John Smith',
  userRole: 'Administrator',
  currentDateTime: '2024-01-20T10:30:00Z'
}
```

#### Object Variables (JSON)
```typescript
context: {
  customer: {
    id: 'CUST-123',
    name: 'Acme Corp',
    status: 'Active',
    // ... entire customer object
  },
  alert: {
    id: 'ALERT-456',
    type: 'AML Transaction Monitoring',
    severity: 'High',
    // ... entire alert object
  }
}
```

### Built-in Variables

The system automatically provides these default variables:
- `{{currentDateTime}}` - Current ISO timestamp
- `{{applicationName}}` - Application name (g3nACM)

### Agent Template Examples

#### Customer Service Agent
```
You are a helpful customer service agent for {{applicationName}}.

Current user: {{userName}} ({{userRole}})
Current date/time: {{currentDateTime}}

{{customer}}

Use the available tools to assist customers with their inquiries.
```

#### Compliance Analyst
```
You are a compliance analyst for {{applicationName}}.

Current user: {{userName}} ({{userRole}})
Current date/time: {{currentDateTime}}

{{alert}}

{{case}}

Help users understand regulatory requirements and analyze compliance data.
```

### Implementation Details

- Variables use `{{variableName}}` syntax
- Object variables are automatically JSON stringified with 2-space indentation
- Undefined variables are replaced with empty strings
- Template processing happens at request time, not configuration time

## Adding New Tools

1. Create tool definition in `/lib/ai-tools/tools/`
2. Create UI component in `/components/ui/custom/ai-tools/`
3. Register both in their respective registries
4. Add to agent configurations as needed

## Best Practices

- Use descriptive tool names and descriptions
- Implement proper error handling in tool handlers
- Follow existing UI component patterns
- Add TypeScript types for all interfaces
- Include loading states in UI components where appropriate