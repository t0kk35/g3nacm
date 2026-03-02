/**
 * Entity Template System - Type Definitions
 *
 * Defines types for the template-based entity detail screen rendering system.
 * Templates are stored as files and define which APIs to call and how to render
 * entity details using liquidjs template engine.
 */

/**
 * Configuration for a single API call within a template
 */
export interface TemplateApiCall {
  /** Unique name for this API call */
  name: string;

  /** API endpoint path (e.g., "/api/data/alert/detail") */
  endpoint: string;

  /** Query parameters with template variables (e.g., {"alert_id": "{{entity_id}}"}) */
  params: Record<string, string>;

  /** Whether this API call is required (fail fast if it fails) */
  required: boolean;

  /** JavaScript expression to evaluate whether to execute this call */
  condition?: string;

  /** Name of another API call this depends on (for execution ordering) */
  depends_on?: string;

  /** Variable name to store the API response in template context */
  variable_name: string;

  /** Timeout in milliseconds (optional) */
  timeout?: number;
}

/**
 * Template configuration loaded from config.json
 */
export interface TemplateConfig {
  /** Entity code this template is for (e.g., "aml.rule.alert") */
  entity_code: string;

  /** Entity type category (e.g., "alert", "case", "subject") */
  entity_type: string;

  /** Template version */
  version: string;

  /** Human-readable template name */
  name: string;

  /** Template description */
  description?: string;

  /** Required permissions to render this template */
  permissions: string[];

  /** API calls to execute before rendering */
  api_calls: TemplateApiCall[];

  /** Cache TTL in seconds (optional, not used in initial implementation) */
  cache_ttl?: number;

  /** Whether to enable markdown processing (for future use) */
  enable_markdown?: boolean;
}

/**
 * Context object passed to template engine
 * Contains all API response data plus metadata
 */
export interface TemplateContext {
  /** Entity ID being rendered */
  entity_id: string;

  /** Entity code being rendered */
  entity_code: string;

  /** Username of the user requesting the render */
  user_name: string;

  /** Timestamp when rendering started */
  render_time?: string;

  /** Dynamic properties from API responses */
  [key: string]: any;
}

/**
 * Error that occurred during template rendering
 */
export interface TemplateError {
  /** Error type */
  type: 'api_failure' | 'render_error' | 'permission_denied' | 'template_not_found';

  /** Name of the API call that failed (for api_failure) */
  api_name?: string;

  /** Error message */
  message: string;

  /** Whether the error is recoverable (template can still be partially rendered) */
  recoverable: boolean;

  /** Stack trace (optional, for debugging) */
  stack?: string;
}

/**
 * Result of template rendering
 */
export interface RenderedTemplate {
  /** Entity ID that was rendered */
  entity_id: string;

  /** Entity code that was rendered */
  entity_code: string;

  /** Rendered markdown text */
  rendered_markdown: string;

  /** Timestamp when rendering completed */
  rendered_at: string;

  /** List of API endpoints that were called */
  data_sources: string[];

  /** Errors that occurred (if any) */
  errors?: TemplateError[];

  /** Template version used */
  template_version?: string;
}

/**
 * Template registry entry
 */
export interface TemplateRegistryEntry {
  /** Entity code */
  entity_code: string;

  /** Path to template directory (relative to templates/entity-details/) */
  path: string;

  /** Whether this template is enabled */
  enabled: boolean;

  /** Last update timestamp */
  last_updated: string;
}

/**
 * Template registry file format
 */
export interface TemplateRegistry {
  /** List of registered templates */
  templates: TemplateRegistryEntry[];
}

/**
 * Complete template definition (config + content)
 */
export interface TemplateDefinition {
  /** Template configuration */
  config: TemplateConfig;

  /** Template content (liquidjs template) */
  content: string;
}
