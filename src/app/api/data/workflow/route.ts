'use server'

import { auth } from "@/auth";
import * as db from "@/db"
import { NextRequest, NextResponse } from "next/server"
import { WorkflowConfig } from "./types";
import { ErrorCreators } from "@/lib/api-error-handling";

const origin = 'api/data/workflow';

const query_text = `
SELECT 
  wc.code as "workflow_code",
  wc.entity_code as "entity_code",
  we.description as "entity_description",
  wc.description as "workflow_description",
  wc.org_unit_code as "org_unit_code",
  COALESCE(wa.actions, '[]'::jsonb) as "actions",
  COALESCE(ws.states, '[]'::jsonb) as "states"
FROM workflow_config wc
JOIN workflow_entity we on we.code = wc.entity_code
LEFT JOIN LATERAL (
  SELECT jsonb_strip_nulls(
      jsonb_agg(
        jsonb_build_object(
          'code', wai.code,
          'name', wai.name,
          'trigger', wai.trigger,
          'description', wai.description,
          'from_state_code', wai.from_state,
          'to_state_code', wai.to_state,
          'redirect_url', wai.redirect_url,
          'permission', wai.permission,
          'form_fields', COALESCE(waff.form_fields, '[]'::jsonb),
          'functions', COALESCE(wf.functions, '[]'::jsonb)
      )
    ) 
  ) as "actions"
  FROM workflow_action wai
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
      jsonb_build_object(
        'code', wafl.function_code,
        'name', wff.name,
        'input_parameters', COALESCE(wffpi.input_parameter, '[]'::jsonb),
        'output_parameters', COALESCE(wffpo.output_parameter, '[]'::jsonb),
        'settings', COALESCE(wfs.setting, '[]'::jsonb)
      )
    ) as "functions"
    FROM workflow_action_function_link wafl
    LEFT JOIN workflow_function wff on wff.code = wafl.function_code
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'code', wffp.code,
          'name', wffp.name,
          'parameter_type', wffp.parameter_type,
          'directon', wffp.direction,
          'context_mapping', wafpm.context_mapping
        )
      ) as "input_parameter"
      FROM workflow_function_parameter wffp
      JOIN workflow_action_function_parameter_mapping wafpm 
        ON wafpm.action_code = wai.code AND wafpm.function_code = wff.code AND wafpm.parameter_code = wffp.code 
      WHERE wffp.function_code = wff.code
      AND wffp.direction = 'Input'
    ) wffpi ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'code', wffp.code,
          'name', wffp.name,
          'parameter_type', wffp.parameter_type,
          'directon', wffp.direction,
          'context_mapping', wafpm.context_mapping
        )
      ) as "output_parameter"
      FROM workflow_function_parameter wffp 
      JOIN workflow_action_function_parameter_mapping wafpm 
        ON wafpm.action_code = wai.code AND wafpm.function_code = wff.code AND wafpm.parameter_code = wffp.code
      WHERE wffp.function_code = wff.code
      AND wffp.direction = 'Output'
    ) wffpo ON TRUE
  ---
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(
        jsonb_build_object(
          'code', ws.code,
          'name', ws.name,
          'value', wafs.setting_value        
        )
      ) as "setting"
      FROM workflow_setting ws
      JOIN workflow_action_function_setting wafs 
      ON wafs.action_code = wai.code AND wafs.function_code = wff.code AND ws.code = wafs.setting_code 
      WHERE wafs.function_code = wff.code
    ) wfs ON TRUE
  --
    WHERE wafl.action_code = wai.code
  ) wf on TRUE
  LEFT JOIN LATERAL (
    SELECT jsonb_strip_nulls(
      jsonb_agg(
        jsonb_build_object(
          'code', waffi.code,
          'type', waffi.form_field_type,
          'name', waffi.name,
          'label', waffi.label,
          'placeholder', waffi.placeholder,
          'required', waffi.required,
          'order', waffi.order,
          'options', waffo.form_field_options
        )
      )
    ) as "form_fields"
    FROM workflow_action_form_field waffi
    LEFT JOIN LATERAL (
      SELECT jsonb_build_object( 
        'value', waffoi.value,
        'label', waffoi.label
      ) as "form_field_options"
      FROM workflow_action_form_field_option waffoi 
      WHERE waffoi.form_field_code = waffi.code
    ) waffo on TRUE
    WHERE waffi.action_code = wai.code
  ) waff on TRUE
  WHERE wai.config_code = wc.code
) wa ON TRUE
LEFT JOIN LATERAL (
  SELECT jsonb_strip_nulls(
    jsonb_agg(DISTINCT 
      jsonb_build_object(
        'code', wsi.code,
        'name', wsi.name,
        'is_active', wsi.is_active
      )
    )
  ) AS "states"
  FROM workflow_state wsi
  JOIN workflow_action wasi on (wasi.from_state = wsi.code OR wasi.from_state = wsi.code) 
  WHERE wasi.config_code = wc.code
) ws ON TRUE
WHERE wc.entity_code = $1 AND wc.org_unit_code = $2
`

export async function GET(request: NextRequest) {
    const useMockData = process.env.USE_MOCK_DATA === "true";

    // Check User
    const session = await auth();
    if (!session) return ErrorCreators.auth.missingSession(origin);
    const user = session.user;
    if (!user?.name) return ErrorCreators.auth.missingUser(origin);

    // Get the URL params. Throw errors if we can't find the mandatory ones.
    const searchParams = request.nextUrl.searchParams;
    const org_unit_code = searchParams.get("org_unit_code")
    if (!org_unit_code) return ErrorCreators.param.urlMissing(origin, "org_unit_code");
    const entity_code = searchParams.get("entity_code")
    if (!entity_code) return ErrorCreators.param.urlMissing(origin, "entity_code");
    
    if (!useMockData) {
        const workflows = await db.pool.query(query_text, [entity_code, org_unit_code]);
        if (workflows.rows.length === 0) return ErrorCreators.workflow.notFound(origin, entity_code, org_unit_code);
        if (workflows.rows.length > 1) return ErrorCreators.workflow.notUnique(origin, entity_code, org_unit_code);
        const res:WorkflowConfig = workflows.rows[0];
        return NextResponse.json(res);
  }
}