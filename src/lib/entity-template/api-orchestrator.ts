/**
 * API Orchestrator
 *
 * Executes API calls defined in template configurations with:
 * - Dependency resolution and topological sorting
 * - Parallel execution where possible
 * - Template variable substitution in parameters
 * - Conditional execution
 * - Fail-fast error handling for required APIs
 */

import { TemplateApiCall, TemplateContext, TemplateError } from './types';

/**
 * Internal representation of an API call with its dependencies
 */
type ApiCallNode = {
  call: TemplateApiCall;
  dependencies: string[];
};

/**
 * Result of API orchestration
 */
export interface ApiOrchestrationResult {
  /** Updated context with API response data */
  context: TemplateContext;

  /** Errors that occurred during API calls */
  errors: TemplateError[];
}

/**
 * API Orchestrator class
 * Manages the execution of multiple API calls with dependency resolution
 */
export class ApiOrchestrator {
  private baseUrl: string;

  constructor() {
    // Use DATA_URL from environment for internal API calls
    this.baseUrl = process.env.DATA_URL || '';
  }

  /**
   * Execute all API calls defined in template config
   * Builds dependency graph and executes in waves for optimal parallelism
   *
   * @param apiCalls Array of API calls to execute
   * @param initialContext Initial context with entity_id, user_name, etc.
   * @param cookies Optional cookie header to forward for authentication
   * @returns Updated context with API responses and any errors
   */
  async executeApiCalls(
    apiCalls: TemplateApiCall[],
    initialContext: TemplateContext,
    cookies?: string
  ): Promise<ApiOrchestrationResult> {
    const context = { ...initialContext };
    const errors: TemplateError[] = [];

    // Build execution graph (waves of parallel calls)
    const executionGraph = this.buildExecutionGraph(apiCalls);

    // Execute each wave in sequence (parallel within wave)
    for (const wave of executionGraph) {
      await Promise.all(
        wave.map(async (node) => {
          try {
            // Skip if result already present in context (caller pre-populated it)
            if (context[node.call.variable_name] !== undefined) {
              console.log(
                `Skipping API call ${node.call.name}: '${node.call.variable_name}' already in context`
              );
              return;
            }

            // Check condition if specified
            if (node.call.condition) {
              const shouldExecute = this.evaluateCondition(
                node.call.condition,
                context
              );
              if (!shouldExecute) {
                console.log(
                  `Skipping API call ${node.call.name} due to condition: ${node.call.condition}`
                );
                return;
              }
            }

            // Build URL with resolved parameters
            const url = this.buildUrl(node.call.endpoint, node.call.params, context);

            console.log(`Executing API call: ${node.call.name} -> ${url}`);

            // Build headers with optional cookie forwarding
            const headers: HeadersInit = {
              'Content-Type': 'application/json',
            };

            // Forward cookies for authentication if provided
            if (cookies) {
              headers['Cookie'] = cookies;
            }

            // Execute API call
            const response = await fetch(url, {
              method: 'GET',
              headers,
              // Add timeout if specified
              signal: node.call.timeout
                ? AbortSignal.timeout(node.call.timeout)
                : undefined,
            });

            if (!response.ok) {
              throw new Error(
                `API call ${node.call.name} failed with status ${response.status}: ${response.statusText}`
              );
            }

            const data = await response.json();

            // Store response in context
            context[node.call.variable_name] = data;

            console.log(
              `API call ${node.call.name} completed, stored in context.${node.call.variable_name}`
            );
          } catch (error) {
            const apiError: TemplateError = {
              type: 'api_failure',
              api_name: node.call.name,
              message: (error as Error).message,
              recoverable: !node.call.required,
              stack:
                process.env.NODE_ENV === 'development'
                  ? (error as Error).stack
                  : undefined,
            };

            errors.push(apiError);

            console.error(
              `API call ${node.call.name} failed:`,
              (error as Error).message
            );

            // Fail fast for required APIs
            if (node.call.required) {
              throw new Error(
                `Required API call "${node.call.name}" failed: ${(error as Error).message}`
              );
            }
          }
        })
      );
    }

    return { context, errors };
  }

  /**
   * Build execution graph with topological sort
   * Returns array of waves where each wave contains calls that can execute in parallel
   */
  private buildExecutionGraph(apiCalls: TemplateApiCall[]): ApiCallNode[][] {
    const nodes: Map<string, ApiCallNode> = new Map();

    // Build nodes with dependencies
    for (const call of apiCalls) {
      nodes.set(call.name, {
        call,
        dependencies: this.extractDependencies(call, apiCalls),
      });
    }

    // Topological sort with wave detection
    const waves: ApiCallNode[][] = [];
    const executed = new Set<string>();

    while (executed.size < nodes.size) {
      const wave: ApiCallNode[] = [];

      // Find all calls that can execute now (all dependencies satisfied)
      for (const [name, node] of nodes) {
        if (executed.has(name)) continue;

        const canExecute = node.dependencies.every((dep) => executed.has(dep));
        if (canExecute) {
          wave.push(node);
        }
      }

      // If no calls can execute, we have a circular dependency
      if (wave.length === 0) {
        const remaining = Array.from(nodes.keys()).filter(
          (name) => !executed.has(name)
        );
        throw new Error(
          `Circular dependency detected in API calls: ${remaining.join(', ')}`
        );
      }

      // Mark these calls as executed
      wave.forEach((node) => executed.add(node.call.name));
      waves.push(wave);
    }

    console.log(
      `Built execution graph with ${waves.length} wave(s):`,
      waves.map((w) => w.map((n) => n.call.name))
    );

    return waves;
  }

  /**
   * Extract dependencies for an API call
   * Dependencies come from:
   * 1. Explicit depends_on field
   * 2. Template variables in params that reference other API call results
   */
  private extractDependencies(
    call: TemplateApiCall,
    allCalls: TemplateApiCall[]
  ): string[] {
    const deps = new Set<string>();

    // Explicit dependency
    if (call.depends_on) {
      deps.add(call.depends_on);
    }

    // Implicit dependencies from param templates
    // Extract variables like {{alert.something}} -> depends on 'alert' call
    const paramVars = this.extractTemplateVariables(
      JSON.stringify(call.params)
    );

    // Map variable names to API call names by checking which call produces that variable
    for (const varName of paramVars) {
      // Skip built-in context variables
      if (
        varName === 'entity_id' ||
        varName === 'entity_code' ||
        varName === 'user_name' ||
        varName === 'org_unit_code'
      ) {
        continue;
      }

      // Find the API call that produces this variable
      const producerCall = allCalls.find((c) => c.variable_name === varName);
      if (producerCall && producerCall.name !== call.name) {
        deps.add(producerCall.name);
      }
    }

    return Array.from(deps);
  }

  /**
   * Extract template variables from a string
   * Example: "{{entity_id}}" -> ["entity_id"]
   * Example: "{{alert.alert_item.id}}" -> ["alert"]
   */
  private extractTemplateVariables(template: string): string[] {
    const regex = /\{\{([^}\.]+)/g;
    const matches = template.matchAll(regex);
    return Array.from(matches, (m) => m[1].trim());
  }

  /**
   * Build URL with resolved template variables
   * Replaces {{variable}} with actual values from context
   */
  private buildUrl(
    endpoint: string,
    params: Record<string, string>,
    context: TemplateContext
  ): string {
    const queryParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      const resolvedValue = this.resolveTemplate(value, context);
      if (resolvedValue !== null && resolvedValue !== undefined) {
        queryParams.append(key, resolvedValue);
      }
    }

    const queryString = queryParams.toString();
    const fullUrl = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

    return fullUrl;
  }

  /**
   * Resolve template string by replacing {{variables}} with values from context
   * Supports nested properties: {{alert.alert_item.id}}
   */
  private resolveTemplate(template: string, context: TemplateContext): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const value = this.getNestedValue(context, path.trim());
      return value?.toString() || '';
    });
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue({alert: {id: "123"}}, "alert.id") -> "123"
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  /**
   * Evaluate a condition expression
   * For safety, uses a simple expression evaluator with limited scope
   * Currently supports basic comparisons and property checks
   */
  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // First resolve all template variables in the condition
      const resolved = condition.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
        const value = this.getNestedValue(context, path.trim());
        return JSON.stringify(value);
      });

      // Use Function constructor with limited scope (safer than eval)
      // Note: In production, consider using a proper expression parser
      const func = new Function('context', `return ${resolved}`);
      return func(context);
    } catch (error) {
      console.error(`Failed to evaluate condition "${condition}":`, error);
      return false; // Fail safe - don't execute if condition can't be evaluated
    }
  }
}
