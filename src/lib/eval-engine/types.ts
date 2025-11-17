// Type for the build_rules function
export type RawRuleRow = {
  rule_id: number;
  group: string;
  rank: number;
  output: string;
  input_schema_id: string | null;
  condition_id: number;
  parent_condition_id: number | null;
  type: 'atomic' | 'group';
  operator: string;
  negate: boolean;
  field: string | null;
  value: string | number | null;
};

// Type for the build_schema function
export type RawSchemaRow = {
  id: string;
  name: string;
  version: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
  field_id: number | null;
  field_path: string | null;
  field_type: string | null;
  field_description: string | null;
  required: boolean | null;
  array_item_type: string | null;
  validation_config: any | null;
};

// Comparison operators for atomic conditions
export type EvalComparisonOperator = 'equals' | 'notEquals' | 'greaterThan' | 'lessThan' | 'includes';

// Logical operators for combining conditions
export type EvalLogicalOperator = 'AND' | 'OR'

// Represents a single atomic condition like (age > 18)
export type EvalAtomicCondition = {
    type: 'atomic';
    field: string;
    operator: EvalComparisonOperator;
    value: unknown;
    negate?: boolean;
}

// Represents a group of conditions combined with AND/OR
export type EvalConditionGroup = {
    type: 'group';
    operator: EvalLogicalOperator;
    conditions: EvalRuleCondition[];
    negate?: boolean;
}

export type EvalRuleCondition = EvalAtomicCondition | EvalConditionGroup;

// Used to specific behaivour for error handling or runtime options
export type EvalOptions = {
    throwOnMissingField?: boolean;
    throwOnInvalidType?: boolean;
    validateInput?: boolean;  // Enable/disable schema validation
}

// Field types supported by the schema system
export type EvalFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';

// Validation configuration for fields
export type EvalFieldValidation = {
    min?: number;           // Min value for numbers, min length for strings/arrays
    max?: number;           // Max value for numbers, max length for strings/arrays
    pattern?: string;       // Regex pattern for strings
    enum?: string[];       // Allowed values
};

// Schema field definition
export type EvalSchemaField = {
    id: number;
    schema_id: string;
    field_path: string;     // Dot notation path like 'person.age'
    field_type: EvalFieldType;
    description?: string;
    required: boolean;
    array_item_type?: EvalFieldType;
    validation_config?: EvalFieldValidation;
};

// Input schema definition
export type EvalInputSchema = {
    id: string;
    name: string;
    version: string;
    description?: string;
    created_at: Date;
    updated_at: Date;
    fields: EvalSchemaField[];  // Populated from join
};

// A Rule has a rank, a group, and output and one nested condition
export type EvalRule = {
    id?: number;
    rank: number;
    group: string;
    condition: EvalRuleCondition;
    output: string;
    input_schema_id?: string;  // Optional link to input schema
}
