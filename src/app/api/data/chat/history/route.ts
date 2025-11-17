import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { ErrorCreators } from '@/lib/api-error-handling';
import { getChatSessionsForEntity, getChatMessages, isAPIError } from '@/lib/chat-audit';

const origin = '/api/data/chat/history';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityCode = searchParams.get('entityCode');
  const entityId = searchParams.get('entityId');
  const sessionId = searchParams.get('sessionId');

  // Authentication check
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  if (sessionId) {
    // Get messages for a specific session
    const messagesResult = await getChatMessages(sessionId, origin);
    if (isAPIError(messagesResult)) {
      return messagesResult; // Return error if query failed
    }

    return Response.json({
      sessionId: sessionId,
      messages: messagesResult
    });
  } else if (entityCode && entityId) {
    // Get all sessions for an entity
    const sessionsResult = await getChatSessionsForEntity(entityCode, entityId, origin);
    if (isAPIError(sessionsResult)) {
      return sessionsResult; // Return error if query failed
    }

    // Get messages for each session
    const sessionsWithMessages = await Promise.all(
      sessionsResult.map(async (session) => {
        const messagesResult = await getChatMessages(session.id, origin);
        return {
          ...session,
          messages: Array.isArray(messagesResult) ? messagesResult : []
        };
      })
    );

    return Response.json({
      entityCode,
      entityId,
      sessions: sessionsWithMessages
    });
  } else {
    return ErrorCreators.param.bodyMissing(origin, 'entityCode and entityId, or sessionId');
  }
}