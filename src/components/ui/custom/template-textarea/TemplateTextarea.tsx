'use client'

import { useState, useRef, useEffect, useMemo, useCallback, type TextareaHTMLAttributes } from 'react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { TemplateVariablePopover } from './TemplateVariablePopover'
import { TEMPLATE_VARIABLES } from './template-variables'
import { renderHighlightedText, getCurrentVariableQuery, getVariableInsertPosition, debounce } from './template-textarea-utils'
import { cn } from '@/lib/utils'
// @ts-ignore - package doesn't have types
import getCaretCoordinates from 'textarea-caret'
import type { TemplateVariable } from './template-variables'
import { Textarea } from '../../textarea'

interface TemplateTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

interface AutocompleteState {
  isOpen: boolean;
  query: string;
  cursorPosition: { top: number; left: number } | null;
  insertPosition: number;
}

export function TemplateTextarea({
  value,
  onChange,
  error,
  className,
  rows = 8,
  placeholder,
  id,
  ...props
}: TemplateTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const [autocompleteState, setAutocompleteState] = useState<AutocompleteState>({
    isOpen: false,
    query: '',
    cursorPosition: null,
    insertPosition: 0
  });

  // Track if we're currently typing for optimization
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Optimized highlight rendering - only debounce during rapid typing
  const updateHighlight = useMemo(
    () => {
      const update = (text: string) => {
        requestAnimationFrame(() => {
          setHighlightedHtml(renderHighlightedText(text));
        });
      };

      const debouncedUpdate = debounce(update, 50);

      return (text: string, immediate = false) => {
        if (immediate) {
          update(text);
        } else {
          debouncedUpdate(text);
        }
      };
    },
    []
  );

  // Initialize highlight on mount
  useEffect(() => {
    setHighlightedHtml(renderHighlightedText(value || ''));
  }, []);

  // Update highlighting when value changes
  useEffect(() => {
    // Use immediate update if not typing, debounced if typing rapidly
    updateHighlight(value || '', !isTypingRef.current);
  }, [value, updateHighlight]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Synchronize scroll between textarea and highlight layer (passive for better performance)
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      requestAnimationFrame(() => {
        if (highlightRef.current) {
          highlightRef.current.scrollTop = e.currentTarget.scrollTop;
          highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
      });
    }
  }, []);

  // Get cursor coordinates for popover positioning
  const getCursorCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
    const coords = getCaretCoordinates(textarea, position);
    const rect = textarea.getBoundingClientRect();

    // Account for textarea scroll position
    return {
      top: rect.top + coords.top - textarea.scrollTop,
      left: rect.left + coords.left - textarea.scrollLeft
    };
  };

  // Handle text change and autocomplete trigger
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const selectionStart = e.target.selectionStart || 0;

    // Mark as typing for optimization
    isTypingRef.current = true;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
    }, 150);

    onChange(newText);

    // Check if we should trigger autocomplete
    const query = getCurrentVariableQuery(newText, selectionStart);

    if (query !== null) {
      // User is typing a variable - only calculate cursor position if needed
      const cursorCoords = getCursorCoordinates(e.target, selectionStart);
      const insertPos = getVariableInsertPosition(newText, selectionStart);

      setAutocompleteState({
        isOpen: true,
        query,
        cursorPosition: cursorCoords,
        insertPosition: insertPos
      });
    } else if (autocompleteState.isOpen) {
      // Only update state if it was open (avoid unnecessary renders)
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Handle variable selection from autocomplete
  const handleVariableSelect = (variable: TemplateVariable) => {
    if (!textareaRef.current) return;

    const { insertPosition, query } = autocompleteState;
    const currentValue = value;

    // Calculate positions
    const beforeVariable = currentValue.substring(0, insertPosition - 2); // Remove '{{'
    const afterVariable = currentValue.substring(insertPosition + query.length);

    // Insert complete variable
    const newValue = `${beforeVariable}{{${variable.name}}}${afterVariable}`;
    const newCursorPos = beforeVariable.length + variable.name.length + 4; // After '}}'

    onChange(newValue);

    // Close autocomplete
    setAutocompleteState(prev => ({ ...prev, isOpen: false }));

    // Restore cursor position and focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!autocompleteState.isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
    }
    // Other keys (Arrow, Enter) are handled by Command component
  };

  // Close autocomplete when clicking outside
  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Check if the focus moved to the popover (relatedTarget)
    // If so, don't close the popover
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && relatedTarget.closest('[role="dialog"]')) {
      return;
    }

    // Delay to allow click on popover item to register
    setTimeout(() => {
      setAutocompleteState(prev => ({ ...prev, isOpen: false }));
    }, 200);
  };

  return (
    <div className="relative">
      {/* Container with grid layout for overlay */}
      <div className={cn("relative grid", className)}>
        {/* Highlight layer (behind) */}
        <div
          ref={highlightRef}
          className="col-start-1 row-start-1 pointer-events-none whitespace-pre-wrap wrap-break-words overflow-hidden border border-transparent rounded-md px-3 py-2 text-sm text-foreground"
          style={{
            lineHeight: '1.5',
            fontFamily: 'inherit',
            overflowY: 'auto'
          }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          aria-hidden="true"
        />

        {/* Textarea (on top) */}
        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={handleTextChange}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          rows={rows}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            "col-start-1 row-start-1 flex min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-y",
            "relative z-10",
            error && "border-red-500 focus-visible:ring-red-500"
          )}
          style={{
            lineHeight: '1.5',
            fontFamily: 'inherit',
            color: 'transparent',
            caretColor: 'currentColor',
            WebkitTextFillColor: 'transparent'
          }}
          {...props}
        />
      </div>

      {/* Autocomplete popover */}
      <Popover
        open={autocompleteState.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAutocompleteState(prev => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <PopoverAnchor asChild>
          <div
            style={{
              position: 'fixed',
              top: `${autocompleteState.cursorPosition?.top ?? 0}px`,
              left: `${autocompleteState.cursorPosition?.left ?? 0}px`,
              width: 0,
              height: 0,
              pointerEvents: 'none'
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-96 p-0 max-h-80 overflow-auto"
          sideOffset={20}
          alignOffset={-5}
          collisionPadding={10}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Don't close when clicking inside the popover itself
            const target = e.target as HTMLElement;
            if (target.closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
        >
          <TemplateVariablePopover
            query={autocompleteState.query}
            variables={TEMPLATE_VARIABLES}
            onSelect={handleVariableSelect}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
