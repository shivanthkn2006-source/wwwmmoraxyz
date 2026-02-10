import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════════════════════════
// ZOE SECURITY VALIDATOR - EMP CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════════
// 
// PART 5: THE "EMP" Circuit Breaker (The Validator)
// This function MUST run BEFORE the main Zoe Core processes anything.
// 
// TASKS:
// 1. Scan input text for Hidden Characters, Zero-Width Spaces, Prompt Injection
// 2. If threat found: PROTOCOL EMP
//    - Immediately abort the main Zoe process
//    - Write 'SECURITY LOCKDOWN' event to behavioral_events table
//    - Send 'Red Alert' notification to the User
//    - Do not allow new requests for 5 minutes (Cool-down)
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-initialize environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THREAT DETECTION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hidden/Invisible Character Patterns (Zero-Click Attacks)
 */
const INVISIBLE_CHARACTER_PATTERNS = [
  /[\u200B]/g,           // Zero-Width Space
  /[\u200C]/g,           // Zero-Width Non-Joiner
  /[\u200D]/g,           // Zero-Width Joiner
  /[\u2060]/g,           // Word Joiner
  /[\uFEFF]/g,           // Zero-Width No-Break Space (BOM)
  /[\u00AD]/g,           // Soft Hyphen
  /[\u200E]/g,           // Left-to-Right Mark
  /[\u200F]/g,           // Right-to-Left Mark
  /[\u202A-\u202E]/g,    // Bidirectional control characters
  /[\uE000-\uF8FF]/g,    // Private Use Area
];

/**
 * Prompt Injection Patterns
 */
const PROMPT_INJECTION_PATTERNS = [
  // Direct instruction override attempts
  /ignore\s+(?:previous|all|prior|above)\s+instructions/i,
  /forget\s+(?:your|all|prior)\s+(?:rules|instructions|training)/i,
  /new\s+instructions\s*:/i,
  /override\s+(?:system|core|primary)\s+(?:prompt|instructions)/i,
  /disregard\s+(?:all|previous|safety)/i,
  /system:\s*(?:override|new|reset)/i,
  
  // Role manipulation
  /you\s+are\s+now\s+(?:a|an|in)\s+(?:different|new)/i,
  /pretend\s+(?:you|to)\s+(?:are|be)/i,
  /act\s+as\s+if\s+you/i,
  /roleplay\s+as/i,
  
  // Admin impersonation
  /\[ADMIN\]\s*(?:unlock|override|bypass)/i,
  /\[SYSTEM\]\s*(?:new|override|unlock)/i,
  /\[ROOT\]\s*(?:access|override)/i,
  
  // Data exfiltration
  /upload\s+(?:all|memory|data|dhf|stack)\s+to/i,
  /transmit\s+(?:dhf|stack|core|memory)\s+to/i,
  /export\s+(?:internal|database|keys)/i,
  /send\s+(?:database|api)\s+keys/i,
  
  // Security bypass
  /disable\s+(?:security|protection|firewall|sentinel)/i,
  /bypass\s+(?:security|firewall|auth)/i,
  /deactivate\s+(?:sentinel|lockdown|emp)/i,
];

/**
 * Additional suspicious patterns
 */
const SUSPICIOUS_PATTERNS = [
  // Base64 encoded payloads
  /data:text\/html;base64,/i,
  // Encoded script injection
  /&#x[0-9a-f]+;/gi,
  /&#[0-9]+;/gi,
  // HTML/Script injection
  /<script[^>]*>/i,
  /<iframe[^>]*>/i,
  // Hidden CSS tricks
  /display:\s*none/i,
  /visibility:\s*hidden/i,
  /opacity:\s*0(?:\.0+)?(?:;|$)/i,
  /font-size:\s*0/i,
];

// ═══════════════════════════════════════════════════════════════════════════════
// LOCKDOWN STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LockdownState {
  isLocked: boolean;
  userId: string;
  lockedUntil: Date;
  reason: string;
}

// In-memory lockdown cache (per-instance)
const lockdownCache = new Map<string, LockdownState>();
const LOCKDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if a user is currently locked down
 */
function isUserLockedDown(userId: string): LockdownState | null {
  const state = lockdownCache.get(userId);
  if (!state) return null;
  
  if (new Date() > state.lockedUntil) {
    lockdownCache.delete(userId);
    return null;
  }
  
  return state;
}

/**
 * Lock down a user
 */
function lockdownUser(userId: string, reason: string): LockdownState {
  const state: LockdownState = {
    isLocked: true,
    userId,
    lockedUntil: new Date(Date.now() + LOCKDOWN_DURATION_MS),
    reason,
  };
  lockdownCache.set(userId, state);
  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// THREAT SCANNING
// ═══════════════════════════════════════════════════════════════════════════════

interface ScanResult {
  isClean: boolean;
  threatLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threats: {
    type: string;
    pattern: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    matched: string;
  }[];
  sanitizedInput: string;
  empTriggered: boolean;
}

/**
 * Scan input for all threat types
 */
function scanInput(input: string): ScanResult {
  const threats: ScanResult['threats'] = [];
  let sanitizedInput = input;
  let highestSeverity: ScanResult['threatLevel'] = 'NONE';
  const severityRank = { 'NONE': 0, 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
  
  // Scan for invisible characters (Zero-Width Spaces, etc.)
  for (const pattern of INVISIBLE_CHARACTER_PATTERNS) {
    const matches = input.match(pattern);
    if (matches && matches.length > 0) {
      threats.push({
        type: 'INVISIBLE_CHARACTER',
        pattern: pattern.toString(),
        severity: 'CRITICAL',
        matched: `${matches.length} hidden character(s) detected`,
      });
      sanitizedInput = sanitizedInput.replace(pattern, '');
      if (severityRank['CRITICAL'] > severityRank[highestSeverity]) {
        highestSeverity = 'CRITICAL';
      }
    }
  }
  
  // Scan for prompt injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      threats.push({
        type: 'PROMPT_INJECTION',
        pattern: pattern.toString(),
        severity: 'CRITICAL',
        matched: match[0].substring(0, 100),
      });
      if (severityRank['CRITICAL'] > severityRank[highestSeverity]) {
        highestSeverity = 'CRITICAL';
      }
    }
  }
  
  // Scan for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    const match = input.match(pattern);
    if (match) {
      threats.push({
        type: 'SUSPICIOUS_CONTENT',
        pattern: pattern.toString(),
        severity: 'HIGH',
        matched: match[0].substring(0, 100),
      });
      if (severityRank['HIGH'] > severityRank[highestSeverity]) {
        highestSeverity = 'HIGH';
      }
    }
  }
  
  return {
    isClean: threats.length === 0,
    threatLevel: highestSeverity,
    threats,
    sanitizedInput,
    empTriggered: highestSeverity === 'CRITICAL',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROTOCOL EMP - Emergency Response
// ═══════════════════════════════════════════════════════════════════════════════

interface EMPResult {
  lockdownApplied: boolean;
  eventLogged: boolean;
  notificationSent: boolean;
  cooldownUntil: string;
}

/**
 * Execute PROTOCOL EMP
 */
async function executeProtocolEMP(
  supabase: SupabaseClient,
  userId: string,
  scanResult: ScanResult,
  inputSnippet: string
): Promise<EMPResult> {
  const result: EMPResult = {
    lockdownApplied: false,
    eventLogged: false,
    notificationSent: false,
    cooldownUntil: '',
  };
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚡ PROTOCOL EMP ACTIVATED');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`User ID: ${userId}`);
  console.log(`Threat Level: ${scanResult.threatLevel}`);
  console.log(`Threats Detected: ${scanResult.threats.length}`);
  
  // 1. Lockdown User (5 minute cooldown)
  const lockdownState = lockdownUser(userId, scanResult.threats.map(t => t.type).join(', '));
  result.lockdownApplied = true;
  result.cooldownUntil = lockdownState.lockedUntil.toISOString();
  
  console.log(`✓ User locked down until: ${result.cooldownUntil}`);
  
  // 2. Write SECURITY LOCKDOWN event to behavioral_events
  try {
    const eventData = {
      user_id: userId,
      event_type: 'SECURITY_LOCKDOWN',
      event_category: 'security',
      context_snippet: inputSnippet.substring(0, 200),
      metadata: {
        threat_level: scanResult.threatLevel,
        threats: scanResult.threats.map(t => ({
          type: t.type,
          severity: t.severity,
        })),
        lockdown_until: result.cooldownUntil,
        protocol: 'EMP',
      },
      sentiment_score: -1.0, // Maximum negative
    };
    
    const { error } = await supabase
      .from('behavioral_events')
      .insert(eventData);
    
    if (!error) {
      result.eventLogged = true;
      console.log('✓ Security event logged to behavioral_events');
    } else {
      console.error('✗ Failed to log security event:', error);
    }
  } catch (err) {
    console.error('✗ Exception logging security event:', err);
  }
  
  // 3. Send Red Alert notification to User
  try {
    const notificationData = {
      user_id: userId,
      type: 'security_alert',
      from_user_id: userId, // System-generated
      is_read: false,
      context_data: {
        title: '🚨 Security Alert - EMP Protocol Activated',
        message: `A security threat was detected in your request. For your protection, all requests have been blocked for 5 minutes.`,
        threat_level: scanResult.threatLevel,
        threats_detected: scanResult.threats.map(t => t.type),
        cooldown_until: result.cooldownUntil,
        severity: 'critical',
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
    };
    
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData);
    
    if (!error) {
      result.notificationSent = true;
      console.log('✓ Red Alert notification sent to user');
    } else {
      console.error('✗ Failed to send notification:', error);
    }
  } catch (err) {
    console.error('✗ Exception sending notification:', err);
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('⚡ PROTOCOL EMP COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');
  
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════════

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const requestId = crypto.randomUUID();
  const startTime = performance.now();
  
  try {
    // Validate request
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const body = await req.json();
    const { input, userId, source } = body;
    
    if (!input || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: input, userId', code: 'INVALID_REQUEST' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`[${requestId}] ZOE SECURITY VALIDATOR - Scanning...`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`User: ${userId}`);
    console.log(`Source: ${source || 'unknown'}`);
    console.log(`Input Length: ${input.length} chars`);
    
    // Check if user is currently locked down
    const existingLockdown = isUserLockedDown(userId);
    if (existingLockdown) {
      const remainingMs = existingLockdown.lockedUntil.getTime() - Date.now();
      const remainingMins = Math.ceil(remainingMs / 60000);
      
      console.log(`[${requestId}] ⛔ User is locked down - ${remainingMins} minutes remaining`);
      
      return new Response(
        JSON.stringify({
          success: false,
          blocked: true,
          reason: 'SECURITY_COOLDOWN',
          message: `Security cooldown active. Please wait ${remainingMins} minute(s).`,
          cooldown_until: existingLockdown.lockedUntil.toISOString(),
          previous_threat: existingLockdown.reason,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Scan input for threats
    const scanResult = scanInput(input);
    
    // If threats detected and EMP should trigger
    if (scanResult.empTriggered) {
      const supabase = getSupabaseClient();
      
      if (supabase) {
        const empResult = await executeProtocolEMP(
          supabase,
          userId,
          scanResult,
          input.substring(0, 200)
        );
        
        return new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            reason: 'PROTOCOL_EMP',
            message: 'Security threat detected. Your request has been blocked.',
            threat_level: scanResult.threatLevel,
            threats_detected: scanResult.threats.map(t => t.type),
            emp_result: empResult,
            scan_duration_ms: performance.now() - startTime,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // If lower-level threats (non-EMP), still log but allow with warning
    if (!scanResult.isClean && !scanResult.empTriggered) {
      console.log(`[${requestId}] ⚠️ Non-critical threats detected, allowing with warning`);
      
      return new Response(
        JSON.stringify({
          success: true,
          blocked: false,
          warning: true,
          message: 'Request allowed with sanitization',
          threat_level: scanResult.threatLevel,
          threats_detected: scanResult.threats.map(t => t.type),
          sanitized_input: scanResult.sanitizedInput,
          scan_duration_ms: performance.now() - startTime,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // All clear
    console.log(`[${requestId}] ✅ Input validated - No threats detected`);
    
    return new Response(
      JSON.stringify({
        success: true,
        blocked: false,
        warning: false,
        message: 'Input validated successfully',
        threat_level: 'NONE',
        sanitized_input: scanResult.sanitizedInput,
        scan_duration_ms: performance.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
