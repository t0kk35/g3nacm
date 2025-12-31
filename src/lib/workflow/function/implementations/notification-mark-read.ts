import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { updateEntityState, copyToEntityStateLog } from "../../workflow-data";

const query_text = `
UPDATE notification
SET read_date_time = now()
WHERE receiver_user_name = $1
AND id = $2
`
/**
 * Workflow function that marks a notification as read.
 */

export class FunctionNotificationMarkRead implements IWorkflowFunction {
    
    code = 'function.notification.mark_read';

    async run(_inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        // Update the notification
        const query = {
            name: this.code,
            text: query_text,
            values:[ctx.system.userName, ctx.system.entityId]
        };
        await client.query(query);
        // Do the standard entity_state stuff.
        copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName, null);
        // No need to return anything
        return {}
    }

}