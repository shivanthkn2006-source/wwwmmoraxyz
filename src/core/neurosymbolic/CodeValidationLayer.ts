// ═══════════════════════════════════════════════════════════════════════════════
// CODE VALIDATION LAYER - Client wrapper for code sandbox validator
// Calls backend to validate code before AutoFix/SelfHealer applies patches
// ═══════════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';

export interface CodeValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  dangerousPatterns: string[];
}

/** Dangerous code patterns to detect client-side (fast path) */
const DANGEROUS_PATTERNS = [
  { pattern: /\beval\s*\(/, name: 'eval()' },
  { pattern: /\.innerHTML\s*=/, name: 'innerHTML assignment' },
  { pattern: /document\.write\s*\(/, name: 'document.write()' },
  { pattern: /new\s+Function\s*\(/, name: 'new Function()' },
  { pattern: /setTimeout\s*\(\s*['"`]/, name: 'setTimeout with string' },
  { pattern: /setInterval\s*\(\s*['"`]/, name: 'setInterval with string' },
  { pattern: /__proto__/, name: '__proto__ access' },
  { pattern: /constructor\s*\[\s*['"`]/, name: 'constructor bracket access' },
];

/**
 * Quick client-side code validation (no network call)
 * Checks for syntax issues and dangerous patterns
 */
export function quickValidate(code: string): CodeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const dangerousPatterns: string[] = [];

  if (!code || code.trim().length === 0) {
    errors.push('Empty code string');
    return { valid: false, errors, warnings, dangerousPatterns };
  }

  // Check for dangerous patterns
  for (const { pattern, name } of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      dangerousPatterns.push(name);
      warnings.push(`Dangerous pattern detected: ${name}`);
    }
  }

  // Basic bracket matching
  const openBrackets = (code.match(/[{(\[]/g) || []).length;
  const closeBrackets = (code.match(/[})\]]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    errors.push(`Bracket mismatch: ${openBrackets} opening vs ${closeBrackets} closing`);
  }

  // Check for common syntax issues
  if (/;\s*;/.test(code)) {
    warnings.push('Double semicolons detected');
  }

  return {
    valid: errors.length === 0 && dangerousPatterns.length === 0,
    errors,
    warnings,
    dangerousPatterns,
  };
}

/**
 * Full validation via backend sandbox (network call)
 * Falls back to client-side validation if backend unavailable
 */
export async function validateCode(
  code: string,
  language: string = 'typescript'
): Promise<CodeValidationResult> {
  // Always run quick client-side check first
  const quickResult = quickValidate(code);
  if (!quickResult.valid) {
    return quickResult;
  }

  try {
    const { data, error } = await supabase.functions.invoke('code-sandbox-validator', {
      body: { code, language },
    });

    if (error) {
      console.warn('[CodeValidation] Backend unavailable, using client-side result');
      return quickResult;
    }

    return {
      valid: data?.valid ?? quickResult.valid,
      errors: data?.errors ?? quickResult.errors,
      warnings: [...quickResult.warnings, ...(data?.warnings || [])],
      dangerousPatterns: quickResult.dangerousPatterns,
    };
  } catch {
    // Fallback to client-side
    return quickResult;
  }
}

export default { quickValidate, validateCode };
