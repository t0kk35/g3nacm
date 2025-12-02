import { NextResponse } from "next/server"

type errorParams = {
    httpCode: number,
    text: string
}

export type APIError = {
    errorCode: string
    message: string
    origin: string
    embeddedError?:Error
}

export enum ErrorCode {
    // Authentication Errors (401)
    /** Session could not be retrieved for authorization */
    AUTH_MISSING_SESSION = "AUTH_00001",
    /** User not found in session during authorization */
    AUTH_MISSING_USER = "AUTH_00002",
    /** Authorisation header is missing in the request */
    AUTH_HEADER_MISSING = "AUTH_00003",
    /** A bearer check failed, token is invalid */
    AUTH_BEARER_CHECK_FAIL = "AUTH_00004",
    /** The user could not be found in the database */
    AUTH_USER_NOT_FOUND = "AUTH_00005",
    /** The provided password does not match the one in the database */
    AUTH_PASSWORD_CHECK_FAIL = "AUTH_00006",
    /** Could not get the password secret to encode the password */
    AUT_PASSWORD_SECRET_NOT_FOUND = "AUTH_00007",

    // Parameter Validation Errors (400)
    /** Required URL parameter missing. Replacements: {param} */
    PARAM_URL_MISSING = "PARM_00001",
    /** Required POST body parameter missing. Replacements: {param} */
    PARAM_BODY_MISSING = "PARM_00002",
    /** Parameter type validation failed. Replacements: {param, param_type, actual_type} */
    PARAM_TYPE_INVALID = "PARM_00003",
    /** A parsed object is not valid JSON */
    PARAM_JSON_INVALID = "PARM_00004",
    /** A parameter could not be parsed into a date */
    PARAM_DATE_INVALID = "PARM_00005",
    /** The provided time range parameter could not be parsed */
    PARAM_TIMERANGE_INVALID = "PARM_0006",

    // Database Errors (500)
    /** Database query execution failed. Replacements: {query_name, error_message} */
    DB_QUERY_FAILED = "DB_00001",
    /** Database connection failed */
    DB_CONNECTION_FAILED = "DB_00002",
    /** Database no returing data */
    DB_NO_RETURNING = "DB_00003",
    /** Entity not Found */
    DB_NOT_FOUND = "DB_00004",
    /** Entity not Unique */
    DB_NOT_UNIQUE = "DB_00005",

    // Validation Errors (400)
    /** Enity not unique */
    ORG_NOT_UNIQUE = "ORGU_00001",
    ORG_HAS_CHILDREN = "ORGU_00002",
    
    /** Workflow for entity and org unit not found */
    WORKFLOW_NOT_FOUND = "WRKF_00001",
    /** Worflow for entity and org unit not unique */
    WORKFLOW_NOT_UNIQUE = "WRKF_00002",
    /** Could not find workflow action for get_next operation */
    WORKFLOW_NO_GET_NEXT_ACTION = "WRKL_00003",

    /** Unknown agent */
    AGENT_NOT_FOUND = "AGNT_000001",
    /** Invalid agent type */
    AGENT_INVALID_TYPE = "AGNT_000002",

    /** Schema Not Found */
    SCHEMA_NOT_FOUND = "SCHM_00001",

    VALID_SCHEMA_FAILED = "VALID_00001",
    VALID_BUSINESS_RULE = "VALID_00002",

    // Authorization Errors (403) 
    PERM_INSUFFICIENT_PERMISSION = "PERM_00001",
    PERM_RESOURCE_ACCESS_DENIED = "PERM_00002",
    PERM_ONLY_OWN_USER = "PERM_00003",

    // Resource Errors (404)
    RESOURCE_NOT_FOUND = "RES_00001",
    RESOURCE_DELETED = "RES_00002",

    // Business Logic Errors (409)
    BIZ_ENTITY_LOCKED = "BIZ_00001",
    BIZ_WORKFLOW_INVALID_STATE = "BIZ_00002",
}

// Type-safe error creators
export const ErrorCreators = {
    auth: {
        /** Error code 'AUTH_00001'. Session could not be retrieved for authorization */
        missingSession: (origin: string) => createErrorResponse(ErrorCode.AUTH_MISSING_SESSION, origin),
        /** Error code 'AUTH_00002'. User not found in session during authorization */
        missingUser: (origin: string) => createErrorResponse(ErrorCode.AUTH_MISSING_USER, origin),
        /** Error code 'AUTH_00003'. Could not find the authorisation header in the request */
        missingAuthHeader: (origin: string) => createErrorResponse(ErrorCode.AUTH_HEADER_MISSING, origin),
        /** Error code 'AUTH_00004'. Bearer token check fail. Token seems to be invalid */
        failedBearerCheck: (origin: string) => createErrorResponse(ErrorCode.AUTH_BEARER_CHECK_FAIL, origin),
        /** Error code 'AUTH_00005'. Could not find user in the database */
        userNotFound: (origin: string, user_name:string) => createErrorResponse(ErrorCode.AUTH_USER_NOT_FOUND, origin, {'user_name': user_name}),
        /** Error code 'AUTH_00006'. Password check failed */
        passwordFail: (origin: string, user_name:string) => createErrorResponse(ErrorCode.AUTH_PASSWORD_CHECK_FAIL, origin, {'user_name': user_name}),
        /** Error code 'AUTH_00007'. Password secret missing */
        passwordSecretNotFound: (origin: string) => createErrorResponse(ErrorCode.AUT_PASSWORD_SECRET_NOT_FOUND, origin),
    },

    param: {
        /** Error code 'PARAM_00001'. Required URL parameter missing. {param} is the parameter we looked for */
        urlMissing: (origin: string, param: string) => createErrorResponse(ErrorCode.PARAM_URL_MISSING, origin, { 'param': param }),
        /** Error code 'PARAM_00002'. Required POST body parameter missing. {param} is the field in the body we were looking for */
        bodyMissing: (origin: string, param: string) => createErrorResponse(ErrorCode.PARAM_BODY_MISSING, origin, { 'param': param }),
        /** Error code 'PARAM_00003'. Parameter type validation failed. Parameter of unexpected type. Replacements: {param, param_type, actual_type} */
        typeInvalid: (origin: string, param: string, expectedType: string, actualType: string) => 
            createErrorResponse(ErrorCode.PARAM_TYPE_INVALID, origin, {
                'param': param, 'param_type': expectedType, 'actual_type': actualType
            }),
        /** Error code 'PARAM_00004'. Parameter validation failed. Object did not contain valid JSON {value} */
        invalidJSON: (origin: string, param: string, value: string) => createErrorResponse(ErrorCode.PARAM_JSON_INVALID, origin, { 'param': param, 'value': value }), 
        invalidDate: (origin: string, param: string, value: string) => createErrorResponse(ErrorCode.PARAM_DATE_INVALID, origin, { 'param': param, 'value': value }),
        invalidTimeRange: (origin: string, param: string, value: string) => createErrorResponse(ErrorCode.PARAM_TIMERANGE_INVALID, origin, { 'param': param, 'value': value})
    },
    db: {
        queryFailed: (origin: string, action: string, error: Error) => createErrorResponse(ErrorCode.DB_QUERY_FAILED, origin, { 'action': action, 'error_message': error.message }, error),
        noReturning: (origin: string, operation: string) => createErrorResponse(ErrorCode.DB_NO_RETURNING, origin, {'operation': operation}),
        entityNotFound: (origin: string, entity: string, id: string) => createErrorResponse(ErrorCode.DB_NOT_FOUND, origin, {'entity': entity, 'id': id}),
        entityNotUnique: (origin: string, entity: string, id: string) => createErrorResponse(ErrorCode.DB_NOT_UNIQUE, origin, {'entity': entity, 'id': id}),
    },
    org: {
        notUnique: (origin: string, code: string) => createErrorResponse(ErrorCode.ORG_NOT_UNIQUE, origin, { 'code': code }),
        hasChildren: (origin: string, id: string) => createErrorResponse(ErrorCode.ORG_HAS_CHILDREN, origin, { 'id': id })
    },
    schema: {
        notFound: (origin: string, name: string, version: string) => createErrorResponse(ErrorCode.SCHEMA_NOT_FOUND, origin, {'name': name, 'version': version }),
    },
    workflow: {
        notFound: (origin: string, entity_code: string, org_unit_code: string) => createErrorResponse(ErrorCode.WORKFLOW_NOT_FOUND, origin, {'entity_code': entity_code, 'org_unit_code': org_unit_code }),
        notUnique: (origin: string, entity_code: string, org_unit_code: string) => createErrorResponse(ErrorCode.WORKFLOW_NOT_UNIQUE, origin, {'entity_code': entity_code, 'org_unit_code': org_unit_code }),
        noGetNextAction: (origin: string, entity_code: string, entity_id: string, org_unit_code: string, to_state_code: string) => createErrorResponse(ErrorCode.WORKFLOW_NO_GET_NEXT_ACTION, origin, {'entity_code': entity_code, 'entity_id': entity_id, 'org_unit_code': org_unit_code, 'to_state_code': to_state_code})
    },
    perm: {
        onlyOwnUser: (origin: string, auth_user: string, req_user: string) => createErrorResponse(ErrorCode.PERM_ONLY_OWN_USER, origin, {'auth_user': auth_user, 'req_user': req_user }),
        insufficientPermissions: (origin: string, required_permissions: string[]) => createErrorResponse(ErrorCode.PERM_INSUFFICIENT_PERMISSION, origin, {'required_permissions': required_permissions.join(', ') }),
        resourceAccessDenied: (origin: string, resource: string) => createErrorResponse(ErrorCode.PERM_RESOURCE_ACCESS_DENIED, origin, {'resource': resource }),
    },
    agent: {
        notFound: (origin: string, name: string) => createErrorResponse(ErrorCode.AGENT_NOT_FOUND, origin, { 'name': name }),
        invalidType: (origin: string, name: string, expectedType: string, actualType: string) => createErrorResponse(ErrorCode.AGENT_INVALID_TYPE, origin, { 'name': name, 'expected_type': expectedType, 'actual_type': actualType }),
    }
} as const;

const errorDefinition = new Map<ErrorCode, errorParams>([
    // Authentication - 401
    [ErrorCode.AUTH_MISSING_SESSION, {
      httpCode: 401,
      text: "Authentication required - session not found"
    }],
    [ErrorCode.AUTH_MISSING_USER, {
      httpCode: 401,
      text: "Authentication required - user not found in session"
    }],
    [ErrorCode.AUTH_HEADER_MISSING, {
      httpCode: 401,
      text: "Authentication required - cound not find 'Authorization' header in request"
    }],
    [ErrorCode.AUTH_BEARER_CHECK_FAIL, {
      httpCode: 401,
      text: "Authentication required - bearer token check failed. token is not valid"
    }],
    [ErrorCode.AUTH_USER_NOT_FOUND, {
      httpCode: 401,
      text: "Authentication required - user with name '{user_name}' could not be found in the database"
    }],
    [ErrorCode.AUTH_PASSWORD_CHECK_FAIL, {
      httpCode: 401,
      text: "Authentication required - password check fail for user '{user_name}'"
    }],
    [ErrorCode.AUT_PASSWORD_SECRET_NOT_FOUND, {
      httpCode: 500,
      text: "Could not locate the password secret. Make sure to set-up a 'PASSWORD_SECRET' in the env.local file"
    }],        
    // Parameter validation - 400
    [ErrorCode.PARAM_URL_MISSING, {
      httpCode: 400,
      text: "Required URL parameter '{param}' is missing"
    }],
    [ErrorCode.PARAM_BODY_MISSING, {
      httpCode: 400,
      text: "Required field is '{param}' in request body"
    }],
    [ErrorCode.PARAM_TYPE_INVALID, {
      httpCode: 400,
      text: "Parameter '{param}' must be of type {param_type}, received {actual_type}"
    }],
    [ErrorCode.PARAM_JSON_INVALID, {
      httpCode: 400,
      text: "Parameter '{param}' did not contain valid JSON, value: '{value}'"
    }],    
    [ErrorCode.PARAM_DATE_INVALID, {
      httpCode: 400,
      text: "Parameter '{param}' is not a valid date, found value: '{value}'"
    }],
    [ErrorCode.PARAM_TIMERANGE_INVALID, {
      httpCode: 400,
      text: "Parameter '{param}' is not a valid time range, found time range: '{value}'"
    }],            
    [ErrorCode.ORG_NOT_UNIQUE, {
      httpCode: 400,
      text: "Insert Operation failed. Org with code '{code}' already exists"
    }],
    [ErrorCode.ORG_HAS_CHILDREN, {
      httpCode: 400,
      text: "Delete Operation failed. Org with id '{id}' has children"
    }],
    // Business logic - 409
    [ErrorCode.BIZ_ENTITY_LOCKED, {
      httpCode: 409,
      text: "Entity '{entity_type}' with ID '{entity_id}' is currently locked by another user"
    }],
    // DB Error - 500
    [ErrorCode.DB_QUERY_FAILED, {
      httpCode: 500,
      text: "Database Error performing action '{action}' Error message: '{error_message}'"
    }],
    [ErrorCode.DB_NO_RETURNING, {
      httpCode: 500,
      text: "Expected query to have returning data, but it did not. Trying operation: '{operation}'"
    }],
    [ErrorCode.DB_NOT_FOUND, {
      httpCode:404,
      text: "Entity '{entity}' with id '{id}' could not be found in the database"
    }],
    [ErrorCode.DB_NOT_UNIQUE, {
      httpCode:400,
      text: "Entity '{entity}' with id '{id}' is not unique"
    }],
    [ErrorCode.SCHEMA_NOT_FOUND, {
      httpCode: 404,
      text: "Schema not found for name: '{name}', version: '{version}'"
    }],
    [ErrorCode.WORKFLOW_NOT_FOUND, {
      httpCode: 404,
      text: "Could not find workflow for entity '{entity_code}' and org '{org_unit_code}'"
    }],
    [ErrorCode.WORKFLOW_NOT_UNIQUE, {
      httpCode: 400,
      text: "Not unique. Found more than 1 workflow for entity '{entity_code}' and org '{org_unit_code}'"
    }],
    [ErrorCode.WORKFLOW_NO_GET_NEXT_ACTION, {
      httpCode: 400,
      text: "Could not find an action that fits a get_next operation for code '{entity_code}', id '{entity_id}', org '{org_unit_code}' and state '{to_state}'"
    }],
    [ErrorCode.PERM_INSUFFICIENT_PERMISSION, {
      httpCode: 403,
      text: "Insufficient permissions. Required permissions: {required_permissions}"
    }],
    [ErrorCode.PERM_RESOURCE_ACCESS_DENIED, {
      httpCode: 403,
      text: "Access denied to resource: {resource}"
    }],
    [ErrorCode.PERM_ONLY_OWN_USER, {
      httpCode: 403,
      text: "Operation can only be performed for your own user. Authenticated user '{auth_user}'. Requested User '{req_user}'"
    }],
    [ErrorCode.AGENT_NOT_FOUND, {
      httpCode: 400,
      text: "Request to use an unknow/undefined agent : '{name}'"
    }],
    [ErrorCode.AGENT_INVALID_TYPE, {
      httpCode: 400,
      text: "Agent '{name}' is of type '{actual_type}', but expected type '{expected_type}'"
    }],
  ]);

export function createErrorResponse(
    errorCode: ErrorCode, 
    origin: string, 
    replacements: Record<string, any> | undefined=undefined,
    embeddedError: Error | undefined = undefined
):NextResponse<APIError> {
    
    const error = errorDefinition.get(errorCode);
    if (!error) {
        return NextResponse.json({ errorCode: 'INT_00001', message: `Could not find error with code ${errorCode}`, origin: 'Error Handler'})
    }
    else {
        const errorMessage = replacements ? formatMessage(error.text, replacements) : error.text;
        const responseMessage:APIError = { errorCode: errorCode, message: errorMessage, origin: origin, embeddedError: embeddedError }
        return NextResponse.json(responseMessage, { status: error.httpCode });
    }
}

function formatMessage(message: string, replacements: Record<string, any>) {
    return message.replace(/{(\w+)}/g, (_, key) => replacements[key] || `{${key}}`);
}