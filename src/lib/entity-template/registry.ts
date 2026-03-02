/**
 * Entity Template Registry
 *
 * Manages template loading, caching, and lookup. Templates are stored in the
 * file system under /templates/entity-details/ and loaded on demand.
 * Follows the pattern established by the dynamic-screen widget registry.
 */

import fs from 'fs/promises';
import path from 'path';
import { TemplateConfig, TemplateDefinition, TemplateRegistry as TemplateRegistryType, TemplateRegistryEntry } from './types';

const TEMPLATE_BASE_PATH = path.join(process.cwd(), 'templates', 'entity-details');

/**
 * Template registry class for managing template definitions
 * Singleton pattern with lazy initialization
 */
class TemplateRegistry {
  private templates: Map<string, TemplateDefinition> = new Map();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the registry by loading all templates from the file system
   * Safe to call multiple times - will only initialize once
   */
  async initialize(): Promise<void> {
    // If already initialized, return immediately
    if (this.initialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start initialization
    this.initPromise = this._doInitialize();

    try {
      await this.initPromise;
      this.initialized = true;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Internal initialization logic
   */
  private async _doInitialize(): Promise<void> {
    try {
      // Load the registry file
      const registryPath = path.join(TEMPLATE_BASE_PATH, 'registry.json');
      const registryContent = await fs.readFile(registryPath, 'utf-8');
      const registry: TemplateRegistryType = JSON.parse(registryContent);

      // Load each enabled template
      for (const entry of registry.templates) {
        if (!entry.enabled) {
          continue;
        }

        try {
          const templateDef = await this.loadTemplate(entry);
          this.templates.set(entry.entity_code, templateDef);
        } catch (error) {
          console.error(
            `Failed to load template for entity ${entry.entity_code}:`,
            error
          );
          // Continue loading other templates even if one fails
        }
      }

      console.log(
        `Template registry initialized with ${this.templates.size} template(s)`
      );
    } catch (error) {
      console.error('Failed to initialize template registry:', error);
      throw new Error(
        `Template registry initialization failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Load a single template from the file system
   */
  private async loadTemplate(
    entry: TemplateRegistryEntry
  ): Promise<TemplateDefinition> {
    const templateDir = path.join(TEMPLATE_BASE_PATH, entry.path);

    // Load config.json
    const configPath = path.join(templateDir, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config: TemplateConfig = JSON.parse(configContent);

    // Validate config
    if (config.entity_code !== entry.entity_code) {
      throw new Error(
        `Entity code mismatch: registry has "${entry.entity_code}" but config has "${config.entity_code}"`
      );
    }

    // Load template.liquid
    const templatePath = path.join(templateDir, 'template.liquid');
    const content = await fs.readFile(templatePath, 'utf-8');

    return { config, content };
  }

  /**
   * Get a template by entity code
   * @param entityCode The entity code (e.g., "aml.rule.alert")
   * @returns Template definition or undefined if not found
   */
  async getTemplate(
    entityCode: string
  ): Promise<TemplateDefinition | undefined> {
    await this.initialize();
    return this.templates.get(entityCode);
  }

  /**
   * Get all registered templates
   * @returns Array of [entityCode, templateDefinition] tuples
   */
  async getAllTemplates(): Promise<[string, TemplateDefinition][]> {
    await this.initialize();
    return Array.from(this.templates.entries());
  }

  /**
   * Check if a template exists for the given entity code
   * @param entityCode The entity code to check
   * @returns True if template exists
   */
  async exists(entityCode: string): Promise<boolean> {
    await this.initialize();
    return this.templates.has(entityCode);
  }

  /**
   * Get list of all available entity codes
   * @returns Array of entity codes
   */
  async getAvailableEntityCodes(): Promise<string[]> {
    await this.initialize();
    return Array.from(this.templates.keys());
  }

  /**
   * Reload templates from file system
   * Useful for development when templates are edited
   */
  async reload(): Promise<void> {
    console.log('Reloading template registry...');
    this.initialized = false;
    this.templates.clear();
    await this.initialize();
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    total: number;
    byEntityType: Record<string, number>;
  }> {
    await this.initialize();

    const byEntityType: Record<string, number> = {};

    for (const [, template] of this.templates) {
      const entityType = template.config.entity_type;
      byEntityType[entityType] = (byEntityType[entityType] || 0) + 1;
    }

    return {
      total: this.templates.size,
      byEntityType,
    };
  }
}

// Singleton instance
export const templateRegistry = new TemplateRegistry();

/**
 * Get a template by entity code
 * Convenience function that uses the singleton registry
 */
export async function getTemplateByEntityCode(
  entityCode: string
): Promise<TemplateDefinition | undefined> {
  return await templateRegistry.getTemplate(entityCode);
}

/**
 * Check if a template exists
 * Convenience function that uses the singleton registry
 */
export async function templateExists(entityCode: string): Promise<boolean> {
  return await templateRegistry.exists(entityCode);
}

/**
 * Reload all templates (for development)
 * Convenience function that uses the singleton registry
 */
export async function reloadTemplates(): Promise<void> {
  return await templateRegistry.reload();
}

/**
 * Get all available entity codes
 * Convenience function that uses the singleton registry
 */
export async function getAvailableEntityCodes(): Promise<string[]> {
  return await templateRegistry.getAvailableEntityCodes();
}
