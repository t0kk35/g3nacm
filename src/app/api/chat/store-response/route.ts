import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { ErrorCreators } from '@/lib/api-error-handling';
import { addChatMessage, validateSessionOwnership, isAPIError, isChatMessage } from '@/lib/chat-audit';

const origin = '/api/chat/store-response';

export async function POST(req: NextRequest) {
  const { 
    sessionId, 
    agentCode,
    messageContent, 
    messageMetadata, 
    agentReasoning,
    usage 
  } = await req.json();

  // Authentication check
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  // Validate required parameters
  if (!sessionId || !messageContent) {
    return ErrorCreators.param.bodyMissing(origin, 'sessionId or messageContent');
  }

  // Verify the user owns this session
  const ownershipCheck = await validateSessionOwnership(sessionId, user.name, origin);
  if (typeof ownershipCheck !== 'boolean') {
    return ownershipCheck; // Return error if validation query failed
  }
  if (!ownershipCheck) {
    return ErrorCreators.perm.resourceAccessDenied(origin, `chat session ${sessionId}`);
  }

  // Store the agent's response
  const agentMessageResult = await addChatMessage({
    session_id: sessionId,
    agent_code: agentCode,
    message_type: 'agent',
    message_content: messageContent,
    message_metadata: messageMetadata,
    agent_reasoning: agentReasoning,
    input_tokens: usage.inputTokens,
    cached_input_tokens: usage.cachedInputTokens,
    output_tokens: usage.outputTokens,
    reasoning_tokens: usage.resoningTokens,
    total_tokens: usage.totalTokens
  }, origin);

  if (isAPIError(agentMessageResult)) {
    return agentMessageResult; // Return error if message storage failed
  }

  // TypeScript now knows this is a ChatMessage
  const agentMessage = agentMessageResult;

  return Response.json({ 
    success: true, 
    messageId: agentMessage.id,
    sessionId: sessionId
  });
}