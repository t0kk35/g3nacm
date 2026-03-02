/**
 * Entity Component Section API Endpoint
 *
 * Returns section configuration with resolved data for client-side rendering.
 * Handles authentication, permissions, API orchestration, and data resolution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { sectionRegistry } from '@/lib/component-section/section-registry';
import { ApiOrchestrator } from '@/lib/entity-template/api-orchestrator';
import type { TemplateContext } from '@/lib/component-section/types';
import { ComponentSection } from '../types';

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shared handler for GET and POST requests.
 * POST allows callers to pass `initial_context` to pre-populate the
 * orchestrator context, which skips fetching data the caller already has.
 */
async function handleRequest(
  request: NextRequest,
  params: { entity_id: string | null; section_code: string | null; initial_context?: Record<string, unknown> }
) {
  const origin = request.headers.get('origin') || '';

  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);
  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  // Get Parameters and check
  const { entity_id, section_code, initial_context } = params;

  if (!entity_id) return ErrorCreators.param.urlMissing(origin, 'entity_id');
  if (!section_code) return ErrorCreators.param.urlMissing(origin, 'section_code');
  if (!UUID_REGEX.test(entity_id)) return ErrorCreators.param.typeInvalid(origin, 'entity_id', 'UUID', typeof entity_id);

  try {
    const sectionDefinition = await sectionRegistry.getSection(section_code);
    if (!sectionDefinition) return ErrorCreators.componentSection.notFound(origin, section_code)

    const sectionConfig = sectionDefinition.config;

    const permissionCheck = await requirePermissions(user.name, origin, sectionConfig.permissions);
    if (permissionCheck) return permissionCheck;

    const context: TemplateContext = {
      entity_id,
      entity_code: sectionConfig.metadata?.entityCode || section_code,
      user_name: user.name,
      render_time: new Date().toISOString(),
      // Merge caller-supplied context so orchestrator can skip pre-populated calls
      ...initial_context,
    };

    let resolvedContext = context;
    const dataSources: string[] = [];
    const errors: any[] = [];

    if (sectionConfig.apiCalls && sectionConfig.apiCalls.length > 0) {
      console.log(`Executing ${sectionConfig.apiCalls.length} API calls for section ${section_code}`);

      const apiOrchestrator = new ApiOrchestrator();
      const cookies = request.headers.get('cookie') || '';

      const apiResult = await apiOrchestrator.executeApiCalls(sectionConfig.apiCalls, context, cookies);

      resolvedContext = apiResult.context;

      sectionConfig.apiCalls.forEach((call) => {
        dataSources.push(call.endpoint);
      });

      if (apiResult.errors && apiResult.errors.length > 0) {
        errors.push(...apiResult.errors);
      }
    }

    const res: ComponentSection = {
      success: true,
      section_code: sectionConfig.code,
      section_name: sectionConfig.name,
      section_version: sectionConfig.version,
      section_config: sectionConfig,
      context: resolvedContext,
      data_sources: dataSources.length > 0 ? dataSources : undefined,
      errors: errors.length > 0 ? errors : undefined,
      rendered_at: new Date().toISOString(),
    };

    return NextResponse.json(res);
  } catch (error) {
    console.error('Error rendering component section:', error);
    return ErrorCreators.componentSection.internalError(origin, section_code, error as Error);
  }
}

/**
 * GET /api/data/entity/component_section
 *
 * Query params:
 * - entity_id: UUID of entity to render
 * - section_code: Code of section to render
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  return handleRequest(request, {
    entity_id: searchParams.get('entity_id'),
    section_code: searchParams.get('section_code'),
  });
}

/**
 * POST /api/data/entity/component_section
 *
 * Body (JSON):
 * - entity_id: UUID of entity to render
 * - section_code: Code of section to render
 * - initial_context: (optional) Pre-populated context data.
 *   Any key whose name matches an API call's `variable_name` will cause that
 *   call to be skipped, avoiding redundant fetches when the caller already
 *   has the data.
 *
 * Example — caller already holds the alert:
 * ```json
 * {
 *   "entity_id": "...",
 *   "section_code": "aml-alert-details",
 *   "initial_context": { "alert": { ...alertData } }
 * }
 * ```
 */
export async function POST(request: NextRequest) {
  let body: { entity_id?: string; section_code?: string; initial_context?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return ErrorCreators.param.invalidJSON(origin, 'Request Body','');
  }
  return handleRequest(request, {
    entity_id: body.entity_id ?? null,
    section_code: body.section_code ?? null,
    initial_context: body.initial_context,
  });
}