import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";

export class FunctionSendMail implements IWorkflowFunction {
    code = 'function.mail';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        const mailAddress = getInput(this.code, inputs, 'function.mail.email', isString);
        const mailText = getInput(this.code, inputs, 'function.mail.text', isString);
        console.log('Sending mail to' + mailAddress + ' with text ' + mailText )
        return { 'function.mail.success' : true };
    }
}       