import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { createOutboundRfi } from "@/lib/rfi/rfi-service";
import { CreateOutboundRfiParams } from "@/lib/rfi/types";
import { createEntity } from "../../workflow-data";

export class FunctionRfiRequestCreate implements IWorkflowFunction {
    
    code = 'function.rfi_request.create';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {

        const rfiEntityCode =  getInput(this.code, inputs, 'function.rfi_request.create.rfi_entity_code', isString);
        const channelCode = getInput(this.code, inputs, 'function.rfi_request.create.channel_code', isString);
        const title = getInput(this.code, inputs, 'function.rfi_request.create.title', isString);
        const body = getInput(this.code, inputs, 'function.rfi_request.create.body', isString);
        const recipientSubjectId = getInput(this.code, inputs, 'function.rfi_request.create.recipient_subject_id', isString);
        const dueDateTime = getInput(this.code, inputs, 'function.rfi_request.create.due_datetime', isString);

        const parms: CreateOutboundRfiParams = {
            channel_code: channelCode,
            entity_code: rfiEntityCode,
            org_unit_code: ctx.system.orgUnitCode,
            linked_entity_id: ctx.system.entityId,
            linked_entity_code: ctx.system.entityCode,
            title: title,
            body: body,
            recipient_subject_id: recipientSubjectId,
            due_datetime: dueDateTime
        };

        const { rfi_id, identifier } = await createOutboundRfi(parms, client);

        // Create workflow_entity_state for the RFI. Assign to the current user.
        await createEntity(client, rfi_id, rfiEntityCode, ctx.system.orgUnitCode, ctx.system.userName);

        return {
            function : {
                rfi_request: {
                    create :{
                        rfi_id: rfi_id
                    }
                }
            }
        }
    }
}