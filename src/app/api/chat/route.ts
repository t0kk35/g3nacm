'use server'

import { streamText, convertToModelMessages, stepCountIs, NoSuchToolError, InvalidToolInputError } from 'ai';
import { ChatUIMessage } from './types';
import { toolRegistry } from '@/lib/ai-tools';
import { getCachedAgentModelConfig } from '@/lib/cache/agent-model-config-cache';
import { substituteTemplate, getDefaultContext, mergeContexts, TemplateContext } from '@/lib/ai-tools/template-utils';
import { ErrorCreators } from '@/lib/api-error-handling';
import { StreamingAgentConfig } from '@/lib/ai-tools/types';
import { auth } from '@/auth';
import { findOrCreateChatSession, addChatMessage, getChatSession, isAPIError, isChatSession } from '@/lib/chat-audit';
import { getCachedAgentConfig } from '@/lib/cache/agent-config-cache';

const origin = '/api/chat'

// Allow streaming responses up to 5 minutes
const maxDuration = 300;

export async function POST(req: Request) {
  
  const { 
    messages, 
    agent = 'general-assistant', 
    context = {}, 
    sessionId,
    entityCode,
    entityId,
    orgUnitCode
  } : {
    messages: ChatUIMessage[],
    agent:string,
    context: any,
    sessionId: string,
    entityCode: string,
    entityId: string,
    orgUnitCode: string,
  } = await req.json();

  // Authentication check
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  // Get agent configuration
  const agentConfig = await getCachedAgentConfig(agent);
  if (!agentConfig) return ErrorCreators.agent.notFound(origin, agent)

  // Validate that this is a streaming agent
  if (agentConfig.agentType !== 'streaming') return ErrorCreators.agent.invalidType(origin, agent, 'streaming', agentConfig.agentType)

  // Type assertion now that we've validated the agent type
  const streamingAgentConfig = agentConfig as StreamingAgentConfig;

  // Validate required parameters for audit trail
  if (!entityCode || !entityId || !orgUnitCode) return ErrorCreators.param.bodyMissing(origin, 'entityCode, entityId, or orgUnitCode');

  // Find or create chat session
  let chatSession;
  if (sessionId) {
    // Use existing session
    const chatSessionResult = await getChatSession(sessionId, origin);
    if (isAPIError(chatSessionResult)) {
      return chatSessionResult; // Return error if session not found
    }
    chatSession = chatSessionResult;
  } else {
    // Create new session
    const chatSessionResult = await findOrCreateChatSession({
      entity_code: entityCode,
      entity_id: entityId,
      user_name: user.name,
      agent_name: agent,
      org_unit_code: orgUnitCode,
      session_title: `Chat with ${agent}`
    }, origin);
    
    if (isAPIError(chatSessionResult)) {
      return chatSessionResult; // Return error if session creation failed
    }
    chatSession = chatSessionResult;
  }

  // Store user message if this is a new message (not just loading conversation)
  const lastMessage = messages[messages.length - 1];
  if (lastMessage && lastMessage.role === 'user') {
    // Extract text content from parts array for AI SDK v5 compatibility
    const parts = Array.isArray(lastMessage.parts) ? lastMessage.parts : [];
    const textContent = parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text || '')
      .join('');
    
    const userMessageResult = await addChatMessage({
      session_id: chatSession.id,
      message_type: 'user',
      message_content: textContent,
      message_metadata: {
        parts: parts,
        createdAt: Date.now()
      },
      template_context: context
    }, origin);
    
    if (isAPIError(userMessageResult)) {
      return userMessageResult; // Return error if message storage failed
    }
  }

  // Get tools for this streaming agent
  const tools = toolRegistry.getTools(streamingAgentConfig.tools);

  // Create model instance based on streaming agent configuration
  const { model, streamTextOptions } = await getCachedAgentModelConfig(streamingAgentConfig.modelConfigCode);

  // Process system prompt with template variables
  const templateContext: TemplateContext = mergeContexts(
    getDefaultContext(),
    context as TemplateContext
  );

  const processedSystemPrompt = streamingAgentConfig.systemPrompt 
    ? substituteTemplate(streamingAgentConfig.systemPrompt, templateContext)
    : undefined;

  try {
    const result = streamText({
      model,
      messages: convertToModelMessages(messages),
      tools,
      system: processedSystemPrompt,
      stopWhen: stepCountIs(streamingAgentConfig.maxSteps || 5),
      ...streamTextOptions,
    });
    
    // Create a custom response that captures the agent's response for auditing
    const uiStreamResponse = result.toUIMessageStreamResponse({
      sendReasoning: true,
      originalMessages: messages,
      messageMetadata: ({ part }) => {
        // Send meta data when streaming starts
        if (part.type === 'start') {
          return {
            createdAt: Date.now(),
            model: model,
            sessionId: chatSession.id
          };
        }
        // Send additional metadata when streaming completes
        if (part.type === 'finish') {
          return {
            totalTokens: part.totalUsage.totalTokens
          }
        }
      },
      onError: error => {
        if (NoSuchToolError.isInstance(error)) return `The model tried to call a unknown tool. Error '${error}'`;
        else if (InvalidToolInputError.isInstance(error)) return `The model called a tool with invalid arguments. Error '${error}'`;
        else return `An unknown error occurred. ${error}`
      }
    });

    // Ensure proper headers are set for streaming
    const headers = new Headers(uiStreamResponse.headers);
    headers.set('Content-Type', 'text/plain; charset=utf-8');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    const response = new Response(uiStreamResponse.body, {
      headers: headers
    });

    return response;
  } catch (error) {
    console.error('Error in chat API:', error)
    
    // For streaming errors, we need to return a proper error response
    // that won't cause the client to fail parsing the stream
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          }
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }    
    
    return ErrorCreators.db.queryFailed(origin, 'streamText', error instanceof Error ? error : new Error('Unknown streaming error'))
  }
}