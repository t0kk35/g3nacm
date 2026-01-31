"use client"

import type React from "react"
import { ChatUIMessage } from "@/app/api/chat/types"
import { useEffect, useRef, useState } from "react"
import { ChevronDown, ChevronRight, Bot, User, Brain, Square, AlertTriangle, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Markdown } from "./markdown"
import { cn } from "@/lib/utils"
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ReasoningUIPart } from 'ai';

// Custom type for tools that return UI components
type CustomToolUIPart = {
  type: `tool-${string}`;
  toolCallId: string;
  state: 'output-available' | 'input-streaming' | 'input-available' | 'output-error';
  output?: {
    ui?: {
      component: string;
      props?: Record<string, any>;        // Optional: explicit props (legacy/backward compatible)
      propsSource?: string;               // Optional: path to data property (e.g., "data" or "data.todos")
      propsTransform?: (data: any) => any; // Optional: transform function for complex cases
    };
    [key: string]: any;
  };
  errorText?: string;
}
import { ToolComponent } from './ai-tools/tool-component-registry';
import { TemplateContext } from "@/lib/ai-tools"
import { LoadingSpinner } from "./spinner"
import { ErrorBoundary } from "./error-boundary"


type Props = {
  agent: string;
  context: TemplateContext;
  entityCode: string;
  entityId: string;
  orgUnitCode: string;
}

// Type guards for different part types
function isToolPart(part: any): part is CustomToolUIPart {
  return part?.type?.startsWith('tool-');
}

function isReasoningPart(part: any): part is ReasoningUIPart {
  return part?.type === 'reasoning';
}

export function ChatWindow({ agent, context, entityCode, entityId, orgUnitCode }: Props) {

  const sessionIdRef = useRef<string | null>(null);
  const [totalTokenUsage, setTotalTokenUsage] = useState(0);
  const [debugMode, setDebugMode] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [dismissedError, setDismissedError] = useState(false)
  const [maxHeight, setMaxHeight] = useState(600)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>({
    id: `chat-${forceRefresh}`,
    transport: new DefaultChatTransport({ 
      api: '/api/chat',
      body: () => ({
        agent: agent,
        context: context,
        orgUnitCode: orgUnitCode,
        entityCode: entityCode,
        entityId: entityId,
        sessionId: sessionIdRef.current // Include session ID for existing conversations
      })
    }),
    onError: (error) => {
      console.error('Chat error:', error);
      setRetryCount(prev => prev + 1);
    },
    onFinish: async (m) => {
      // Update token usage.
      setTotalTokenUsage(prev => m.message.metadata?.usage?.totalTokens 
        ? prev + m.message.metadata?.usage?.totalTokens
        : prev
      )

      // -- Store the message
      // Get session ID from message metadata (AI SDK v5)
      const currentSessionId = m.message.metadata?.sessionId || sessionIdRef.current;
      
      // Update session ID ref if we got it from metadata
      if (currentSessionId && !sessionIdRef.current) {
        sessionIdRef.current = currentSessionId;
      }
      
      // Store assistant response after streaming completes
      if (m.message.role === 'assistant' && currentSessionId) {
        try {
          // Extract message properties with type checking for AI SDK v5
          const messageData = m.message as any;
          const parts = Array.isArray(messageData.parts) ? messageData.parts : [];
          const toolInvocations = Array.isArray(messageData.toolInvocations) ? messageData.toolInvocations : [];
          const reasoning = messageData.reasoning || null;
          
          // Extract text content from parts for searchable message_content field
          const textContent = parts
            .filter((part: any) => part.type === 'text')
            .map((part: any) => part.text || '')
            .join('');
          
          await fetch('/api/chat/store-response', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: currentSessionId,
              agentCode: agent,
              messageContent: textContent,
              messageMetadata: {
                parts: parts,
                toolInvocations: toolInvocations,
                createdAt: new Date().toISOString()
              },
              agentReasoning: reasoning,
              usage: m.message.metadata?.usage
            }),
          });
        } catch (error) {
          console.error('Failed to store assistant response:', error);
        }
      }
    }
  });

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    sendMessage(
      { text: input, 
        metadata: {
          createdAt: Date.now(),
          agentCode: agent
        }
      }
    );
    setInput('');
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom && messages.length > 3)
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Calculate available height to prevent double scrollbars
  useEffect(() => {
    const calculateMaxHeight = () => {
      const windowHeight = window.innerHeight
      const availableHeight = Math.max(400, windowHeight - 300) // Reserve 300px for other page content
      setMaxHeight(availableHeight)
    }

    calculateMaxHeight()
    window.addEventListener('resize', calculateMaxHeight)
    return () => window.removeEventListener('resize', calculateMaxHeight)
  }, [])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && status === 'streaming') {
        stop()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [status, stop])

  // Reset dismissed error when a new error occurs
  useEffect(() => {
    if (error) {
      setDismissedError(false)
      console.error('Chat error occurred:', {
        message: error.message,
        cause: error.cause,
        name: error.name,
        stack: error.stack
      })
    }
  }, [error])

  const formatTimestamp = (date: number) => {
    const asDate = new Date(date)
    const now = new Date()
    const isToday = asDate.toDateString() === now.toDateString()

    if (isToday) {
      return asDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return asDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    }
  }

  return (
    <ErrorBoundary>
      <Card className={cn("w-full flex flex-col")}>
        <CardHeader className="shrink-0">
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              AI Assistant
            </div>
            <div className="flex items-center gap-2 text-xs font-light text-muted-foreground">
              <span >Used Tokens : </span>
              <span className="font-mono font-semibold">{totalTokenUsage / 1000} </span>
              <span> k</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDebugMode(!debugMode)}
                className={cn(
                  "text-xs px-2 py-1 rounded border",
                  debugMode ? "bg-blue-100 border-blue-300 text-blue-800" : "bg-gray-100 border-gray-300 text-gray-600"
                )}
                title="Toggle debug mode for detailed logging"
              >
                Debug {debugMode ? "ON" : "OFF"}
              </button>
              {retryCount > 0 && (
                <span className="text-xs text-orange-600 font-medium">
                  Retries: {retryCount}
                </span>
              )}
              {error && (
                <button
                  onClick={() => {
                    setRetryCount(0);
                    setForceRefresh(prev => prev + 1);
                  }}
                  className="text-xs px-2 py-1 rounded border bg-red-100 border-red-300 text-red-800 hover:bg-red-200"
                  title="Reset chat and clear errors"
                >
                  Reset
                </button>
              )}
            </div>
          </CardTitle>
        </CardHeader>

      {/* Messages Area */}
      <CardContent className="p-0 relative">
        {messages.length === 0 ? (
          <div className="px-4 py-4 text-center text-muted-foreground">
            <Bot className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start a conversation to get help with the alert</p>
          </div>
        ) : (
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto px-4 pb-4 scroll-smooth"
            style={{ maxHeight: `${maxHeight}px` }}
          >
            <div className="space-y-4 py-4">
              {messages.map((message) => (
              <div key={message.id} className={cn("flex gap-3 group", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={cn(message.role === "user" ? "bg-chart-1 text-white" : "bg-foreground text-background")}>
                    {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>

                <div className={cn("flex flex-col gap-1 max-w-[80%]", message.role === "user" ? "items-end" : "items-start")}>
                  <div className="flex items-center gap-1">
                    { message.metadata!.createdAt && (<span className="text-xs text-muted-foreground">{formatTimestamp(message.metadata!.createdAt)}</span>) }
                    <Badge variant="outline" className="text-xs font-mono">
                      {message.role === "user" ? "You" : "Assistant"}
                    </Badge>
                  </div>

                  <div className={cn("rounded-lg px-3 py-2 text-sm wrap-break-words", message.role === "user" ? "bg-muted/60" : "bg-muted")}>
                    <ErrorBoundary fallback={<p className="text-red-500">Error rendering message</p>}>
                      { message.parts.map((part, index) => {
                        const partKey = `${message.id}-${index}`;
                        try {
                          // Handle text parts
                          if (part.type === 'text') {
                            return <Markdown key={partKey} content={part.text || ''}/>
                          }
                          
                          // Handle reasoning parts
                          if (isReasoningPart(part)) {
                            return <ReasoningPart 
                              key={partKey} 
                              part={part} 
                              partKey={partKey} 
                              isStreaming={status === 'streaming' && index === message.parts.length - 1} 
                            />
                          }
                          
                          // Handle tool parts
                          if (isToolPart(part)) {
                            const toolName = part.type.substring(5); // Remove 'tool-' prefix
                            return <ToolInvocationPart key={partKey} toolName={toolName} part={part} partKey={partKey} />
                          }
                          
                          // Handle step-start parts
                          if (part.type === 'step-start') {
                            return null; // Ignore for now
                          }
                          
                          // Unknown part type
                          console.warn('Unknown part type:', part.type);
                          return <p key={partKey}>Unknown part type: {part.type}</p>
                          
                        } catch (partError) {
                          console.error('Error rendering part:', partError, part);
                          return <p key={partKey} className="text-red-500">Error rendering message part</p>
                        }
                      })
                      }
                    </ErrorBoundary>
                  </div>
                </div>
              </div>
              ))}
            </div>
          </div>
        )}

        {showScrollButton && (
          <Button
            variant="outline"
            size="icon"
            className="absolute bottom-4 right-4 rounded-full shadow-lg bg-background border z-10"
            onClick={scrollToBottom}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        )}
      </CardContent>

      {/* Error Banner */}
      {error && !dismissedError && (
        <div className="bg-destructive/10 border-t border-destructive/20 p-3">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span className="flex-1">
              {error.message || 'An error occurred while processing your request'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissedError(true)}
              className="h-6 w-6 p-0 hover:bg-destructive/20"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            //onKeyDown={handleKeyDown}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={status === 'streaming'}
          />
          {status === 'streaming' ? (
            <Button type="button" variant="destructive" onClick={stop} className="flex items-center gap-1">
              <Square className="h-3 w-3" />
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </form>
      </div>
    </Card>
    </ErrorBoundary>
  )
}

type ToolInvocationPartProps = {
  toolName: string;
  part: CustomToolUIPart;
  partKey: string;
}

function ToolInvocationPart({ toolName, part, partKey }: ToolInvocationPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // AI SDK v5: tool data is directly on the part
  if (!part) {
    console.warn('ToolInvocationPart: Missing part data');
    return null;
  }
  
  // Check for completed tool with UI result
  if (part.state === 'output-available' && part.output && part.output?.ui) {
    const ui = part.output.ui;

    // Resolve props: explicit props > propsSource reference > fallback to data
    let resolvedProps: Record<string, any> | undefined = ui.props;

    if (!resolvedProps && ui.propsSource) {
      // Navigate the propsSource path (e.g., "data" or "data.todos")
      const path = ui.propsSource.split('.');
      resolvedProps = path.reduce((obj: any, key: string) => obj?.[key], part.output);

      // Apply transform if provided
      if (ui.propsTransform && resolvedProps) {
        resolvedProps = ui.propsTransform(resolvedProps);
      }
    }

    // Fallback to entire data object if no props specified
    if (!resolvedProps) {
      resolvedProps = part.output.data;
    }

    // Final safety check - provide empty object if still undefined
    const finalProps = resolvedProps || {};

    return (
      <div key={partKey} className="mt-2">
        <ToolComponent
          componentName={ui.component}
          props={finalProps}
        />
      </div>
    );
  }
  
  // Show raw output for completed tools without UI
  if (part.state === 'output-available') {
    return (
      <div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <span>Tool <span className="font-semibold">{toolName}</span> data</span>
        </button>
      
        {isExpanded && (
          <pre key={partKey} className="text-xs">{JSON.stringify(part.output, null, 2)}</pre>
        )}
      </div>
    )
  }
  
  // Show loading state for streaming or pending states
  if (part.state === 'input-streaming' || part.state === 'input-available') {
    return (
      <div key={partKey} className="flex items-center gap-2 text-xs text-muted-foreground italic">
        <LoadingSpinner className="h-3 w-3" />
        Calling {toolName}...
      </div>
    );
  }
  
  // Handle error states
  if (part.state === 'output-error') {
    return (
      <div key={partKey} className="flex items-center gap-2 text-xs text-red-600">
        <AlertTriangle className="h-3 w-3" />
        Tool {toolName} failed: {part.errorText || 'Unknown error'}
      </div>
    );
  }
  
  return null;
}

type ReasoningPartProps = {
  part: ReasoningUIPart;
  partKey: string;
  isStreaming: boolean;
}

function ReasoningPart({ part, partKey, isStreaming }: ReasoningPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const startTimeRef = useRef<number | null>(null);
  const [duration, setDuration] = useState(0);
  
  // Initialize start time only once, when reasoning first begins
  if (startTimeRef.current === null && isStreaming) {
    startTimeRef.current = Date.now();
  }
  
  // Calculate final duration when streaming stops
  useEffect(() => {
    if (!isStreaming && startTimeRef.current !== null) {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }
  }, [isStreaming]);
  
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isStreaming && startTimeRef.current !== null) {
      interval = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isStreaming]);

  // Auto-expand when streaming, collapse when done
  useEffect(() => {
    if (isStreaming) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false);
    }
  }, [isStreaming]);
  
  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  const reasoningText = part.text || '';
  
  const isThinking = isStreaming;
  
  if (isThinking) {
    return (
      <div key={partKey} className="border-l-2 border-blue-500 pl-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground italic mb-2">
          <Brain className="h-3 w-3 animate-pulse" />
          <span>Thinking</span>
          <span className="animate-pulse">...</span>
          <span className="text-xs opacity-60">{formatDuration(duration)}</span>
        </div>
        {reasoningText && (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded p-3 whitespace-pre-wrap">
            {reasoningText}
            <span className="animate-pulse">|</span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div key={partKey} className="border-l border-blue-500 pl-3 py-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <Brain className="h-3 w-3" />
        <span>Thought for {formatDuration(duration)}</span>
      </button>
      
      {isExpanded && (
        <div className="mt-2 text-xs text-muted-foreground italic bg-muted/30 rounded p-3 whitespace-pre-wrap">
          {reasoningText}
        </div>
      )}
    </div>
  );
}