import { agentUserPreferenceCache } from "./cache";
import { hasPermissions } from "../permissions/core";
import { queryAgentUserPreference, queryAgentUserPreferencePermissions } from "../data/queries/agent/user_preference";

export async function getCachedAgentUserPreferences(userName: string) {
    const key = `agentUserPreference:${userName}`;
    const ok = await hasPermissions(userName, queryAgentUserPreferencePermissions)
    if (!ok) throw new Error(`Agent User Preference Error. User '${userName}' does not have permission to '${queryAgentUserPreferencePermissions.toString}'`)
    
    return agentUserPreferenceCache.get(
        key,
        async () => {
            try {
                const userPreference = await queryAgentUserPreference({userName: userName}, { userName: userName});
                return userPreference
            } catch (error) {
                throw Error('Workflow Cache. DB Error ' + error);
            }
        },
        300_000);
}