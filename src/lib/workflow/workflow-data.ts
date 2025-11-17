import { error } from "console";
import { PoolClient } from "pg"
import { isAnyActive } from "./workflow-engine";

export type WorkflowEntityState = {
    entity_id: string;
    entity_code: string;
    date_time: string;
    action_code: string;
    from_state_code: string;
    to_state_code: string;
    assigned_to_user_id: number;
    assigned_to_user_name: string;
    user_id: number;
    user_name: string;
}

const query_entity_state = `
SELECT 
  wes.entity_id AS "entity_id",
  wes.entity_code AS "entity_code",
  wes.date_time AS "date_time",
  wes.action_code AS "action_code",
  wa.from_state as "from_state_code",
  wa.to_state as "to_state_code",
  wes.assigned_to_user_id AS "assinged_to_user_id",
  wes.assigned_to_user_name AS "assigned_to_user_name",
  wes.user_id AS "user_id",
  wes.user_name as "user_name"
FROM workflow_entity_state wes
JOIN workflow_action wa on wa.code = wes.action_code
WHERE entity_id = $1 and entity_code = $2
`

export async function getEntityState(client: PoolClient, entityId: string, entityCode: string) {
    const query = {
        name: 'workflow_get_entity_state',
        text: query_entity_state,
        values:[entityId, entityCode]
    }
    const es = await client.query(query);
    if (es.rows.length === 0) throw error (`Could not find entity state for entityId ${entityId} and code ${entityCode} `)
    if (es.rows.length > 1) throw error (`Found more than one entity state for entityId ${entityId} and code ${entityCode}`) 
    const res: WorkflowEntityState = es.rows[0]
    return res;
}

const insert_entity_state_log = `
INSERT INTO workflow_entity_state_log
SELECT 
  entity_id,
  entity_code,
  date_time,
  action_code,
  action_name,
  from_state_code,
  from_state_name,
  to_state_code,
  to_state_name,
  priority,
  priority_num,
  assigned_to_user_id,
  assigned_to_user_name,
  assigned_to_team_id,
  assigned_to_team_name,
  user_id,
  user_name
FROM workflow_entity_state
WHERE entity_id = $1 and entity_code = $2
`

export async function copyToEntityStateLog(client: PoolClient, entityId: string, entityCode: string) {
    const query = {
        name: 'workflow_insert_state_log',
        text: insert_entity_state_log,
        values:[entityId, entityCode]
    }
    client.query(query, (err) => {
        if (err) throw new Error(`Error Updating workflow_entity_state_log for entityId ${entityId} and entityCode ${entityCode}. Err=${err}`)
    });
}

/* Query to update entity state log. This has some logic to make sure the current from and to state are not 
 * overwritten if the action from state is 'any_active' 
*/
const update_entity_state_log = `
WITH action_details AS (
    SELECT 
        wa.name AS action_name,
        ws_from.code AS from_state_code,
        ws_from.name AS from_state_name,
        ws_to.code AS to_state_code,
        ws_to.name AS to_state_name
    FROM workflow_action wa
    JOIN workflow_state ws_from ON wa.from_state = ws_from.code
    JOIN workflow_state ws_to ON wa.to_state = ws_to.code
    WHERE wa.code = $3
),
user_details AS (
    SELECT id AS user_id FROM users WHERE name = $4
)
UPDATE workflow_entity_state wes
SET
    date_time = CURRENT_TIMESTAMP,
    action_code = $3,
    action_name = ad.action_name,
    from_state_code = CASE WHEN $5 THEN wes.from_state_code ELSE ad.from_state_code END,
    from_state_name = CASE WHEN $5 THEN wes.from_state_name ELSE ad.from_state_name END,
    to_state_code = CASE WHEN $5 THEN wes.to_state_code ELSE ad.to_state_code END,
    to_state_name = CASE WHEN $5 THEN wes.to_state_name ELSE ad.to_state_name END,
    user_id = ud.user_id,
    user_name = $4
FROM action_details ad, user_details ud
WHERE entity_id = $1 AND entity_code = $2
`

export async function updateEntityState(client: PoolClient, entityId: string, entityCode: string, actionCode: string, fromStateCode: string, userName: string) {
    const query = {
        name: 'workflow_update_entity_state',
        text: update_entity_state_log,
        values:[entityId, entityCode, actionCode, userName, isAnyActive(fromStateCode)]
    }
    client.query(query).catch((err) => {
        throw new Error(`Error Updating workflow_entity_state for entityId ${entityId} and entityCode ${entityCode}. Err=${err}`)    
    })
}

const update_entity_state_log_assign_user = `
WITH user_details AS (
    SELECT id AS user_id FROM users WHERE name = $3
)
UPDATE workflow_entity_state SET
    get_lease_user_name = NULL,
    get_lease_expires = NULL, 
    assigned_to_user_id = ud.user_id,
    assigned_to_user_name = $3,
    assigned_to_team_id = NULL,
    assigned_to_team_name = NULL
FROM user_details ud
WHERE entity_id = $1 and entity_code = $2
`

export async function updateEntityAssignUser(client: PoolClient, entityId: string, entityCode: string, assignUserName: string) {
    const query = {
        name: 'workflow_update_entity_state_assign_user',
        text: update_entity_state_log_assign_user,
        values:[entityId, entityCode, assignUserName]
    }
    client.query(query).catch((err) => {
        throw new Error(`Error Updating workflow_entity_state_assing_user for entityId ${entityId} and entityCode ${entityCode}. Err=${err}`)    
    })
};

const update_entity_state_log_assign_team = `
WITH team_details AS (
    SELECT id AS team_id from user_team WHERE name = $3
)
UPDATE workflow_entity_state SET 
    assigned_to_user_id = NULL,
    assigned_to_user_name = NULL,
    assigned_to_team_id = team.id,
    assigned_to_team_name = $3
FROM team_details td 
WHERE entity_id = $1 and entity_code = $2
`

export async function updateEntityAssignTeam(client: PoolClient, entityId: string, entityCode: string, assignTeamName: string) {
    const query = {
        name: 'workflow_update_entity_state_assign_team',
        text: update_entity_state_log_assign_team,
        values:[entityId, entityCode, assignTeamName]
    }
    client.query(query).catch((err) => {
        throw new Error(`Error Updating workflow_entity_state_assing_user for entityId ${entityId} and entityCode ${entityCode}. Err=${err}`)    
    })
};