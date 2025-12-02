import { PoolClient } from "pg";
import { WorkflowContext } from "../types";
import { FunctionChangeEntityState } from "./implementations/change-entity-state";
import { FunctionChangeEntityStateAssignUser } from "./implementations/change-entity-state-assign-user";
import { FunctionChangeEntityStateAssignTeam } from "./implementations/change-entity-state-assign-team";
import { FunctionCreateEntity } from "./implementations/create-entity";
import { FunctionSendMail } from "./implementations/send-mail";
import { FunctionEvalEngine } from "./implementations/eval-engine";
import { FunctionUploadDocument } from "./implementations/upload-document";
import { FunctionChangeEntityStateGetNext } from "./implementations/change-entity-state-get-next";

export interface IWorkflowFunction {
    code: string;
    run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }>;
}

/**
* A registry mapping function codes to their implementations.
*/
export const workflowFunctionRegistry: {
    [code: string]: IWorkflowFunction;
} = {};

// Register sample functions.
workflowFunctionRegistry['function.entity.change_state'] = new FunctionChangeEntityState();
workflowFunctionRegistry['function.entity.change_state.assign_user'] = new FunctionChangeEntityStateAssignUser();
workflowFunctionRegistry['function.entity.change_state.assign_team'] = new FunctionChangeEntityStateAssignTeam();
workflowFunctionRegistry['function.entity.create'] = new FunctionCreateEntity();
workflowFunctionRegistry['function.mail'] = new FunctionSendMail();
workflowFunctionRegistry['function.eval_engine'] = new FunctionEvalEngine();
workflowFunctionRegistry['function.document.upload'] = new FunctionUploadDocument();
workflowFunctionRegistry['function.entity.change_state.get_next'] = new FunctionChangeEntityStateGetNext();