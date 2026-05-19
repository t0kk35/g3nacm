import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { DataQueryError } from '@/lib/data/errors';
import { AgentUserPreference } from '@/lib/data/queries/agent/types';

const paramsSchema = z.object({})

const query_text = `
SELECT 
  u.id as "user_id",
  u.name as "user_name",
  aup.communication_style,
  aup.explanation_depth,
  aup.risk_perspective,
  aup.output_format,
  aup.use_visual,
  aup.planning_mode,
  aup.show_confidence_scores,
  aup.highlight_assumptions,
  aup.preferred_language
FROM agent_user_preference aup
JOIN users u on aup.user_id = u.id
WHERE u.name = $1
`

export const queryAgentUserPreferencePermissions = ['user.agent.preference']

export const queryAgentUserPreference = defineQuery({
    path: 'agent/user_preference',
    permissions: queryAgentUserPreferencePermissions,
    params: paramsSchema,
    execute: async ({ }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<AgentUserPreference | null> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text,[ctx.userName]);
            if (result.rows.length === 0) return null
            return result.rows[0] as AgentUserPreference;
        } catch (err) {
            throw new DataQueryError('Get Agent User Preference', err as Error);
        }
    },
});