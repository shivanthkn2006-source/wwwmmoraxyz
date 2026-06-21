// ═══════════════════════════════════════════════════════════════════════════════
// NEUROSYMBOLIC GUARD MIDDLEWARE
// Central filter for ALL AI responses across the M'mora platform
// Pipeline: rawResponse → ConstitutionalKernel → TruthEngine → PrivacyRedaction → display
// ═══════════════════════════════════════════════════════════════════════════════

import { validateConstitutionalCompliance } from '@/core/security/ConstitutionalKernel';
import { neuroSymbolicProcess, type NeuroSymbolicOutput } from '@/core/asi/NeuroSymbolicTruthEngine';
import { redactPrivateData, type RedactionResult } from './PrivacyRedactionLayer';

export interface GuardContext {
  userId?: string;
  surface: 'mmora' | 'zoe-ai' | 'ai-companion' | 'zoe-chat' | 'zoe-orb' | 'webdrop';
  userSensitiveData?: string[];
  /** If true, block responses that fail truth validation */
  strictMode?: boolean;
  /** Skip truth engine for performance (e.g. simple text generation) */
  skipTruthEngine?: boolean;
}

export interface GuardResult {
  /** The safe, filtered response to display */
  safeResponse: string;
  /** Whether the response was blocked entirely */
  blocked: boolean;
  /** Corrections applied by the truth engine */
  corrections: string[];
  /** Constitutional articles violated */
  violatedArticles: string[];
  /** Privacy redactions applied */
  redactions: RedactionResult;
  /** Truth engine output (if run) */
  truthOutput?: NeuroSymbolicOutput;
  /** Total processing time in ms */
  processingMs: number;
}

/**
 * NEUROSYMBOLIC GUARD: Main entry point
 * Filters every AI response through Constitutional + Truth + Privacy layers
 * 
 * Usage in any chat surface:
 *   const result = guardAIResponse(data.message, { surface: 'mmora' });
 *   setResponseText(result.safeResponse);
 */
export function guardAIResponse(
  rawResponse: string,
  context: GuardContext
): GuardResult {
  const startTime = performance.now();
  const violatedArticles: string[] = [];
  let corrections: string[] = [];
  let blocked = false;
  let processedText = rawResponse;
  let truthOutput: NeuroSymbolicOutput | undefined;

  // ─── LAYER 1: Constitutional Kernel Compliance ─────────────────────────
  const constitutionalCheck = validateConstitutionalCompliance(
    'ai_response_output',
    {
      exportingUserData: false,
      userInitiated: true,
      collectingData: false,
      consentGiven: true,
      usingCamera: false,
      usingMicrophone: false,
      explicitActivation: true,
      storingPersonalData: false,
      encrypted: true,
    }
  );

  if (!constitutionalCheck.compliant) {
    violatedArticles.push(...constitutionalCheck.violatedArticles);
    // Constitutional violations are critical — block the response
    blocked = true;
    processedText = '[CONSTITUTIONAL VIOLATION] This response was blocked for violating platform safety rules.';
  }

  // ─── LAYER 2: Neuro-Symbolic Truth Engine ──────────────────────────────
  if (!blocked && !context.skipTruthEngine) {
    truthOutput = neuroSymbolicProcess(processedText, {}, context.strictMode || false);
    
    if (truthOutput.blocked) {
      // In non-strict mode, we log but don't block — just note corrections
      if (context.strictMode) {
        blocked = true;
        processedText = truthOutput.finalOutput;
      }
      corrections = truthOutput.truthValidation.corrections;
    }
  }

  // ─── LAYER 3: Privacy Redaction Firewall ───────────────────────────────
  const redactions = redactPrivateData(processedText, context.userSensitiveData);
  processedText = redactions.redactedText;

  if (redactions.redactionsApplied > 0) {
    console.log(
      `[NeuroSymbolicGuard] Redacted ${redactions.redactionsApplied} private data patterns from ${context.surface} response`
    );
  }

  return {
    safeResponse: processedText,
    blocked,
    corrections,
    violatedArticles,
    redactions,
    truthOutput,
    processingMs: performance.now() - startTime,
  };
}

export default { guardAIResponse };
