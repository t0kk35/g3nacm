import { EvalAtomicCondition, EvalOptions, EvalRule, EvalRuleCondition, EvalInputSchema } from "./types";
import { validateEntityStrict } from "./schema-validator";

// Helpers
// Get a value from an object by 'dot' notation
function getNestedValue(obj:any, path:string): any {
    return path.split('.')
        .reduce((acc: any, key:string) => {
            if (acc === null) return undefined;
            return acc[key];
        }, obj);
};

// Evaluate an Atomic Condition
function evaluateAtomicCondition(data: any, cond: EvalAtomicCondition, options: EvalOptions): boolean {
    const fieldValue = getNestedValue(data, cond.field);
    
    // Check if field is missing or undefined
    if (fieldValue === undefined) {
        if (options.throwOnMissingField) throw new Error(`Eval Engine: Field ${cond.field} is missing or undefined`)
        // By default if thorwOnMissing is not set assume undefined fields won't match anything
        return false;
    }
    // Check for type compatibility
    const isNumericOperator = cond.operator === 'greaterThan' || cond.operator === 'lessThan';
    if (isNumericOperator) {
        const typesAreInvalid  = (typeof fieldValue !== 'number' || typeof cond.value !== 'number');
        if (typesAreInvalid) {
            if (options.throwOnInvalidType) 
                throw new Error(`Eval engine. Invalid type for operator ${cond.operator}. 
                                Both of the fields must be numbers. Field ${cond.field} 
                                is ${JSON.stringify(fieldValue)}; `)
            // if not throwing return false
            return false;
        }
    }

    switch (cond.operator) {
        case "equals":
            return fieldValue === cond.value;
        case "notEquals":
            return fieldValue !== cond.value;
        case "greaterThan":
            return (typeof fieldValue === 'number' && typeof cond.value === 'number') 
            ? fieldValue > cond.value 
            : false; 
        case "lessThan":
            return (typeof fieldValue === 'number' && typeof cond.value === 'number')
            ? fieldValue < cond.value
            : false;
        case "includes":
            if (Array.isArray(fieldValue)) return fieldValue.includes(cond.value)
            else if (typeof fieldValue === 'string') return fieldValue.includes(String(cond.value))
            else {
                if (options.throwOnInvalidType) 
                    throw new Error(`Eval engine. Operator 'includes' requires 
                                    an array or string, field ${cond.field} has type ${typeof fieldValue}`);
                return false 
            };
    }
}

// Recursively evaluate a possibly nested condition
function evaluateRuleCondition(data: any, condition: EvalRuleCondition, options: EvalOptions): boolean {
    let result: boolean;

    // Base case: single check
    if (condition.type === 'atomic') {
        result = evaluateAtomicCondition(data, condition, options);
    } 
    // Group case: combine child conditions with AND/OR
    else {
        if (condition.operator === 'AND') result = condition.conditions.every(child => evaluateRuleCondition(data, child, options));
        // Conditiond === 'OR'
        else result = condition.conditions.some((child) => evaluateRuleCondition(data, child, options));
    }

    // Negate if needed
    if (condition.negate) {
        result = !result;
    }
    return result;
}

// Evaluate Single rule
function evaluateRule(data: any, rule: EvalRule, options: EvalOptions): string | boolean | undefined {
    if (evaluateRuleCondition(data, rule.condition, options)) return rule.output;
    return undefined
}

/**
 * Run the internal evaluation engine for a set of rules.
 * @param data The input data which must conform to the specifications of the 'schema'
 * @param rules A set of rules to evaluate
 * @param options Potential options
 * @param schema A schema specification of the input data, so the eval engine knows which fields there are
 * @returns The return will be a boolean or string depending on the rules specification.
 */
export function evaluateRules(
    data: any, 
    rules: EvalRule[], 
    options: EvalOptions,
    schema?: EvalInputSchema
): string | boolean | undefined {
    // Optional schema validation
    if (options.validateInput && schema) {
        validateEntityStrict(data, schema);
    }
    
    // Sort rules
    const sortedRules = [...rules].sort((a, b) => a.rank - b.rank);

    // Run rules
    for (const r of sortedRules) {
        const result = evaluateRule(data, r, options);
        if (result !== undefined) return result;
    }
    return undefined;
}