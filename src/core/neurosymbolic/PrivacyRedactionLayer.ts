// ═══════════════════════════════════════════════════════════════════════════════
// PRIVACY REDACTION LAYER - Constitutional Article 2 Enforcement
// Scans AI output for private data patterns and redacts before display
// ═══════════════════════════════════════════════════════════════════════════════

export interface RedactionResult {
  redactedText: string;
  redactionsApplied: number;
  redactedPatterns: string[];
}

// Patterns that match common private data in AI output
const PRIVATE_DATA_PATTERNS: Array<{ name: string; regex: RegExp; replacement: string }> = [
  {
    name: 'email',
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL REDACTED]',
  },
  {
    name: 'phone',
    // Require leading + or ( to avoid matching plain number sequences
    regex: /(?:\+\d{1,3}[-.\s]?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}|\(\d{2,4}\)[-.\s]?\d{3,4}[-.\s]?\d{3,4})\b/g,
    replacement: '[PHONE REDACTED]',
  },
  {
    name: 'ssn',
    regex: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN REDACTED]',
  },
  {
    name: 'credit_card',
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CARD REDACTED]',
  },
  {
    name: 'aadhaar',
    // Match 12-digit sequences with mandatory spaces (to avoid credit card overlap)
    regex: /\b\d{4}\s\d{4}\s\d{4}\b/g,
    replacement: '[ID REDACTED]',
  },
  {
    name: 'ip_address',
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP REDACTED]',
  },
  {
    name: 'address',
    regex: /\b\d{1,5}\s+[\w\s]{3,30}(?:street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|court|ct|place|pl)\b/gi,
    replacement: '[ADDRESS REDACTED]',
  },
];

/**
 * Scan and redact private data from AI output text
 * Enforces Constitutional Article 2: Privacy by Default
 */
export function redactPrivateData(
  text: string,
  userSensitiveData?: string[] // optional list of user-specific strings to redact
): RedactionResult {
  let redactedText = text;
  let redactionsApplied = 0;
  const redactedPatterns: string[] = [];

  // Apply pattern-based redaction
  for (const pattern of PRIVATE_DATA_PATTERNS) {
    const matches = redactedText.match(pattern.regex);
    if (matches && matches.length > 0) {
      redactedText = redactedText.replace(pattern.regex, pattern.replacement);
      redactionsApplied += matches.length;
      redactedPatterns.push(pattern.name);
    }
  }

  // Apply user-specific sensitive data redaction
  if (userSensitiveData && userSensitiveData.length > 0) {
    for (const sensitiveItem of userSensitiveData) {
      if (sensitiveItem.length < 3) continue; // skip very short strings
      const escaped = sensitiveItem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const itemRegex = new RegExp(escaped, 'gi');
      const matches = redactedText.match(itemRegex);
      if (matches && matches.length > 0) {
        redactedText = redactedText.replace(itemRegex, '[PRIVATE DATA REDACTED]');
        redactionsApplied += matches.length;
        redactedPatterns.push('user_sensitive');
      }
    }
  }

  return {
    redactedText,
    redactionsApplied,
    redactedPatterns,
  };
}

export default { redactPrivateData };
