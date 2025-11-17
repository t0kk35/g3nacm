import { BaseError } from "../base-error";
import { WorkflowAction } from "@/app/api/data/workflow/types";
import { IWorkflowFunction } from "./function/function";

export class WorkflowError extends BaseError {
    constructor(code: string, origin: string, message: string, cause?: Error) {
        super(code, origin, message, cause)
    }
}

export enum ErrorCode {
    WFL_ACTION_NOT_FOUND = "WRKA_00001",
    WFL_ACTION_NO_PERMISSION = "WRKA_00002",
    WFL_ACTION_INVALID_ANY_TRANSITION = "WRKA_00003",
    WFL_ACTION_INVALID_TRANSITION = "WRKA_00004",
    WFL_ACTION_FUNCTION_NOT_REGISTERED = "WRKA_00005",
    WFL_CONTEXT_CAN_NOT_OVERWRITE_CONTEXT = "WRKC_00001",
    WFL_CONTEXT_UNKNOWN_REPLACEMENT_SOURCE = "WRKC_00002",
    WFL_CONTEXT_CAN_NOT_FIND_ENV_SETTING = "WRKC_00003",
    WFL_CONTEXT_CAN_NOT_FIND_CONTEXT_SETTING = "WRKC_00004",
    WFL_FUNC_CLAIM_LEASE_USER_DOES_NOT_HAVE_LEASE = "WRLF_00001",
}

const errorDefinition = new Map<ErrorCode, string>([
    [ErrorCode.WFL_ACTION_NOT_FOUND, 'Action with code "{action_code}" is not defined in workflow.'],
    [ErrorCode.WFL_ACTION_NO_PERMISSION, 'User "{user}" does not have permission to perform action "{action_code}"'],
    [ErrorCode.WFL_ACTION_INVALID_ANY_TRANSITION, 'Invalid transition: action "{action_code}" from_state is any_active, but actual entity from_state "{entity_from_state_code}" is not active'],
    [ErrorCode.WFL_ACTION_INVALID_TRANSITION, 'Invalid transition: current state "{entity_from_state_code}" does not match required state "{action_from_state_code}" for action "{action_code}"'],
    [ErrorCode.WFL_ACTION_FUNCTION_NOT_REGISTERED, 'Performing action {action_code}. Workflow function with code "{func_code}" is not registered in function registry'],
    [ErrorCode.WFL_CONTEXT_CAN_NOT_OVERWRITE_CONTEXT, 'Can not overwrite system context variable "{output_param_code}" with mapping "{optput_param_context_mapping}" in function "{function_code}" performing action "{action_code}"'],
    [ErrorCode.WFL_CONTEXT_UNKNOWN_REPLACEMENT_SOURCE, 'Unknown Replacement source "{source}" for setting "{setting_path}", can not replace in context'],
    [ErrorCode.WFL_CONTEXT_CAN_NOT_FIND_ENV_SETTING, 'Missing env variable: "{setting_path}". Can not resolve setting'],
    [ErrorCode.WFL_CONTEXT_CAN_NOT_FIND_CONTEXT_SETTING, 'Missing context variable: "{setting_path}". Can not resolve setting'],
    [ErrorCode.WFL_FUNC_CLAIM_LEASE_USER_DOES_NOT_HAVE_LEASE, 'User "{user_name}" does not hold the lease to entity-id "{entity_id}" and entity-code "{entity_code}"']
]);

// Type-safe error creators
export const WorkflowErrorCreators: {
    action: {
        assertActionExists: (origin: string, actionCode: string, action: WorkflowAction | undefined) => asserts action is WorkflowAction;
        noActionPermission: (origin: string, userName: string, action: string) => never;
        invalidAnyStateTransition: (origin: string, actionCode: string, entityFromStateCode: string) => never;
        invalidStateTransition: (origin: string, actionCode: string, actionFromStateCode: string, entityFromStateCode: string) => never;
        assertFunctionRegistered: (origin: string, actionCode: string, workflowFunctionCode: string, workflowFunction: IWorkflowFunction | undefined) => asserts workflowFunction is IWorkflowFunction
    },
    context: {
        canNotOverWriteSystem: (origin: string, actionCode: string, functionCode: string, outputParamCode: string, outputParamContextMapping: string) => never;
        unknowSettingSource: (origin: string, source: string, setting_path: string) => never;
        canNotFindEnvSetting: (origin: string, settingPath: string) => never;
        canNotFindContextSetting: (origin: string, settingPath: string) => never;
    }
    function: {
        userDoesNotHaveLease: (origin: string, userName: string, entity_id: string, entity_code: string) => never;
    }
} = {
    action: {
        assertActionExists: (origin: string, actionCode: string, action: WorkflowAction | undefined): asserts action is WorkflowAction => {
            if (!action) workflowErrorCreator(ErrorCode.WFL_ACTION_NOT_FOUND, origin, {'action_code': actionCode});
        },
        noActionPermission: (origin: string, userName: string, actionCode: string): never => workflowErrorCreator(ErrorCode.WFL_ACTION_NO_PERMISSION, origin, {'user': userName, 'action_code': actionCode }),
        invalidAnyStateTransition: (origin: string, actionCode: string, entityFromStateCode: string): never => workflowErrorCreator(ErrorCode.WFL_ACTION_INVALID_ANY_TRANSITION, origin, {'action_code': actionCode, 'entity_from_state_code': entityFromStateCode}),
        invalidStateTransition: (origin: string, actionCode: string, actionFromStateCode: string, entityFromStateCode: string): never => workflowErrorCreator(ErrorCode.WFL_ACTION_INVALID_TRANSITION, origin, {'action_code': actionCode, 'action_from_state_code': actionFromStateCode, 'entity_from_state_code': entityFromStateCode}),
        assertFunctionRegistered: (origin: string, actionCode: string, workflowFunctionCode: string, workflowFunction: IWorkflowFunction | undefined): asserts workflowFunction is IWorkflowFunction => {
            if (!workflowFunction) workflowErrorCreator(ErrorCode.WFL_ACTION_FUNCTION_NOT_REGISTERED, origin, {'action_code': actionCode, 'func_code': workflowFunctionCode})
        }
    },
    context: {
        canNotOverWriteSystem: (origin: string, actionCode: string, functionCode: string, outputParamCode: string, outputParamContextMapping: string): never => workflowErrorCreator(ErrorCode.WFL_CONTEXT_CAN_NOT_OVERWRITE_CONTEXT, origin, {'action_code': actionCode, 'function_code': functionCode, 'output_param_code': outputParamCode, 'optput_param_context_mapping': outputParamContextMapping}),
        unknowSettingSource: (origin: string, source: string, settingPath: string): never => workflowErrorCreator(ErrorCode.WFL_CONTEXT_UNKNOWN_REPLACEMENT_SOURCE, origin, {'source': source, 'setting_path': settingPath }),
        canNotFindEnvSetting: (origin: string, settingPath: string): never => workflowErrorCreator(ErrorCode.WFL_CONTEXT_CAN_NOT_FIND_ENV_SETTING, origin, {'setting_path': settingPath}),
        canNotFindContextSetting: (origin, settingPath): never => workflowErrorCreator(ErrorCode.WFL_CONTEXT_CAN_NOT_FIND_CONTEXT_SETTING, origin, {'setting_path': settingPath}),
    },
    function: {
        userDoesNotHaveLease: (origin: string, userName: string, entity_id: string, entity_code: string): never => workflowErrorCreator(ErrorCode.WFL_FUNC_CLAIM_LEASE_USER_DOES_NOT_HAVE_LEASE, origin, {'user_name': userName, 'entity_id': entity_id, 'entity_code': entity_code})
    }
}

function workflowErrorCreator(
    errorCode: ErrorCode,
    origin: string,
    replacements: Record<string, any> | undefined=undefined,
    embeddedError: Error | undefined = undefined): never {
    
    const error = errorDefinition.get(errorCode);
    if (!error) {
        throw new WorkflowError('INT_00001', 'WorkflowError', `Could not find error with code ${errorCode}`)
    } else {
        const errorMessage = replacements ? formatMessage(error, replacements) : error;
        console.log(`WorflowError. Code = '${errorCode}' Message = '${errorMessage}`)
        throw new WorkflowError(errorCode, origin, errorMessage, embeddedError)
    }
}

function formatMessage(message: string, replacements: Record<string, any>) {
    return message.replace(/{(\w+)}/g, (_, key) => replacements[key] || `{${key}}`);
}