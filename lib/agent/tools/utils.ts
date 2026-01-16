// lib/agent/tools/utils.ts
import { z } from 'zod';

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
 * Get the temporary user ID until auth is implemented
 */
export function getTempUserId(): string {
  return process.env.TEMP_USER_ID || 'temp-user-id';
}
