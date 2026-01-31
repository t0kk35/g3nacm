import * as db from "@/db"
import { AgentUserPreference } from "@/app/api/data/agent/types";
import { agentUserPreferenceCache } from "./cache";

const query_text = `
SELECT 
  u.id as "user_id",
  u.name as "user_name",
  aup.communication_style,
  aup.explantion_depth,
  aup.risk_perspective,
  aup.output_format,
  aup.use_visual,
  aup.planning_mode,
  aup.show_confidence_scores,
  aup.highlight_assumptions,
  aup.preferred_language
FROM agent_user_preferences aup
JOIN users u on aup.user_id = u.id
WHERE u.name = $1
`

export async function getCachedAgentUserPreferences(userName: string) {
    const key = `agentUserPreference:${userName}`;

    return agentUserPreferenceCache.get(
        key,
        async () => {
            try {
                const userPreference = await db.pool.query(query_text, [userName]);
                if (userPreference.rows.length === 0) return undefined;
                const out:AgentUserPreference = userPreference.rows[0];
                return out
            } catch (error) {
                throw Error('Workflow Cache. DB Error ' + error);
            }
        },
        300_000);
}