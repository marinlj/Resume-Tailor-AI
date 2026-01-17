// lib/agent/tools/utils.ts
import { z } from 'zod';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Standard result type for all tools
 * Tools should return success: true with data, or success: false with error message
 */
export type ToolResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Wraps a tool execute function with try-catch error handling
 * Returns structured ToolResult instead of throwing
 */
export function withErrorHandling<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>
): (input: TInput) => Promise<ToolResult<TOutput>> {
  return async (input: TInput) => {
    try {
      const data = await fn(input);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, error: message };
    }
  };
}

/**
 * Safely parse JSON with Zod schema validation
 * Returns the parsed data or null with error message
 */
export function safeJsonParse<T>(
  json: string,
  schema: z.ZodType<T>
): { data: T; error: null } | { data: null; error: string } {
  try {
    const parsed = JSON.parse(json);
    const result = schema.safeParse(parsed);
    if (!result.success) {
      return { data: null, error: `Validation error: ${result.error.message}` };
    }
    return { data: result.data, error: null };
  } catch {
    return { data: null, error: 'Invalid JSON format' };
  }
}

/**
 * Sanitize a string for use in filenames
 * Removes all characters except alphanumeric, underscore, hyphen
 */
export function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

/**
 * User context storage using AsyncLocalStorage for proper async context propagation
 * This ensures the userId is available throughout the entire request lifecycle,
 * including async tool executions in streaming contexts.
 */
interface UserContext {
  userId: string;
}

const userContextStorage = new AsyncLocalStorage<UserContext>();

/**
 * Run a function within a user context. All async operations inside
 * will have access to the userId via getCurrentUserId().
 */
export function runWithUserId<T>(userId: string, fn: () => T): T {
  console.log('[utils] runWithUserId called with:', userId);
  return userContextStorage.run({ userId }, fn);
}

/**
 * Get the current user ID from async context.
 * Falls back to module-level variable for backward compatibility.
 */
export function getCurrentUserId(): string {
  const context = userContextStorage.getStore();
  console.log('[utils] getCurrentUserId called, context:', context?.userId ?? 'none');

  if (context?.userId) {
    return context.userId;
  }

  // Fallback to module-level variable (for backward compatibility during transition)
  if (currentUserId) {
    console.log('[utils] Falling back to module-level userId:', currentUserId);
    return currentUserId;
  }

  throw new Error('User ID not set. Ensure auth middleware is working and using runWithUserId.');
}

// Legacy module-level variable (fallback only)
let currentUserId: string | null = null;

/**
 * @deprecated Use runWithUserId() instead. This is kept for backward compatibility.
 */
export function setCurrentUserId(userId: string) {
  console.log('[utils] setCurrentUserId called with:', userId);
  currentUserId = userId;
}

/**
 * Get the temporary user ID until auth is implemented
 * @deprecated Use getCurrentUserId() instead - kept for backward compatibility during transition
 */
export function getTempUserId(): string {
  return getCurrentUserId();
}
