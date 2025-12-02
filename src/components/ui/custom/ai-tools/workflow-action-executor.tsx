'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Bot, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { WorkflowAction } from '@/app/api/data/workflow/types';
import { WorkflowActionForm } from '../workflow/workflow-action-form/workflow-action-form';
import { PerformWorkflowAction } from '@/app/api/action/workflow/workflow';
import { cn } from '@/lib/utils';

interface WorkflowActionExecutorProps {
  orgUnitCode: string;
  entityCode: string;
  entityId: string;
  action?: WorkflowAction;
  suggestedValues?: Record<string, any>;
  reasoning?: string;
  entityData?: any;
  error?: string;
}

type ExecutionState = 'ready' | 'executing' | 'success' | 'error';

interface ExecutionResult {
  message: string;
  redirectUrl?: string;
  submittedValues: Record<string, any>;
  timestamp: string;
}

export function WorkflowActionExecutor({
  orgUnitCode,
  entityCode,
  entityId,
  action,
  suggestedValues = {},
  reasoning,
  entityData,
  error
}: WorkflowActionExecutorProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [executionState, setExecutionState] = useState<ExecutionState>('ready');
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [executionError, setExecutionError] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  // Initialize form data with suggested values
  useEffect(() => {
    if (action && suggestedValues) {
      const initialData: Record<string, any> = {};
      action.form_fields?.forEach(field => {
        if (suggestedValues[field.code] !== undefined) {
          initialData[field.code] = suggestedValues[field.code];
        }
      });
      setFormData(initialData);
    }
  }, [action, suggestedValues]);

  // Handle form field changes
  const handleFormChange = (code: string, value: any) => {
    setFormData(prev => ({ ...prev, [code]: value }));

    // Mark field as modified if it differs from suggestion
    if (suggestedValues && suggestedValues[code] !== value) {
      setModifiedFields(prev => new Set(prev).add(code));
    } else {
      setModifiedFields(prev => {
        const updated = new Set(prev);
        updated.delete(code);
        return updated;
      });
    }

    // Clear error for this field when changed
    if (formErrors[code]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[code];
        return newErrors;
      });
    }
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    if (!action) return false;
    if (action.form_fields.length === 0) return true;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    action.form_fields?.forEach(field => {
      if (field.required && (!formData[field.code] || formData[field.code] === '')) {
        newErrors[field.code] = `${field.label} is required`;
        isValid = false;
      }
    });

    setFormErrors(newErrors);
    return isValid;
  };

  // Execute workflow action
  const handleExecute = async () => {
    if (executionState !== 'ready' && executionState !== 'error') return;
    if (!validateForm()) return;
    if (!action) return;

    setExecutionState('executing');
    setExecutionError('');

    try {
      // Map form data to field names for workflow context
      const data: Record<string, any> = {};
      const files: Record<string, File> = {};

      action.form_fields.forEach(field => {
        const value = formData[field.code];
        if (value instanceof File) {
          files[field.name] = value;
        } else {
          data[field.name] = value;
        }
      });

      // Create workflow action payload
      const workflowAction: PerformWorkflowAction = {
        entityCode,
        entityId,
        entityData: entityData || {},
        orgUnitCode,
        actionCode: action.code,
        data,
        ...(Object.keys(files).length > 0 && { files })
      };

      // Determine request format
      const hasFiles = Object.keys(files).length > 0;
      let requestBody: string | FormData;
      let headers: Record<string, string> = {};

      if (hasFiles) {
        const formDataBody = new FormData();
        formDataBody.append('actions', JSON.stringify([workflowAction]));
        Object.entries(files).forEach(([fieldName, file]) => {
          formDataBody.append(fieldName, file);
        });
        requestBody = formDataBody;
      } else {
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify([workflowAction]);
      }

      // Execute workflow action
      const response = await fetch('/api/action/workflow', {
        method: 'POST',
        headers,
        body: requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to execute workflow action');
      }

      const result = await response.json();
      const redirectUrls = result.redirectUrls || [];

      // Store execution result
      setExecutionResult({
        message: 'Action executed successfully',
        redirectUrl: redirectUrls[0],
        submittedValues: data,
        timestamp: new Date().toISOString()
      });
      setExecutionState('success');

    } catch (err) {
      console.error('Workflow execution error:', err);
      setExecutionError(err instanceof Error ? err.message : 'Failed to execute workflow action. Please try again.');
      setExecutionState('error');
    }
  };

  // Render error state
  if (error) {
    return (
      <Card className="w-full max-w-2xl border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Workflow Action Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!action) {
    return (
      <Card className="w-full max-w-2xl border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            Configuration Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">No workflow action provided</p>
        </CardContent>
      </Card>
    );
  }

  // Render success state (compact summary)
  if (executionState === 'success' && executionResult) {
    return (
      <Card className="w-full max-w-2xl border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            Workflow Action Executed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <div className="text-sm font-medium">
              Action: <span className="font-semibold">{action.name}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Executed: {new Date(executionResult.timestamp).toLocaleString()}
            </div>
          </div>

          {Object.keys(executionResult.submittedValues).length > 0 && (
            <div className="pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1 text-xs p-0 h-auto hover:bg-transparent"
              >
                {showDetails ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                View submitted details
              </Button>

              {showDetails && (
                <div className="mt-2 p-3 bg-background rounded-md border text-xs space-y-1">
                  {Object.entries(executionResult.submittedValues).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <span className="font-medium text-muted-foreground">{key}:</span>
                      <span className="break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Render form state (ready, executing, or error)
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{action.name}</span>
          {executionState === 'executing' && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Executing
            </Badge>
          )}
        </CardTitle>
        {action.description && (
          <p className="text-sm text-muted-foreground">{action.description}</p>
        )}
        {reasoning && (
          <Alert className="mt-2">
            <Bot className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <span className="font-medium">AI Analysis:</span> {reasoning}
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Form Fields */}
        {action.form_fields.length > 0 && (
          <div className="space-y-4">
            {action.form_fields.sort((a, b) => a.order - b.order).map(field => {
              const isSuggested = suggestedValues && suggestedValues[field.code] !== undefined;
              const isModified = modifiedFields.has(field.code);
              const showSuggestionIndicator = isSuggested && !isModified;

              return (
                <div key={field.code} className="space-y-2">
                  <div className="flex items-center gap-2">
                    {showSuggestionIndicator && (
                      <Badge variant="outline" className="text-xs gap-1 bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
                        <Bot className="h-3 w-3" />
                        AI Suggested
                      </Badge>
                    )}
                  </div>
                  <div className={cn(
                    "transition-all",
                    showSuggestionIndicator && "border-l-4 border-l-blue-400 pl-3"
                  )}>
                    <WorkflowActionForm
                      fields={[field]}
                      formData={formData}
                      formErrors={formErrors}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Error Display */}
        {executionState === 'error' && executionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {executionError}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <Button
          className="w-full"
          onClick={handleExecute}
          disabled={
            executionState === 'executing' ||
            executionState === 'success' ||
            (action.form_fields.length > 0 &&
              (Object.keys(formErrors).length > 0 ||
                action.form_fields.some(
                  field => field.required && (!formData[field.code] || formData[field.code] === '')
                )))
          }
        >
          {executionState === 'executing' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : executionState === 'error' ? (
            'Retry'
          ) : (
            `Execute ${action.name}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
