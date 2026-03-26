import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { dispatchOutboundRfi } from "@/lib/rfi/rfi-service";

export class FunctionRfiRequestSend implements IWorkflowFunction {

    code = 'function.rfi_request.send';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {

        const rfiId = getInput(this.code, inputs, 'function.rfi_request.send.rfi_id', isString)
        const { delivery_result} = await dispatchOutboundRfi(rfiId, client)

        return delivery_result
    }
}