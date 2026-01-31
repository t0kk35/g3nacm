import * as db from "@/db"
import { ErrorCreators } from '@/lib/api-error-handling'
import { NextResponse } from 'next/server'
import { APIError } from '@/lib/api-error-handling'

/**
 * Converts a username to user ID for database operations
 */
export async function getUserIdFromUsername(
  username: string,
  origin: string
): Promise<number | ReturnType<typeof ErrorCreators.db.queryFailed> | ReturnType<typeof ErrorCreators.db.entityNotFound>> {
  const query = {
    name: 'get_user_id_from_username',
    text: `SELECT id FROM users WHERE name = $1 AND deleted = false`,
    values: [username]
  }

  try {
    const result = await db.pool.query(query)
    if (result.rows.length === 0) {
      return ErrorCreators.db.entityNotFound(origin, 'user', username)
    }
    return result.rows[0].id as number
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'get_user_id_from_username', error as Error)
  }
}

export interface ChatSession {
  id: string
  entity_code: string
  entity_id: string
  user_id: number
  agent_name: string
  org_unit_code: string
  session_start_time: Date
  session_last_activity: Date
  session_title?: string
  created_at: Date
}

export interface ChatMessage {
  id: string
  session_id: string
  message_sequence: number
  message_type: 'user' | 'agent'
  message_content: string
  message_metadata?: object
  template_context?: object
  agent_reasoning?: object
  created_at: Date
}

export interface CreateSessionParams {
  entity_code: string
  entity_id: string
  user_name: string
  agent_name: string
  org_unit_code: string
  session_title?: string
}

export interface CreateMessageParams {
  session_id: string
  agent_code: string
  message_type: 'user' | 'agent'
  message_content: string
  message_metadata?: object
  template_context?: object
  agent_reasoning?: object
  input_tokens?: number
  cached_input_tokens?: number
  output_tokens?: number
  reasoning_tokens?: number
  total_tokens?:number
}

/**
 * Type guard to check if a value is an API error response
 */
export function isAPIError(value: any): value is NextResponse<APIError> {
  return value && typeof value === 'object' && 'errorCode' in value;
}

/**
 * Type guard to check if a value is a ChatSession
 */
export function isChatSession(value: any): value is ChatSession {
  return value && typeof value === 'object' && 'id' in value && 'entity_code' in value;
}

/**
 * Type guard to check if a value is a ChatMessage
 */
export function isChatMessage(value: any): value is ChatMessage {
  return value && typeof value === 'object' && 'id' in value && 'session_id' in value;
}

/**
 * Creates a new chat session linked to a workflow entity
 */
export async function createChatSession(
  params: CreateSessionParams,
  origin: string
): Promise<ChatSession | ReturnType<typeof ErrorCreators.db.queryFailed>> {
  const query = {
    name: 'create_chat_session',
    text: `
      INSERT INTO chat_session (entity_code, entity_id, user_id, agent_name, org_unit_code, session_title)
      SELECT $1, $2, u.id, $4, $5, $6
      FROM users u
      WHERE u.name = $3 AND u.deleted = false
      RETURNING *
    `,
    values: [
      params.entity_code,
      params.entity_id,
      params.user_name,
      params.agent_name,
      params.org_unit_code,
      params.session_title
    ]
  }

  try {
    const result = await db.pool.query(query)
    if (result.rows.length === 0) {
      return ErrorCreators.db.noReturning(origin, 'create_chat_session')
    }
    return result.rows[0] as ChatSession
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'create_chat_session', error as Error)
  }
}

/**
 * Retrieves a chat session by ID
 */
export async function getChatSession(
  session_id: string,
  origin: string
): Promise<ChatSession | ReturnType<typeof ErrorCreators.db.queryFailed> | ReturnType<typeof ErrorCreators.db.entityNotFound>> {
  const query = {
    name: 'get_chat_session',
    text: `SELECT * FROM chat_session WHERE id = $1`,
    values: [session_id]
  }

  try {
    const result = await db.pool.query(query)
    if (result.rows.length === 0) {
      return ErrorCreators.db.entityNotFound(origin, 'chat_session', session_id)
    }
    return result.rows[0] as ChatSession
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'get_chat_session', error as Error)
  }
}

/**
 * Validates that a chat session belongs to the specified user
 */
export async function validateSessionOwnership(
  session_id: string,
  user_name: string,
  origin: string
): Promise<boolean | ReturnType<typeof ErrorCreators.db.queryFailed> | ReturnType<typeof ErrorCreators.db.entityNotFound>> {
  const query = {
    name: 'validate_session_ownership',
    text: `
      SELECT 1 FROM chat_session cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.id = $1 AND u.name = $2 AND u.deleted = false
    `,
    values: [session_id, user_name]
  }

  try {
    const result = await db.pool.query(query)
    return result.rows.length > 0
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'validate_session_ownership', error as Error)
  }
}

/**
 * Retrieves chat sessions for a specific entity
 */
export async function getChatSessionsForEntity(
  entity_code: string,
  entity_id: string,
  origin: string
): Promise<ChatSession[] | ReturnType<typeof ErrorCreators.db.queryFailed>> {
  const query = {
    name: 'get_chat_sessions_for_entity',
    text: `
      SELECT * FROM chat_session 
      WHERE entity_code = $1 AND entity_id = $2 
      ORDER BY session_start_time DESC
    `,
    values: [entity_code, entity_id]
  }

  try {
    const result = await db.pool.query(query)
    return result.rows as ChatSession[]
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'get_chat_sessions_for_entity', error as Error)
  }
}

/**
 * Adds a message to a chat session
 */
export async function addChatMessage(
  params: CreateMessageParams,
  origin: string
): Promise<ChatMessage | ReturnType<typeof ErrorCreators.db.queryFailed>> {
  let client;
  let transactionStarted = false;

  try {
    client = await db.pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    // Get the next sequence number for this session
    const sequenceQuery = {
      name: 'get_next_message_sequence',
      text: `SELECT COALESCE(MAX(message_sequence), 0) + 1 as next_sequence FROM chat_message WHERE session_id = $1`,
      values: [params.session_id]
    };

    const sequenceResult = await client.query(sequenceQuery);
    const nextSequence = sequenceResult.rows[0].next_sequence;

    // Insert the message
    const insertQuery = {
      name: 'insert_chat_message',
      text: `
        INSERT INTO chat_message (
          session_id, agent_code, message_sequence, message_type, message_content, 
          message_metadata, template_context, agent_reasoning, input_tokens, cached_input_tokens,
          output_tokens, reasoning_tokens, total_tokens
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `,
      values: [
        params.session_id,
        params.agent_code,
        nextSequence,
        params.message_type,
        params.message_content,
        params.message_metadata ? JSON.stringify(params.message_metadata) : null,
        params.template_context ? JSON.stringify(params.template_context) : null,
        params.agent_reasoning ? JSON.stringify(params.agent_reasoning) : null,
        params.input_tokens,
        params.cached_input_tokens,
        params.output_tokens,
        params.reasoning_tokens,
        params.total_tokens
      ]
    };

    const result = await client.query(insertQuery);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to insert chat message');
    }

    await client.query('COMMIT');
    return result.rows[0] as ChatMessage;

  } catch (error) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK');
    }
    return ErrorCreators.db.queryFailed(origin, 'add_chat_message', error as Error);
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Retrieves messages for a chat session
 */
export async function getChatMessages(
  session_id: string,
  origin: string
): Promise<ChatMessage[] | ReturnType<typeof ErrorCreators.db.queryFailed>> {
  const query = {
    name: 'get_chat_messages',
    text: `
      SELECT * FROM chat_message 
      WHERE session_id = $1 
      ORDER BY message_sequence ASC
    `,
    values: [session_id]
  }

  try {
    const result = await db.pool.query(query)
    return result.rows as ChatMessage[]
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'get_chat_messages', error as Error)
  }
}

/**
 * Retrieves chat audit logs for compliance reporting
 */
export async function getChatAuditLogs(
  filters: {
    user_id?: number
    entity_code?: string
    entity_id?: string
    from_date?: Date
    to_date?: Date
    event_type?: string
  },
  origin: string
): Promise<any[] | ReturnType<typeof ErrorCreators.db.queryFailed>> {
  const conditions: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (filters.user_id) {
    conditions.push(`user_id = $${paramIndex}`)
    values.push(filters.user_id)
    paramIndex++
  }

  if (filters.entity_code) {
    conditions.push(`entity_code = $${paramIndex}`)
    values.push(filters.entity_code)
    paramIndex++
  }

  if (filters.entity_id) {
    conditions.push(`entity_id = $${paramIndex}`)
    values.push(filters.entity_id)
    paramIndex++
  }

  if (filters.from_date) {
    conditions.push(`created_at >= $${paramIndex}`)
    values.push(filters.from_date)
    paramIndex++
  }

  if (filters.to_date) {
    conditions.push(`created_at <= $${paramIndex}`)
    values.push(filters.to_date)
    paramIndex++
  }

  if (filters.event_type) {
    conditions.push(`event_type = $${paramIndex}`)
    values.push(filters.event_type)
    paramIndex++
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const query = {
    name: 'get_chat_audit_logs',
    text: `
      SELECT * FROM chat_audit_log 
      ${whereClause}
      ORDER BY created_at DESC
    `,
    values: values
  }

  try {
    const result = await db.pool.query(query)
    return result.rows
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'get_chat_audit_logs', error as Error)
  }
}

/**
 * Finds or creates a chat session for an entity and user
 */
export async function findOrCreateChatSession(
  params: CreateSessionParams,
  origin: string
): Promise<ChatSession | ReturnType<typeof ErrorCreators.db.queryFailed>> {
  // First try to find an existing active session (within last 24 hours)
  const findQuery = {
    name: 'find_active_chat_session',
    text: `
      SELECT cs.* FROM chat_session cs
      JOIN users u ON cs.user_id = u.id
      WHERE cs.entity_code = $1 AND cs.entity_id = $2 AND u.name = $3 AND cs.agent_name = $4
        AND cs.session_last_activity > NOW() - INTERVAL '24 hours'
        AND u.deleted = false
      ORDER BY cs.session_last_activity DESC
      LIMIT 1
    `,
    values: [params.entity_code, params.entity_id, params.user_name, params.agent_name]
  }

  try {
    const result = await db.pool.query(findQuery)
    if (result.rows.length > 0) {
      return result.rows[0] as ChatSession
    }

    // If no active session found, create a new one
    return await createChatSession(params, origin)
  } catch (error) {
    return ErrorCreators.db.queryFailed(origin, 'find_or_create_chat_session', error as Error)
  }
}