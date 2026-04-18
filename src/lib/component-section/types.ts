/**
 * Component-Based Dynamic Section System - Type Definitions
 *
 * Defines types for rendering rich UI sections using a component-based approach.
 * Supports two data modes:
 * - Reference Mode: Data fetched via API orchestrator, referenced with {{variable}} syntax
 * - Inline Mode: Data embedded directly in component props (for AI agents)
 */

import React from 'react';
import { z } from 'zod';
import type { TemplateApiCall, TemplateContext, TemplateError } from '../entity-template/types';

/**
 * Re-export entity-template types for convenience
 */
export type { TemplateApiCall, TemplateContext, TemplateError };

/**
 * Data mode for component prop resolution
 */
export type DataMode = 'inline' | 'reference' | 'hybrid';

/**
 * Component category for organization
 */
export enum ComponentCategory {
  LAYOUT = 'layout',
  DATA_DISPLAY = 'data-display',
  CONTENT = 'content',
  NAVIGATION = 'navigation',
  FORM = 'form',
}

/**
 * Example configuration for a component (used by AI agents)
 */
export interface ComponentExample {
  /** Example title */
  title: string;

  /** Example description */
  description: string;

  /** Example component configuration */
  config: ComponentConfig;
}

/**
 * Definition of a component that can be rendered
 * Registered in ComponentRegistry
 */
export interface ComponentDefinition {
  /** Unique code for this component (e.g., "card", "tabs", "data-table") */
  code: string;

  /** Human-readable name */
  name: string;

  /** Component description */
  description: string;

  /** React component to render */
  component: React.ComponentType<any>;

  /** Optional skeleton/loading component */
  skeletonComponent?: React.ComponentType<any>;

  /** Zod schema for validating props */
  propsSchema: z.ZodSchema<any>;

  /** Default props */
  defaultProps: Record<string, any>;

  /** Whether this component can have children */
  allowsChildren: boolean;

  /** Allowed child component types (empty = any) */
  allowedChildren?: string[];

  /** Required permissions to use this component */
  permissions?: string[];

  /** Component category */
  category: ComponentCategory;

  /** Tags for searching/filtering */
  tags?: string[];

  /** Example configurations for AI agents */
  examples?: ComponentExample[];
}

/**
 * Configuration for a single component instance
 * Can be nested recursively for complex layouts
 */
export interface ComponentConfig {
  /** Unique identifier for this component instance */
  id: string;

  /** Component type code (must match a registered component) */
  type: string;

  /** Component-specific props */
  props: Record<string, any>;

  /** Nested child components */
  children?: ComponentConfig[];

  /** Data mode for this component */
  dataMode?: DataMode;

  /** Data references extracted from props (auto-computed) */
  dataReferences?: string[];

  /** Conditional rendering expression (JavaScript) */
  condition?: string;

  /** Required permissions for this component instance */
  permissions?: string[];
}

/**
 * Complete section configuration
 * Defines API calls, permissions, and component tree
 */
export interface SectionConfig {
  /** Unique section code */
  code: string;

  /** Section name */
  name: string;

  /** Section description */
  description?: string;

  /** Section version */
  version: string;

  /** Required permissions to render this section */
  permissions: string[];

  /** API calls to execute before rendering (reference mode) */
  apiCalls: TemplateApiCall[];

  /** Root component of the section */
  rootComponent: ComponentConfig;

  /** Cache TTL in seconds (optional) */
  cacheTtl?: number;

  /**
   * Root i18n namespace for this section (e.g. "ComponentSection.Sections.SubjectIND").
   * When set, it is automatically injected into component props as `i18nNamespace`
   * so components like `field` can resolve labels via next-intl without repeating
   * the namespace in every prop block.  Individual components can still override
   * this by supplying their own `i18nNamespace` prop directly.
   */
  i18nNamespace?: string;

  /** Metadata */
  metadata?: {
    /** Entity code this section is for (optional) */
    entityCode?: string;

    /** Entity type (optional) */
    entityType?: string;

    /** Created by username */
    createdBy?: string;

    /** Creation timestamp */
    createdAt?: string;

    /** Last updated timestamp */
    updatedAt?: string;
  };
}

/**
 * Error specific to section rendering
 */
export interface SectionError extends TemplateError {
  /** Component ID where error occurred (if applicable) */
  componentId?: string;

  /** Component type where error occurred (if applicable) */
  componentType?: string;
}

/**
 * Result of section rendering
 */
export interface RenderedSection {
  /** Entity ID that was rendered (if applicable) */
  entity_id?: string;

  /** Entity code that was rendered (if applicable) */
  entity_code?: string;

  /** Section code that was rendered */
  section_code: string;

  /** Rendered React component */
  component: React.ReactElement;

  /** Timestamp when rendering completed */
  rendered_at: string;

  /** Data context used for rendering */
  context: TemplateContext;

  /** List of API endpoints that were called */
  data_sources?: string[];

  /** Errors that occurred (if any) */
  errors?: SectionError[];

  /** Section version used */
  section_version?: string;
}

/**
 * Section registry entry
 */
export interface SectionRegistryEntry {
  /** Section code */
  code: string;

  /** Path to section config file */
  path: string;

  /** Whether this section is enabled */
  enabled: boolean;

  /** Entity code this section is for (optional) */
  entityCode?: string;

  /** Last update timestamp */
  last_updated: string;

  /**
   * Data schema version this section targets (e.g. "1.0.0").
   * Omit (or use "*") to match any version — acts as a wildcard/default.
   * When multiple entries share the same code, the one whose schema_version
   * exactly matches the requested version is preferred; the wildcard entry
   * is used as a fallback.
   */
  schema_version?: string;
}

/**
 * Section registry file format
 */
export interface SectionRegistry {
  /** List of registered sections */
  sections: SectionRegistryEntry[];
}

/**
 * Complete section definition (config + metadata)
 */
export interface SectionDefinition {
  /** Section configuration */
  config: SectionConfig;

  /** Load timestamp */
  loaded_at: string;
}

/**
 * Component registry export format for AI agents
 */
export interface ComponentExport {
  /** Component code */
  code: string;

  /** Component name */
  name: string;

  /** Component description */
  description: string;

  /** Component category */
  category: ComponentCategory;

  /** Whether component allows children */
  allowsChildren: boolean;

  /** Allowed child types */
  allowedChildren?: string[];

  /** Props schema in JSON Schema format */
  propsSchema: any;

  /** Default props */
  defaultProps: Record<string, any>;

  /** Example configurations */
  examples?: ComponentExample[];
}
