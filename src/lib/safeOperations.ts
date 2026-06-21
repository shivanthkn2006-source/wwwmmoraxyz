// ═══════════════════════════════════════════════════════════════════════════════
// SAFE OPERATIONS - PLATFORM-WIDE ERROR PREVENTION
// Provides null-safe, error-resistant operations for all components
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely access nested object properties without throwing
 */
export function safeGet<T>(
  obj: any,
  path: string,
  defaultValue: T
): T {
  try {
    const keys = path.split('.');
    let result = obj;
    
    for (const key of keys) {
      if (result === null || result === undefined) {
        return defaultValue;
      }
      result = result[key];
    }
    
    return result === undefined || result === null ? defaultValue : result as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely execute an async function with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  defaultValue: T,
  errorHandler?: (error: Error) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler && error instanceof Error) {
      errorHandler(error);
    }
    console.error('[SafeAsync] Operation failed:', error);
    return defaultValue;
  }
}

/**
 * Safely execute a sync function with error handling
 */
export function safeSync<T>(
  fn: () => T,
  defaultValue: T,
  errorHandler?: (error: Error) => void
): T {
  try {
    return fn();
  } catch (error) {
    if (errorHandler && error instanceof Error) {
      errorHandler(error);
    }
    console.error('[SafeSync] Operation failed:', error);
    return defaultValue;
  }
}

/**
 * Safely parse JSON with fallback
 */
export function safeParseJSON<T>(
  jsonString: string | null | undefined,
  defaultValue: T
): T {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely stringify an object
 */
export function safeStringify(
  obj: any,
  defaultValue: string = '{}'
): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
}

/**
 * Create a debounced version of a function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Create a throttled version of a function
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.log(`[RetryWithBackoff] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retries failed');
}

/**
 * Check if a value is null or undefined
 */
export function isNullish(value: any): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Ensure a value is an array
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (isNullish(value)) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Safely access array element
 */
export function safeArrayAccess<T>(
  arr: T[] | null | undefined,
  index: number,
  defaultValue: T
): T {
  if (!arr || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index] ?? defaultValue;
}

/**
 * Clean an object for database insertion (remove undefined, validate JSON)
 */
export function cleanForDatabase(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue; // Skip undefined values
    }
    
    if (value === null) {
      cleaned[key] = null;
      continue;
    }
    
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Object value - ensure it's valid JSON
      try {
        JSON.stringify(value);
        cleaned[key] = value;
      } catch {
        console.warn(`[cleanForDatabase] Invalid JSON for key ${key}, skipping`);
      }
    } else if (Array.isArray(value)) {
      // Array value - ensure each element is valid
      cleaned[key] = value.filter(item => {
        if (typeof item === 'object') {
          try {
            JSON.stringify(item);
            return true;
          } catch {
            return false;
          }
        }
        return true;
      });
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Create an error boundary wrapper for async functions
 */
export function withErrorBoundary<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallback: ReturnType<T> extends Promise<infer R> ? R : never,
  onError?: (error: Error, args: Parameters<T>) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[ErrorBoundary] Caught error:', err);
      onError?.(err, args);
      return fallback;
    }
  }) as T;
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 10000); // Limit length
}

/**
 * Check if an object is empty
 */
export function isEmpty(obj: any): boolean {
  if (isNullish(obj)) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim() === '';
  return false;
}

/**
 * Safe execution result type
 */
export interface SafeResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Execute an async function safely and return a structured result
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[SafeExecute${context ? `: ${context}` : ''}] Error:`, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Retry an operation with specified retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }
  
  throw lastError || new Error('All retries failed');
}

export default {
  safeGet,
  safeAsync,
  safeSync,
  safeParseJSON,
  safeStringify,
  debounce,
  throttle,
  retryWithBackoff,
  isNullish,
  ensureArray,
  safeArrayAccess,
  cleanForDatabase,
  withErrorBoundary,
  sanitizeInput,
  isEmpty,
  safeExecute,
  withRetry
};
