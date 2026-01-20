import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a conversation title from the first message.
 * Extracts first ~50 characters, cutting at word boundary.
 */
export function generateTitle(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'New conversation';
  if (cleaned.length <= 50) return cleaned;

  const truncated = cleaned.slice(0, 50);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 20) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}
