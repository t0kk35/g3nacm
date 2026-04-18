/**
 * Component Section Renderer (Client-Side)
 *
 * Client-side component that renders a section configuration with resolved data.
 * Takes SectionConfig + Context and recursively renders the component tree.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { componentRegistry } from '@/lib/component-section/component-registry';
import { dataResolver } from '@/lib/component-section/data-resolver';
import { registerComponents } from '.';
import { ComponentError } from './ComponentError';
import type { SectionConfig, ComponentConfig, TemplateContext, DataMode, SectionError } from '@/lib/component-section/types';

interface ComponentSectionRendererProps {
  /** Section configuration */
  sectionConfig: SectionConfig;

  /** Resolved data context */
  context: TemplateContext;

  /** Optional errors from server */
  errors?: SectionError[];
}

/**
 * Component Section Renderer
 * Renders section configuration on the client
 */
export function ComponentSectionRenderer({
  sectionConfig,
  context,
  errors: serverErrors,
}: ComponentSectionRendererProps) {
  const [errors, setErrors] = useState<SectionError[]>(serverErrors || []);
  const [isReady, setIsReady] = useState(false);

  // Ensure components are registered
  useEffect(() => {
    if (!componentRegistry.isInitialized()) {
      registerComponents();
    }
    setIsReady(true);
  }, []);

  // Render a single component recursively
  const renderComponent = (config: ComponentConfig): React.ReactElement => {
    try {
      // Get component definition
      const definition = componentRegistry.get(config.type);
      if (!definition) {
        return (
          <ComponentError
            key={config.id}
            componentId={config.id}
            type={config.type}
            message={`Unknown component type: ${config.type}`}
            severity="error"
          />
        );
      }

      // Check condition if specified
      if (config.condition) {
        const shouldRender = dataResolver.evaluateCondition(
          config.condition,
          context
        );
        if (!shouldRender) {
          return <React.Fragment key={config.id} />;
        }
      }

      // Resolve props
      const dataMode: DataMode = config.dataMode || 'inline';
      let resolvedProps = dataResolver.resolveProps(
        config.props || {},
        dataMode,
        context
      );

      // Inject section-level i18nNamespace when the component doesn't already
      // specify its own.  Components that don't use it will have it stripped
      // during Zod validation; those that do (e.g. field) will keep it.
      if (sectionConfig.i18nNamespace && resolvedProps.i18nNamespace === undefined) {
        resolvedProps = { ...resolvedProps, i18nNamespace: sectionConfig.i18nNamespace };
      }

      // Validate props
      const validation = componentRegistry.validate(config.type, resolvedProps);
      if (!validation.success) {
        return (
          <ComponentError
            key={config.id}
            componentId={config.id}
            type={config.type}
            message="Invalid props"
            errors={validation.errors}
            severity="warning"
          />
        );
      }

      resolvedProps = validation.data || resolvedProps;

      // Render children
      let children: React.ReactNode = null;
      if (config.children && config.children.length > 0) {
        children = config.children.map((childConfig) =>
          renderComponent(childConfig)
        );
      }

      // Create React element
      const Component = definition.component;
      return <Component {...resolvedProps} key={config.id}>{children}</Component>;
    } catch (error) {
      return (
        <ComponentError
          key={config.id}
          componentId={config.id}
          type={config.type}
          message={`Render error: ${(error as Error).message}`}
          severity="error"
        />
      );
    }
  };

  if (!isReady) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="component-section">
      {/* Show server errors if any */}
      {errors.length > 0 && (
        <div className="mb-4 space-y-2">
          {errors.map((error, index) => (
            <ComponentError
              key={index}
              componentId={error.componentId}
              type={error.componentType}
              message={error.message}
              severity={error.recoverable ? 'warning' : 'error'}
            />
          ))}
        </div>
      )}

      {/* Render component tree */}
      <div className="section-content">
        {renderComponent(sectionConfig.rootComponent)}
      </div>

      {/* Debug metadata */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium">
            Section Debug Info
          </summary>
          <div className="mt-2 space-y-2">
            <div>
              <strong>Section:</strong> {sectionConfig.name} ({sectionConfig.code})
            </div>
            <div>
              <strong>Version:</strong> {sectionConfig.version}
            </div>
            <div>
              <strong>Entity ID:</strong> {context.entity_id}
            </div>
            <div>
              <strong>Data Keys:</strong> {Object.keys(context).join(', ')}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
