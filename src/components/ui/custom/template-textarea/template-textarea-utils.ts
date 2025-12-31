import { VALID_TEMPLATE_VARIABLES } from './template-variables';

// Regex pattern for matching template variables (same as template-utils.ts)
const TEMPLATE_VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

// HTML escape function for safe rendering
export function htmlEscape(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Render text with highlighted template variables
export function renderHighlightedText(text: string): string {
  if (!text) return '';

  let lastIndex = 0;
  let result = '';
  let match: RegExpExecArray | null;

  // Reset regex lastIndex
  const regex = new RegExp(TEMPLATE_VARIABLE_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0]; // e.g., "{{userName}}"
    const variableName = match[1].trim(); // e.g., "userName"
    const matchStart = match.index;

    // Add text before the match (escaped)
    if (matchStart > lastIndex) {
      result += htmlEscape(text.substring(lastIndex, matchStart));
    }

    // Determine if variable is valid
    const isValid = VALID_TEMPLATE_VARIABLES.has(variableName);

    // Add highlighted variable
    if (isValid) {
      result += `<span class="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded">${htmlEscape(fullMatch)}</span>`;
    } else {
      result += `<span class="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-1 rounded">${htmlEscape(fullMatch)}</span>`;
    }

    lastIndex = matchStart + fullMatch.length;
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    result += htmlEscape(text.substring(lastIndex));
  }

  return result;
}

// Detect incomplete variables (e.g., "{{user" without closing)
export function hasIncompleteVariable(text: string, cursorPosition: number): boolean {
  const beforeCursor = text.substring(0, cursorPosition);
  const match = beforeCursor.match(/\{\{[^}]*$/);
  return match !== null;
}

// Extract the current variable query being typed
export function getCurrentVariableQuery(text: string, cursorPosition: number): string | null {
  const beforeCursor = text.substring(0, cursorPosition);
  const match = beforeCursor.match(/\{\{([^}]*)$/);
  return match ? match[1] : null;
}

// Find the position where variable insertion should start (the position of "{{")
export function getVariableInsertPosition(text: string, cursorPosition: number): number {
  const beforeCursor = text.substring(0, cursorPosition);
  const match = beforeCursor.match(/\{\{([^}]*)$/);
  if (match) {
    return cursorPosition - match[1].length;
  }
  return cursorPosition;
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
