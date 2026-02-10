/**
 * JSON Validation Utilities
 * Prevents "invalid input syntax for type json" database errors
 */

/**
 * Validates if a value can be safely serialized to JSON
 */
export const isValidJSON = (data: unknown): boolean => {
  if (data === null || data === undefined) return true;
  
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
};

/**
 * Sanitizes an object for safe JSON storage in database
 */
export const sanitizeForJSON = <T>(data: T): T | null => {
  if (data === null || data === undefined) return null;
  
  try {
    const sanitized = JSON.stringify(data, (key, value) => {
      if (value === undefined) return null;
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'function') return undefined;
      if (typeof value === 'symbol') return undefined;
      if (typeof value === 'number' && !isFinite(value)) return null;
      return value;
    });
    
    return JSON.parse(sanitized) as T;
  } catch {
    console.warn('[JSONValidator] Failed to sanitize data');
    return null;
  }
};

/**
 * Creates safe metadata object for behavioral_events and similar tables
 */
export const createSafeMetadata = (data: Record<string, unknown>): Record<string, unknown> | null => {
  const cleaned = sanitizeForJSON(data);
  return cleaned || null;
};
