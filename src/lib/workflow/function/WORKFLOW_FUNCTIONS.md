# Adding New Workflow Functions

This guide explains how to add new workflow functions to the g3nACM application.

## Overview

Workflow functions are reusable components that can be executed as part of workflow actions. They follow a consistent pattern and integrate with the audit trail system.

## Step-by-Step Process

### 1. Create the Function Implementation

Create a new file in `src/lib/workflow/function/implementations/` following this template:

```typescript
import { PoolClient } from "pg";
import { WorkflowContext } from "../../types";
import { IWorkflowFunction } from "../function";
import { getInput, isString } from "../function-helpers";
import { updateEntityState, copyToEntityStateLog } from "../../workflow-data";

export class FunctionYourFunctionName implements IWorkflowFunction {
    code = 'function.category.your_function';

    async run(inputs: { [key:string]: any }, ctx: WorkflowContext, client: PoolClient): Promise<{ [key: string]: any }> {
        // ALWAYS call these first for audit trail
        copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
        updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.fromStateCode, ctx.system.userName);
        
        // Extract and validate inputs using helper functions
        const requiredParam = getInput<string>(inputs, 'requiredParam', isString, 'Required parameter is missing');
        const optionalParam = inputs.optionalParam || 'default_value';
        
        try {
            // Your function logic here
            
            // Add audit log entry
            ctx.auditLog.push(`Your function executed successfully for entity ${ctx.system.entityId}`);
            
            // Return output parameters
            return {
                outputParam1: 'value1',
                outputParam2: 'value2'
            };
            
        } catch (error) {
            const errorMessage = `Function failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
            ctx.auditLog.push(errorMessage);
            throw new Error(errorMessage);
        }
    }
}
```

### 2. Register the Function

Edit `src/lib/workflow/function/function.ts`:

**Add the import:**
```typescript
import { FunctionYourFunctionName } from "./implementations/your-function-name";
```

**Register in the registry:**
```typescript
workflowFunctionRegistry['function.category.your_function'] = new FunctionYourFunctionName();
```

### 3. Database Registration

Add entries to `script/workflow-data.sql`:

```sql
--- Your Function Name
INSERT INTO workflow_function ("code", "name") VALUES ('function.category.your_function', 'Your Function Display Name');
INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  -- Input parameters
  ('function.category.your_function.requiredParam', 'function.category.your_function', 'Required Parameter', 'string', 'Input'),
  ('function.category.your_function.optionalParam', 'function.category.your_function', 'Optional Parameter', 'string', 'Input'),
  
  -- Output parameters
  ('function.category.your_function.outputParam1', 'function.category.your_function', 'Output Parameter 1', 'string', 'Output'),
  ('function.category.your_function.outputParam2', 'function.category.your_function', 'Output Parameter 2', 'number', 'Output');
```

## Function Naming Conventions

- **Function codes**: Use dot notation like `function.category.action`
  - `function.entity.*` - Entity operations (create, state changes, assignments)
  - `function.document.*` - Document operations (upload, download, delete)
  - `function.mail.*` - Email operations
  - `function.eval_engine.*` - Rule evaluation
  - Add new categories as needed

- **Class names**: Use PascalCase starting with `Function` (e.g., `FunctionUploadDocument`)
- **File names**: Use kebab-case (e.g., `upload-document.ts`)

## Parameter Types

The system supports these parameter types:

- `'string'` - Text values
- `'number'` - Numeric values  
- `'boolean'` - True/false values
- `'object'` - Complex objects, JSON, binary data

## Required Patterns

### Audit Trail Integration
**ALWAYS** call these functions first:
```typescript
copyToEntityStateLog(client, ctx.system.entityId, ctx.system.entityCode);
updateEntityState(client, ctx.system.entityId, ctx.system.entityCode, ctx.system.actionCode, ctx.system.userName);
```

### Input Validation
Use helper functions for type-safe input validation:
```typescript
import { getInput, isString } from "../function-helpers";

const stringParam = getInput<string>(inputs, 'paramName', isString, 'Error message');
const numberParam = getInput<number>(inputs, 'paramName', (v) => typeof v === 'number', 'Error message');
```

### Audit Logging
Add meaningful audit log entries:
```typescript
ctx.auditLog.push(`Descriptive message about what happened`);
```

### Error Handling
Always wrap main logic in try/catch and log errors:
```typescript
try {
    // Function logic
} catch (error) {
    const errorMessage = `Function failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    ctx.auditLog.push(errorMessage);
    throw new Error(errorMessage);
}
```

## Context and System Information

Available in `ctx.system`:
- `userName` - Current user executing the workflow
- `actionCode` - The workflow action being executed
- `entityId` - The entity (alert/case) being processed
- `entityCode` - The type of entity (e.g., 'aml.rule.alert')
- `fromStateCode`/`toStateCode` - State transition information
- `entityData` - Complete entity data

Available in `ctx.data`:
- User-defined data passed between workflow functions
- Use `ctx.updateData(newData)` to modify context data

## Testing

After implementing:
1. Run the database migration to add function registration
2. Test the function in a workflow action configuration
3. Verify audit logs are generated correctly
4. Check error handling paths

## Example Functions

Refer to existing implementations for patterns:
- `change-entity-state.ts` - Simple state change
- `change-entity-state-assign-user.ts` - State change with assignment
- `upload-document.ts` - Complex function with database operations
- `send-mail.ts` - External service integration