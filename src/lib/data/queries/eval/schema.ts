import { z } from 'zod';
import * as db from '@/db';
import { defineQuery, QueryContext } from '@/lib/data/registry';
import { RawSchemaRow, EvalInputSchema, EvalSchemaField } from "@/lib/eval-engine/types";
import { DataQueryError } from '@/lib/data/errors';

const paramsSchema = z.object({
    name: z.string(),
    version: z.string()
}).refine(
    d => (d.name && !d.version) || (!d.name && d.version), 
    { message: "Need to provide name AND version OR not provide eiher"}
);

const query_text = `
SELECT 
  eis.id,
  eis.name,
  eis.version,
  eis.description,
  eis.created_at,
  eis.updated_at,
  esf.id as field_id,
  esf.field_path,
  esf.field_type,
  esf.description as field_description,
  esf.required,
  esf.array_item_type,
  esf.validation_config
FROM eval_input_schema eis
LEFT JOIN eval_schema_field esf ON esf.schema_id = eis.id
WHERE ($1::text IS NULL OR (eis.name = $1 AND eis.version = $2))
ORDER BY esf.id
`;

export const queryEvaInputSchema = defineQuery({
    path: 'eval/schema',
    permissions: [],
    params: paramsSchema,
    execute: async ({ name, version }: z.infer<typeof paramsSchema>, ctx: QueryContext): Promise<EvalInputSchema[]> => {
        const conn = ctx.client ?? db.pool;
        try {
            const result = await conn.query(query_text, [ctx.userName, name, version]);
            return buildSchemas(result.rows);
        } catch (err) {
            throw new DataQueryError('Get Eval Input Schema', err as Error);
        }
    },
});

function buildSchemas(rows: RawSchemaRow[]): EvalInputSchema[] {
  
    const grouped: Record<string, RawSchemaRow[]> = {};
  
    // Step 1: Group rows by `id`
    for (const row of rows) {
        if (!grouped[row.id]) grouped[row.id] = [];
        grouped[row.id].push(row);
    }

    const schemas: EvalInputSchema[] = [];

    // Step 2: Build schema for each group
    for (const id in grouped) {
        const schema = buildSchema(grouped[id]);
        if (schema !== null) schemas.push(schema);
    }
  
    return schemas;
}

// Helper function to build schema from raw database rows
function buildSchema(rows: RawSchemaRow[]): EvalInputSchema | null {
    if (rows.length === 0) return null;
  
    const firstRow = rows[0];
    const fields: EvalSchemaField[] = [];
  
    for (const row of rows) {
        if (row.field_id && row.field_path && row.field_type) {
        fields.push({
            id: row.field_id,
            schema_id: row.id,
            field_path: row.field_path,
            field_type: row.field_type as any,
            description: row.field_description || undefined,
            required: row.required || false,
            array_item_type: row.array_item_type as any || undefined,
            validation_config: row.validation_config || undefined,
        });
        }
    }
  
    return {
        id: firstRow.id,
        name: firstRow.name,
        version: firstRow.version,
        description: firstRow.description || undefined,
        created_at: firstRow.created_at,
        updated_at: firstRow.updated_at,
        fields,
    };
}