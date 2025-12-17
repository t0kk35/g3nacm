import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { error } from "console";

const query_text = `
INSERT INTO notification (
    sender_user_id,
    receiver_user_id,
    sender_user_name,
    receiver_user_name,
    linked_entity_id,
    linked_entity_code,
    title,
    body
) VALUES (
    (SELECT id FROM users WHERE name = $1),
    (SELECT id FROM users WHERE name = $2),
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
) RETURNING (id, code)
`

export class FunctionNotificationCreate implements IWorkflowFunction {
    
    code = 'function.notification.create';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        
        const senderUser = ctx.system.userName;
        const receiverUser = getInput(this.code, inputs, 'function.notification.create.receiver_user_name', isString);
        const title = getInput(this.code, inputs, 'function.notification.create.title', isString);
        const body = getInput(this.code, inputs, 'function.notification.create.body', isString);

        const query = {
            name: this.code,
            text: query_text,
            values:[senderUser, receiverUser, ctx.system.entityId, ctx.system.entityCode, title, body]
        };

        const res = await client.query(query);
        if (res.rows.length !== 1) throw error ('Something when wrong trying to create a notification')
        const notification = res.rows[0];
        
        // Return a reference to the newly created notification.
        return {
            notification_id: notification.id
        };
    }
}