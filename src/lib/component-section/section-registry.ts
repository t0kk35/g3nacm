/**
 * Section Registry
 *
 * Manages loading and caching of section configurations from the file system.
 * Similar to template registry but for component-based sections.
 */

import fs from 'fs';
import path from 'path';
import type { SectionConfig, SectionDefinition, SectionRegistry, SectionRegistryEntry } from './types';

/**
 * Section Registry class
 * Singleton for managing section configurations
 */
export class SectionRegistryClass {
  private sections: Map<string, SectionDefinition> = new Map();
  private initialized: boolean = false;
  private sectionsPath: string;

  constructor() {
    // Path to sections directory (relative to project root)
    this.sectionsPath = path.join(process.cwd(), 'conf/sections');
  }

  /**
   * Initialize registry by loading all sections from file system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load registry file
      const registryPath = path.join(this.sectionsPath, 'registry.json');

      if (!fs.existsSync(registryPath)) {
        console.warn(
          `Section registry file not found at ${registryPath}. No sections will be available.`
        );
        this.initialized = true;
        return;
      }

      const registryContent = fs.readFileSync(registryPath, 'utf-8');
      const registry: SectionRegistry = JSON.parse(registryContent);

      // Load each section
      for (const entry of registry.sections) {
        if (!entry.enabled) continue;

        try {
          const definition = await this.loadSectionFromFile(entry);
          this.sections.set(entry.code, definition);
        } catch (error) {
          console.error(`Failed to load section ${entry.code}:`, error);
        }
      }

      this.initialized = true;
      console.log(`Section registry initialized with ${this.sections.size} sections`);
    } catch (error) {
      console.error('Failed to initialize section registry:', error);
      this.initialized = true; // Mark as initialized even on error to prevent retries
    }
  }

  /**
   * Load a section configuration from file system
   */
  private async loadSectionFromFile(
    entry: SectionRegistryEntry
  ): Promise<SectionDefinition> {
    const sectionDir = path.join(this.sectionsPath, entry.path);
    const configPath = path.join(sectionDir, 'config.json');

    if (!fs.existsSync(configPath)) {
      throw new Error(`Section config not found at ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config: SectionConfig = JSON.parse(configContent);

    // Validate config has required fields
    if (!config.code || !config.rootComponent) {
      throw new Error(`Invalid section config in ${configPath}`);
    }

    return {
      config,
      loaded_at: new Date().toISOString(),
    };
  }

  /**
   * Get a section by code
   * Auto-initializes if not already initialized
   */
  async getSection(code: string): Promise<SectionDefinition | undefined> {
    if (!this.initialized) await this.initialize();
    return this.sections.get(code);
  }

  /**
   * Get all registered sections
   */
  async getAllSections(): Promise<SectionDefinition[]> {
    if (!this.initialized) await this.initialize();
    return Array.from(this.sections.values());
  }

  /**
   * Check if a section exists
   */
  async exists(code: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    return this.sections.has(code);
  }

  /**
   * Reload all sections from file system
   * Useful for development
   */
  async reload(): Promise<void> {
    this.sections.clear();
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Reload a specific section
   */
  async reloadSection(code: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      return;
    }

    // Find registry entry
    const registryPath = path.join(this.sectionsPath, 'registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    const registry: SectionRegistry = JSON.parse(registryContent);

    const entry = registry.sections.find((s) => s.code === code);
    if (!entry) {
      throw new Error(`Section ${code} not found in registry`);
    }

    if (!entry.enabled) {
      this.sections.delete(code);
      return;
    }

    const definition = await this.loadSectionFromFile(entry);
    this.sections.set(code, definition);
  }

  /**
   * Get sections by entity code
   */
  async getSectionsByEntity(entityCode: string): Promise<SectionDefinition[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.sections.values()).filter(
      (s) => s.config.metadata?.entityCode === entityCode
    );
  }

  /**
   * Clear the registry (for testing)
   */
  clear(): void {
    this.sections.clear();
    this.initialized = false;
  }
}

/**
 * Global section registry instance
 */
export const sectionRegistry = new SectionRegistryClass();
