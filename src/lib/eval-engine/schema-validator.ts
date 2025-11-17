import { EvalInputSchema, EvalSchemaField, EvalFieldType, EvalFieldValidation } from "./types";

// Validation error types
export type ValidationError = {
    field: string;
    message: string;
    value?: unknown;
};

export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
};

// Get nested value helper (same as in engine.ts)
function getNestedValue(obj: any, path: string): any {
    return path.split('.')
        .reduce((acc: any, key: string) => {
            if (acc === null || acc === undefined) return undefined;
            return acc[key];
        }, obj);
}

// Validate a single field value against its schema
function validateField(
    entity: any, 
    field: EvalSchemaField, 
    errors: ValidationError[]
): void {
    const fieldValue = getNestedValue(entity, field.field_path);
    
    // Check required fields
    if (field.required && (fieldValue === undefined || fieldValue === null)) {
        errors.push({
            field: field.field_path,
            message: `Required field '${field.field_path}' is missing`
        });
        return;
    }
    
    // Skip validation if field is optional and not present
    if (fieldValue === undefined || fieldValue === null) {
        return;
    }
    
    // Type validation
    if (!validateFieldType(fieldValue, field.field_type, field.array_item_type)) {
        errors.push({
            field: field.field_path,
            message: `Field '${field.field_path}' expected type '${field.field_type}' but got '${typeof fieldValue}'`,
            value: fieldValue
        });
        return;
    }
    
    // Validation config checks
    if (field.validation_config) {
        validateFieldConstraints(fieldValue, field.field_path, field.validation_config, errors);
    }
}

// Validate field type
function validateFieldType(
    value: any, 
    expectedType: EvalFieldType, 
    arrayItemType?: EvalFieldType
): boolean {
    switch (expectedType) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'date':
            return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        case 'array':
            if (!Array.isArray(value)) return false;
            // If array item type specified, validate all items
            if (arrayItemType) {
                return value.every(item => validateFieldType(item, arrayItemType));
            }
            return true;
        default:
            return false;
    }
}

// Validate field constraints from validation_config
function validateFieldConstraints(
    value: any,
    fieldPath: string,
    validation: EvalFieldValidation,
    errors: ValidationError[]
): void {
    // Min/Max validation
    if (validation.min !== undefined) {
        if (typeof value === 'number' && value < validation.min) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' value ${value} is below minimum ${validation.min}`,
                value
            });
        } else if (typeof value === 'string' && value.length < validation.min) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' length ${value.length} is below minimum ${validation.min}`,
                value
            });
        } else if (Array.isArray(value) && value.length < validation.min) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' array length ${value.length} is below minimum ${validation.min}`,
                value
            });
        }
    }
    
    if (validation.max !== undefined) {
        if (typeof value === 'number' && value > validation.max) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' value ${value} exceeds maximum ${validation.max}`,
                value
            });
        } else if (typeof value === 'string' && value.length > validation.max) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' length ${value.length} exceeds maximum ${validation.max}`,
                value
            });
        } else if (Array.isArray(value) && value.length > validation.max) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' array length ${value.length} exceeds maximum ${validation.max}`,
                value
            });
        }
    }
    
    // Pattern validation for strings
    if (validation.pattern && typeof value === 'string') {
        try {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
                errors.push({
                    field: fieldPath,
                    message: `Field '${fieldPath}' value '${value}' does not match pattern '${validation.pattern}'`,
                    value
                });
            }
        } catch (e) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' has invalid regex pattern '${validation.pattern}'`,
                value
            });
        }
    }
    
    // Enum validation
    if (validation.enum && validation.enum.length > 0) {
        if (!validation.enum.includes(value)) {
            errors.push({
                field: fieldPath,
                message: `Field '${fieldPath}' value '${value}' is not in allowed values: [${validation.enum.join(', ')}]`,
                value
            });
        }
    }
}

/**
 * Validate an entity against an input schema
 */
export function validateEntity(entity: any, schema: EvalInputSchema): ValidationResult {
    const errors: ValidationError[] = [];
    
    // Validate each field in the schema
    for (const field of schema.fields) {
        validateField(entity, field, errors);
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate an entity against schema with error throwing option
 * Useful for integration with the eval engine
 */
export function validateEntityStrict(entity: any, schema: EvalInputSchema): void {
    const result = validateEntity(entity, schema);
    
    if (!result.valid) {
        const errorMessages = result.errors.map(e => e.message).join('; ');
        throw new Error(`Schema validation failed: ${errorMessages}`);
    }
}