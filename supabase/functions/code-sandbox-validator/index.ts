import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, errors: ['No code provided'], warnings: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // ─── Dangerous pattern detection ─────────────────────────────────────
    const dangerousPatterns = [
      { regex: /\beval\s*\(/, name: 'eval()' },
      { regex: /\.innerHTML\s*=/, name: 'innerHTML assignment' },
      { regex: /document\.write\s*\(/, name: 'document.write()' },
      { regex: /new\s+Function\s*\(/, name: 'new Function()' },
      { regex: /__proto__/, name: '__proto__ access' },
      { regex: /process\.env/, name: 'process.env access' },
      { regex: /require\s*\(\s*['"]child_process/, name: 'child_process import' },
      { regex: /require\s*\(\s*['"]fs['"]/, name: 'fs module import' },
    ];

    for (const { regex, name } of dangerousPatterns) {
      if (regex.test(code)) {
        errors.push(`Dangerous pattern: ${name}`);
      }
    }

    // ─── Basic syntax validation ─────────────────────────────────────────
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      errors.push(`Brace mismatch: ${openBraces} opening vs ${closeBraces} closing`);
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      errors.push(`Parenthesis mismatch: ${openParens} opening vs ${closeParens} closing`);
    }

    // ─── TypeScript/JavaScript specific checks ───────────────────────────
    if (language === 'typescript' || language === 'javascript') {
      // Check for unclosed strings
      const singleQuotes = (code.match(/(?<!\\)'/g) || []).length;
      const doubleQuotes = (code.match(/(?<!\\)"/g) || []).length;
      const backticks = (code.match(/(?<!\\)`/g) || []).length;

      if (singleQuotes % 2 !== 0) warnings.push('Possible unclosed single-quoted string');
      if (doubleQuotes % 2 !== 0) warnings.push('Possible unclosed double-quoted string');
      if (backticks % 2 !== 0) warnings.push('Possible unclosed template literal');

      // Check for common anti-patterns
      if (/console\.(log|warn|error)\s*\(/.test(code)) {
        warnings.push('Console statements should be removed in production');
      }

      if (/any/.test(code) && language === 'typescript') {
        warnings.push('TypeScript `any` type detected — consider using specific types');
      }
    }

    // ─── Size check ──────────────────────────────────────────────────────
    if (code.length > 50000) {
      warnings.push('Code exceeds 50KB — consider splitting into smaller modules');
    }

    const valid = errors.length === 0;

    return new Response(
      JSON.stringify({ valid, errors, warnings }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, errors: [`Validation error: ${err.message}`], warnings: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
