import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { createEntity } from "../../workflow-data";
import { generateIdentifier } from "@/lib/helpers";

const query_insert_text = `
INSERT INTO notification (
    identifier,
    sender_user_id,
    receiver_user_id,
    sender_user_name,
    receiver_user_name,
    linked_entity_id,
    linked_entity_code,
    title,
    body
) VALUES (
    'PENDING',
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

const query_update_text = `
UPDATE notification
SET identifer = $2
WHERE id = $1 
`

export class FunctionNotificationCreate implements IWorkflowFunction {
    
    code = 'function.notification.create';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        
        const senderUser = ctx.system.userName;
        const receiverUser = getInput(this.code, inputs, 'function.notification.create.receiver_user_name', isString);
        const title = getInput(this.code, inputs, 'function.notification.create.title', isString);
        const body = getInput(this.code, inputs, 'function.notification.create.body', isString);
        const notificationEntityCode =  getInput(this.code, inputs, 'function.notification.create.notification_entity_code', isString);

        const query_insert = {
            name: this.code,
            text: query_insert_text,
            values:[senderUser, receiverUser, ctx.system.entityId, ctx.system.entityCode, title, body]
        };

        const res = await client.query(query_insert);
        if (res.rows.length !== 1) throw new Error ('Something when wrong trying to create a notification')
        const notification = res.rows[0];
        const identifier = generateIdentifier('NTF', notification.id, new Date())
        // Update the identifier
        const query_update = {
            name: this.code,
            text: query_update_text,
            values:[notification.id, identifier]
        };
        await client.query(query_update);
        // Create the workflow_entity_state entry.
        await createEntity(client, notification.id, notificationEntityCode, identifier, ctx.system.orgUnitCode, ctx.system.userName);
        
        // Return a reference to the newly created notification.
        return {
            function: {
                notification: {
                    create: {
                        notification_id: notification.id
                    }
                }
            }
        };
    }
}