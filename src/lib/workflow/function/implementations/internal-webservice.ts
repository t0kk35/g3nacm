import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString, isRecord } from "../function-helpers";
import { authorizedFetch } from "@/lib/org-filtering";

export class FunctionInternalWebService implements IWorkflowFunction {
    code = 'function.internal_webservice';
    
    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        // Create the URL
        const url = getInput(this.code, inputs, 'function.internal_webservice.url', isString);
        const replacements = getInput(this.code, inputs, 'function.internal_webservice.replacements', isRecord)
        const fetchData = await authorizedFetch(`${process.env.DATA_URL}/url?group=$something....`);
        return { eval: fetchData};
    }
}