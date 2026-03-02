/**
 * Template Renderer
 *
 * Wraps liquidjs template engine with:
 * - Custom filters for common formatting needs
 * - Error handling and fallback rendering
 * - Integration with API orchestrator
 * - Partial template support
 */

import { Liquid } from 'liquidjs';
import path from 'path';
import { TemplateContext, RenderedTemplate, TemplateDefinition, TemplateError } from './types';
import { ApiOrchestrator } from './api-orchestrator';

const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates', 'entity-details');

/**
 * Parameters for template rendering
 */
export interface RenderParams {
  entity_id: string;
  entity_code: string;
  user_name: string;
  org_unit_code?: string;
  template: TemplateDefinition;
  cookies?: string;
}

/**
 * Template Renderer class
 * Orchestrates API calls and template rendering
 */
export class TemplateRenderer {
  private liquid: Liquid;
  private orchestrator: ApiOrchestrator;

  constructor() {
    this.orchestrator = new ApiOrchestrator();

    // Initialize Liquid engine
    this.liquid = new Liquid({
      root: TEMPLATE_BASE_PATH, // Root for template files
      partials: path.join(TEMPLATE_BASE_PATH, '_shared'), // Partials directory
      extname: '.liquid', // File extension
      strictFilters: false, // Allow undefined variables in filters
      strictVariables: false, // Allow undefined variables
      cache: process.env.NODE_ENV === 'production', // Cache in production
    });

    // Register custom filters
    this.registerCustomFilters();
  }

  /**
   * Render a template with API data
   *
   * @param params Render parameters including entity info and template
   * @returns Rendered template with markdown and metadata
   */
  async render(params: RenderParams): Promise<RenderedTemplate> {
    const { entity_id, entity_code, user_name, org_unit_code, template, cookies } = params;

    const startTime = Date.now();
    const errors: TemplateError[] = [];

    // Build initial context
    const initialContext: TemplateContext = {
      entity_id,
      entity_code,
      user_name,
      org_unit_code,
      render_time: new Date().toISOString(),
    };

    try {
      // Execute API calls to gather data
      const { context, errors: apiErrors } =
        await this.orchestrator.executeApiCalls(
          template.config.api_calls,
          initialContext,
          cookies
        );

      errors.push(...apiErrors);

      // Render template with context
      let rendered_markdown: string;

      try {
        rendered_markdown = await this.liquid.parseAndRender(
          template.content,
          context
        );
      } catch (error) {
        const renderError: TemplateError = {
          type: 'render_error',
          message: `Template rendering failed: ${(error as Error).message}`,
          recoverable: false,
          stack:
            process.env.NODE_ENV === 'development'
              ? (error as Error).stack
              : undefined,
        };

        errors.push(renderError);

        // Fallback to error template
        rendered_markdown = this.renderErrorTemplate(error as Error, context);
      }

      const endTime = Date.now();
      console.log(`Template rendered in ${endTime - startTime}ms`);

      return {
        entity_id,
        entity_code,
        rendered_markdown,
        rendered_at: new Date().toISOString(),
        data_sources: template.config.api_calls.map((call) => call.endpoint),
        errors: errors.length > 0 ? errors : undefined,
        template_version: template.config.version,
      };
    } catch (error) {
      // Fatal error (e.g., required API failed)
      const fatalError: TemplateError = {
        type: 'api_failure',
        message: (error as Error).message,
        recoverable: false,
        stack:
          process.env.NODE_ENV === 'development'
            ? (error as Error).stack
            : undefined,
      };

      errors.push(fatalError);

      // Return minimal error response
      return {
        entity_id,
        entity_code,
        rendered_markdown: this.renderErrorTemplate(
          error as Error,
          initialContext
        ),
        rendered_at: new Date().toISOString(),
        data_sources: [],
        errors,
        template_version: template.config.version,
      };
    }
  }

  /**
   * Register custom Liquid filters
   */
  private registerCustomFilters(): void {
    // Date formatting filter
    this.liquid.registerFilter('date', (value: string | Date, format?: string) => {
      if (!value) return '';

      const date = typeof value === 'string' ? new Date(value) : value;

      if (isNaN(date.getTime())) {
        return value.toString();
      }

      // Simple date formatting (extend as needed)
      // Format tokens: %Y (year), %m (month), %d (day), %H (hour), %M (minute), %S (second)
      if (format) {
        return format
          .replace('%Y', date.getFullYear().toString())
          .replace('%m', String(date.getMonth() + 1).padStart(2, '0'))
          .replace('%d', String(date.getDate()).padStart(2, '0'))
          .replace('%H', String(date.getHours()).padStart(2, '0'))
          .replace('%M', String(date.getMinutes()).padStart(2, '0'))
          .replace('%S', String(date.getSeconds()).padStart(2, '0'));
      }

      return date.toISOString();
    });

    // Alert type icon filter
    this.liquid.registerFilter('alert_icon', (alertType: string) => {
      const icons: Record<string, string> = {
        TM: '🎯',
        AML_TM: '🎯',
        NS: '🔍',
        NAME_SCREENING: '🔍',
        TF: '💰',
        TRANSACTION_FILTERING: '💰',
        CDD: '📋',
      };
      return icons[alertType] || '📄';
    });

    // Subject type name filter
    this.liquid.registerFilter('subject_type_name', (type: string) => {
      if (!type) return '';
      return type === 'IND' ? 'Individual' : type === 'CRP' ? 'Corporate' : type;
    });

    // Round numbers filter
    this.liquid.registerFilter('round', (value: number, decimals: number = 2) => {
      if (typeof value !== 'number') return value;
      return value.toFixed(decimals);
    });

    // JSON stringify filter
    this.liquid.registerFilter('json', (value: any) => {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return String(value);
      }
    });

    // Default value filter (if value is null/undefined, use default)
    this.liquid.registerFilter('default', (value: any, defaultValue: any) => {
      return value ?? defaultValue;
    });

    // Uppercase filter
    this.liquid.registerFilter('upcase', (value: string) => {
      return value?.toString().toUpperCase() || '';
    });

    // Lowercase filter
    this.liquid.registerFilter('downcase', (value: string) => {
      return value?.toString().toLowerCase() || '';
    });

    // Capitalize filter (first letter uppercase)
    this.liquid.registerFilter('capitalize', (value: string) => {
      if (!value) return '';
      const str = value.toString();
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });

    // Truncate filter
    this.liquid.registerFilter(
      'truncate',
      (value: string, length: number = 50, ending: string = '...') => {
        if (!value) return '';
        const str = value.toString();
        if (str.length <= length) return str;
        return str.substring(0, length - ending.length) + ending;
      }
    );

    // Array join filter
    this.liquid.registerFilter('join', (array: any[], separator: string = ', ') => {
      if (!Array.isArray(array)) return array;
      return array.join(separator);
    });
  }

  /**
   * Render error template with debugging information
   */
  private renderErrorTemplate(error: Error, context: any): string {
    const isDev = process.env.NODE_ENV === 'development';

    let markdown = `# Template Rendering Error\n\n`;
    markdown += `**Error:** ${error.message}\n\n`;

    if (isDev && error.stack) {
      markdown += `## Stack Trace\n\n\`\`\`\n${error.stack}\n\`\`\`\n\n`;
    }

    if (isDev) {
      markdown += `## Context Data\n\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n`;
    } else {
      markdown += `*Enable development mode for detailed debugging information.*\n`;
    }

    return markdown;
  }
}

/**
 * Render an entity template
 * Convenience function that creates a renderer and renders the template
 *
 * @param params Render parameters
 * @returns Rendered template
 */
export async function renderEntityTemplate(
  params: RenderParams
): Promise<RenderedTemplate> {
  const renderer = new TemplateRenderer();
  return await renderer.render(params);
}
