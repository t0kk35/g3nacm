'use server'

import { auth } from "@/auth";
import * as db from '@/db';
import { NextRequest, NextResponse } from "next/server";
import { ErrorCreators } from '@/lib/api-error-handling';
import { RawSchemaRow, EvalInputSchema, EvalSchemaField } from "@/lib/eval-engine/types";
const origin = 'api/data/eval/schema'

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

/**
 * This function is mainly used for the admin screens under /admin
 */
export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";
    // Check user
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);
    
    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const name = searchParams.get('name');
    const version = searchParams.get('version');

    // Fetch schema from cache for better performance
    if (!useMockData) {
        try {
            const res = await db.pool.query(query_text, [name, version]);
            const raw_schemas: RawSchemaRow[] = res.rows;
            const schemas = buildSchemas(raw_schemas)
            return NextResponse.json(schemas);
        } catch (error) {
            return ErrorCreators.db.queryFailed(origin, 'Get schema', error as Error);
        }
    }
    
    // Mock data fallback (if needed for development)
    return Response.json({
        id: 0,
        name,
        version,
        description: 'Mock schema for development',
        created_at: new Date(),
        updated_at: new Date(),
        fields: []
    });
}

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