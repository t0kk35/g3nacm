import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString, isRecord, isStringOrUndefined } from "../function-helpers";
import { createOutboundRfiResponse } from "@/lib/rfi/rfi-service";
import { CreateOutboundRfiResponseParams } from "@/lib/rfi/types";
import { createEntity } from "../../workflow-data";

export class FunctionRfiResponseCreate implements IWorkflowFunction {

    code = 'function.rfi_response.create';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {

        const responseEntityCode =  getInput(this.code, inputs, 'function.rfi_response.create.rfi_response_entity_code', isString);
        const rfiRequestId = getInput(this.code, inputs, 'function.rfi_response.create.rfi_request_id', isString);
        const bodyText = getInput(this.code, inputs, 'function.rfi_response.create.body_text', isStringOrUndefined);
        const fromName = getInput(this.code, inputs, 'function.rfi_response.create.from_name', isStringOrUndefined);
        const responseData = getInput(this.code, inputs, 'function.rfi_response.create.response_data', isRecord);
        const respondentContact = getInput(this.code, inputs, 'function.rfi_response.create.respondent_contact', isRecord);

        const params: CreateOutboundRfiResponseParams = {
            entity_code: responseEntityCode,
            rfi_request_id: rfiRequestId,
            body_text: bodyText,
            from_name: fromName,
            response_data: responseData,
            respondent_contact: respondentContact
        }

        const responseId = await createOutboundRfiResponse(params, client)
        // Create the workflow_entity_state entry.
        await createEntity(client, responseId, responseEntityCode, responseId, ctx.system.orgUnitCode, ctx.system.userName);
        
        return {
            function : {
                rfi_response: {
                    create :{
                        id: responseId
                    }
                }
            } 
        }
    }
}