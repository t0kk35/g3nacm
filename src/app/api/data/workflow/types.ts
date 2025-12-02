/**
 * Workflow configuration types.
 */

export enum WorkflowParameterType {
    STRING = "string",
    NUMBER = "number",
    BOOLEAN = "boolean",
    OBJECT = "object"
}

export enum WorkflowParmaterDirection {
    INPUT = "Input",
    OUTPUT = "Output"
}

export enum WorkflowTrigger {
    GET = "get",
    AUTO = "auto",
    USER = "user",
    SYSTEM = "system"
}

// Entities on which we can perform workflow actions
export type WorkflowEntity = {
    code: string;
    name: string;
}

// Each state has a unique code.
export type WorkflowState = {
    code: string;
    name: string;
    is_active: boolean;
}

// Each workflow function has a set of parameters is can accept and a mapping from/to the context
export type WorkflowFunctionParameter = {
    code: string;
    function_code: string;
    name: string;
    parameter_type: WorkflowParameterType;
    direction: WorkflowParmaterDirection;
    context_mapping: string;
}

export type WorkflowFunctionSetting = {
    code: string,
    name: string,
    value: any;
}

// A workflow action can have functions that get executed
export type WorkflowFunction = {
    code: string;
    name: string;
    order: number;
    input_parameters: WorkflowFunctionParameter[];
    output_parameters: WorkflowFunctionParameter[];
    settings?: WorkflowFunctionSetting[];
}

// Some workflow actions have a form and a set of fields in that form.
export type WorkflowFormField = {
    code: string;
    type: string;
    name: string;
    label: string;
    placeholder: string;
    required: boolean;
    order: number;
    options?: { value: string; label: string }[];
  }

// Each action has a unique code, a source state (from), a target state (to),
// and an ordered list of workflow function codes to execute.
export type WorkflowAction = {
    code: string;
    name: string;
    description: string;
    trigger: WorkflowTrigger;
    from_state_code: string;
    to_state_code: string;
    redirect_url: string;
    permission: string;
    form_fields: WorkflowFormField[];
    functions: WorkflowFunction[];
}

// The workflow configuration for an entity.
export type WorkflowConfig = {
    workflow_code: string;
    entity_code: string;
    entity_description: string 
    workflow_description: string;
    org_unit_code: string;
    states: WorkflowState[];
    actions: WorkflowAction[];
  }