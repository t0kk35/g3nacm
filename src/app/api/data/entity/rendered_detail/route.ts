/**
 * Entity Rendered Detail API Endpoint
 *
 * Renders entity detail screens using template engine with configurable API calls.
 * Returns rendered markdown text that can be displayed using the app's markdown renderer.
 *
 * GET /api/data/entity/rendered_detail?entity_id={id}&entity_code={code}
 */

'use server';

import { auth } from '@/auth';
import { NextRequest, NextResponse } from 'next/server';
import { ErrorCreators } from '@/lib/api-error-handling';
import { requirePermissions } from '@/lib/permissions/check';
import { getTemplateByEntityCode } from '@/lib/entity-template/registry';
import { renderEntityTemplate } from '@/lib/entity-template/renderer';

const origin = 'api/data/entity/rendered_detail';
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET handler for rendered entity detail
 *
 * Query parameters:
 * - entity_id: UUID of the entity to render
 * - entity_code: Entity type code (e.g., "aml.rule.alert")
 *
 * Returns:
 * - rendered_markdown: The rendered markdown text
 * - rendered_at: Timestamp of rendering
 * - data_sources: List of API endpoints called
 * - errors: Any errors that occurred (optional)
 * - template_version: Version of template used
 */
export async function GET(request: NextRequest) {
  // 1. Authentication
  const session = await auth();
  if (!session) return ErrorCreators.auth.missingSession(origin);

  const user = session.user;
  if (!user?.name) return ErrorCreators.auth.missingUser(origin);

  // 2. Extract and validate parameters
  const searchParams = request.nextUrl.searchParams;
  const entityId = searchParams.get('entity_id');
  const entityCode = searchParams.get('entity_code');

  if (!entityId) return ErrorCreators.param.urlMissing(origin, 'entity_id');
  if (!entityCode) return ErrorCreators.param.urlMissing(origin, 'entity_code');

  // Validate UUID format for entity_id
  if (!uuidRegex.test(entityId)) {
    return ErrorCreators.param.typeInvalid(
      origin,
      'entity_id',
      'UUID',
      typeof entityId
    );
  }

  try {
    // 3. Load template configuration
    const template = await getTemplateByEntityCode(entityCode);

    if (!template) {
      // Template not found - return 404
      return NextResponse.json(
        {
          errorCode: 'TEMPLATE_NOT_FOUND',
          message: `No template found for entity code: ${entityCode}`,
          origin,
          available_templates: await getAvailableTemplatesInfo(),
        },
        { status: 404 }
      );
    }

    // 4. Check permissions
    const permissionCheck = await requirePermissions(
      user.name,
      origin,
      template.config.permissions
    );

    if (permissionCheck) {
      return permissionCheck; // Permission denied response
    }

    // 5. Render template
    console.log(
      `Rendering template for entity ${entityCode} (${entityId}) by user ${user.name}`
    );

    // Extract cookies to pass to internal API calls
    const cookieHeader = request.headers.get('cookie') || '';

    const result = await renderEntityTemplate({
      entity_id: entityId,
      entity_code: entityCode,
      user_name: user.name,
      template,
      cookies: cookieHeader,
    });

    // 6. Return rendered template
    return NextResponse.json(result);
  } catch (error) {
    // Handle unexpected errors
    console.error('Error rendering entity template:', error);
    return ErrorCreators.db.queryFailed(origin, 'Render entity template', error as Error);
  }
}

/**
 * Helper function to get information about available templates
 * Used in error responses to help users discover available templates
 */
async function getAvailableTemplatesInfo() {
  try {
    const { getAvailableEntityCodes } = await import(
      '@/lib/entity-template/registry'
    );
    const codes = await getAvailableEntityCodes();
    return codes;
  } catch {
    return [];
  }
}
