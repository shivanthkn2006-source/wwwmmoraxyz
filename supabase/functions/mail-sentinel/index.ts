import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sovereignKey, sovereignFetch } from "../_shared/sovereign-ai.ts";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE INFINITY MAIL - MAIL SENTINEL (GATEKEEPER AGENT)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The "Quadrillion" Feature: Autonomous inbox management
 * 
 * Capabilities:
 * - Ingestion: Auto-tag emails (Urgent, Finance, Social, Trash)
 * - Calendar Loops: Check schedule, draft Accept/Propose responses
 * - Bill Detection: Extract amount + due date → LifeCodex
 * - Briefing Mode: "What did I miss?" → Contextual summary
 * 
 * Architecture: Standalone for migration
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOVEREIGN_AI_KEY = () => sovereignKey();
const AI_GATEWAY = "sovereign://chat/completions";

// Email classification categories
type EmailCategory = 'urgent' | 'finance' | 'social' | 'work' | 'newsletter' | 'meeting' | 'spam' | 'personal';

interface EmailAnalysis {
  category: EmailCategory;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  summary: string;
  actionRequired: boolean;
  suggestedAction?: {
    type: 'reply' | 'archive' | 'delete' | 'schedule' | 'track_finance' | 'forward';
    description: string;
    autoExecute: boolean;
    draftContent?: string;
  };
  extractedData?: {
    amount?: number;
    currency?: string;
    dueDate?: string;
    eventDate?: string;
    eventTime?: string;
    senderIntent?: string;
  };
  sentiment: 'positive' | 'neutral' | 'negative';
  phishingRisk: number; // 0-1
}

interface BriefingRequest {
  userId: string;
  timeRange?: 'today' | 'yesterday' | 'week';
  includeArchived?: boolean;
}

interface BriefingResponse {
  urgentCount: number;
  urgentItems: { sender: string; subject: string; summary: string }[];
  actionsPending: number;
  newslettersArchived: number;
  spamBlocked: number;
  voiceSummary: string;
  highlights: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const { action, payload } = await req.json();
    
    console.log(`[MailSentinel] Action: ${action}`);

    switch (action) {
      case 'analyze':
        return await analyzeEmail(payload);
      case 'briefing':
        return await generateBriefing(payload);
      case 'auto_respond':
        return await generateAutoResponse(payload);
      case 'batch_process':
        return await batchProcessEmails(payload);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`[MailSentinel] Error after ${latencyMs}ms:`, errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage, code: "SENTINEL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL ANALYSIS (The Gatekeeper Brain)
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeEmail(payload: {
  sender: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  isVerifiedSender?: boolean;
}): Promise<Response> {
  const apiKey = SOVEREIGN_AI_KEY();
  if (!apiKey) {
    throw new Error("SOVEREIGN_AI_KEY not configured");
  }

  const systemPrompt = `You are the Mail Sentinel - Zoe's autonomous inbox guardian.

Analyze the email and return a JSON object with this exact structure:
{
  "category": "urgent" | "finance" | "social" | "work" | "newsletter" | "meeting" | "spam" | "personal",
  "priority": "urgent" | "high" | "normal" | "low",
  "summary": "2-3 sentence summary of the email's key content",
  "actionRequired": true/false,
  "suggestedAction": {
    "type": "reply" | "archive" | "delete" | "schedule" | "track_finance" | "forward",
    "description": "What should be done",
    "autoExecute": true/false (true only for spam deletion or obvious archives),
    "draftContent": "If reply, draft a professional response"
  },
  "extractedData": {
    "amount": null or number (if invoice/bill),
    "currency": "USD" | "EUR" | "INR" etc,
    "dueDate": "YYYY-MM-DD" or null,
    "eventDate": "YYYY-MM-DD" or null (if meeting),
    "eventTime": "HH:MM" or null,
    "senderIntent": "brief description of what sender wants"
  },
  "sentiment": "positive" | "neutral" | "negative",
  "phishingRisk": 0.0-1.0
}

CLASSIFICATION RULES:
- "urgent": Needs immediate attention, time-sensitive, from VIP
- "finance": Bills, invoices, bank statements, payment requests
- "meeting": Calendar invites, scheduling requests
- "social": Personal messages from friends/family
- "work": Professional correspondence, project updates
- "newsletter": Bulk subscriptions, marketing emails
- "spam": Obvious junk, phishing attempts, suspicious content
- "personal": Direct personal messages not fitting other categories

PHISHING DETECTION:
- Check for suspicious domains (misspellings of known brands)
- Urgency + money requests = high risk
- Generic greetings with sensitive info requests = high risk
- Prize/lottery claims = maximum risk

Return ONLY valid JSON, no markdown.`;

  const userPrompt = `Analyze this email:

FROM: ${payload.sender} <${payload.senderEmail}>
RECEIVED: ${payload.receivedAt}
VERIFIED SENDER: ${payload.isVerifiedSender ? 'Yes' : 'No'}
SUBJECT: ${payload.subject}

BODY:
${payload.body.substring(0, 2000)}`;

  const response = await sovereignFetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limited", code: "RATE_LIMITED" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Credits exhausted", code: "PAYMENT_REQUIRED" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse JSON response
  let analysis: EmailAnalysis;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysis = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch {
    // Fallback if parsing fails
    analysis = {
      category: 'personal',
      priority: 'normal',
      summary: 'Email analyzed but classification uncertain.',
      actionRequired: false,
      sentiment: 'neutral',
      phishingRisk: 0.1,
    };
  }

  console.log(`[MailSentinel] ✓ Analyzed: ${analysis.category} / ${analysis.priority}`);

  return new Response(
    JSON.stringify({ analysis }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY BRIEFING (What Did I Miss?)
// ═══════════════════════════════════════════════════════════════════════════════

async function generateBriefing(payload: {
  emails: Array<{
    sender: string;
    subject: string;
    category: string;
    priority: string;
    summary?: string;
    actionRequired?: boolean;
  }>;
  timeRange: string;
}): Promise<Response> {
  const apiKey = SOVEREIGN_AI_KEY();
  if (!apiKey) {
    throw new Error("SOVEREIGN_AI_KEY not configured");
  }

  const { emails, timeRange } = payload;

  // Count categories
  const urgentItems = emails.filter(e => e.priority === 'urgent' || e.category === 'urgent');
  const newslettersArchived = emails.filter(e => e.category === 'newsletter').length;
  const spamBlocked = emails.filter(e => e.category === 'spam').length;
  const actionsPending = emails.filter(e => e.actionRequired).length;

  const systemPrompt = `You are Zoe's Mail Sentinel generating a briefing.

Create a natural, conversational voice summary for text-to-speech.
Keep it under 100 words. Be direct and efficient.
Prioritize urgent items first, then notable updates.
Use natural phrasing like "You have..." or "I noticed..." or "There's...".
Do NOT list every email. Summarize by theme.`;

  const emailSummary = emails.map(e => 
    `- [${e.category}/${e.priority}] ${e.sender}: "${e.subject}"${e.summary ? ` - ${e.summary}` : ''}`
  ).join('\n');

  const userPrompt = `Generate a voice briefing for these emails from ${timeRange}:

URGENT COUNT: ${urgentItems.length}
NEWSLETTERS ARCHIVED: ${newslettersArchived}
SPAM BLOCKED: ${spamBlocked}
ACTIONS PENDING: ${actionsPending}

EMAILS:
${emailSummary}

Return JSON:
{
  "voiceSummary": "Natural TTS-friendly summary",
  "highlights": ["key point 1", "key point 2", "key point 3"]
}`;

  const response = await sovereignFetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  let parsed = { voiceSummary: "", highlights: [] as string[] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    parsed.voiceSummary = `You have ${urgentItems.length} urgent items and ${actionsPending} actions pending. ${newslettersArchived} newsletters were archived and ${spamBlocked} spam emails were blocked.`;
  }

  const briefing: BriefingResponse = {
    urgentCount: urgentItems.length,
    urgentItems: urgentItems.map(e => ({
      sender: e.sender,
      subject: e.subject,
      summary: e.summary || '',
    })),
    actionsPending,
    newslettersArchived,
    spamBlocked,
    voiceSummary: parsed.voiceSummary,
    highlights: parsed.highlights,
  };

  console.log(`[MailSentinel] ✓ Briefing generated: ${urgentItems.length} urgent`);

  return new Response(
    JSON.stringify({ briefing }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-RESPONSE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

async function generateAutoResponse(payload: {
  originalEmail: {
    sender: string;
    subject: string;
    body: string;
  };
  responseType: 'accept_meeting' | 'decline_meeting' | 'propose_time' | 'acknowledge' | 'request_info';
  userContext?: {
    name?: string;
    schedule?: { date: string; available: boolean }[];
    preferences?: string;
  };
}): Promise<Response> {
  const apiKey = SOVEREIGN_AI_KEY();
  if (!apiKey) {
    throw new Error("SOVEREIGN_AI_KEY not configured");
  }

  const { originalEmail, responseType, userContext } = payload;

  const responseTemplates: Record<string, string> = {
    accept_meeting: "Draft a professional email accepting this meeting invitation. Be concise and confirm the details.",
    decline_meeting: "Draft a polite decline. Suggest rescheduling if appropriate. Keep it brief and professional.",
    propose_time: "Draft a reply proposing alternative meeting times. Be helpful and professional.",
    acknowledge: "Draft a brief acknowledgment email. Confirm receipt and any next steps.",
    request_info: "Draft a reply asking for more information. Be specific about what's needed.",
  };

  const systemPrompt = `You are drafting email responses on behalf of the user.

STYLE RULES:
- Professional but warm
- Concise - maximum 3-4 sentences for most responses
- Match the formality level of the original email
- Sign off appropriately (Best, Regards, Thanks, etc.)
${userContext?.name ? `- Sign as: ${userContext.name}` : '- Do not include a signature'}
${userContext?.preferences ? `- User preferences: ${userContext.preferences}` : ''}

Return JSON:
{
  "subject": "Re: original subject or new subject",
  "body": "The email body",
  "tone": "professional" | "friendly" | "formal"
}`;

  const userPrompt = `${responseTemplates[responseType]}

ORIGINAL EMAIL:
From: ${originalEmail.sender}
Subject: ${originalEmail.subject}
Body: ${originalEmail.body.substring(0, 1000)}

${userContext?.schedule ? `USER SCHEDULE:\n${JSON.stringify(userContext.schedule)}` : ''}`;

  const response = await sovereignFetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";

  let draft = { subject: `Re: ${originalEmail.subject}`, body: "", tone: "professional" };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      draft = JSON.parse(jsonMatch[0]);
    }
  } catch {
    draft.body = "Thank you for your email. I will review and respond shortly.";
  }

  console.log(`[MailSentinel] ✓ Auto-response drafted: ${responseType}`);

  return new Response(
    JSON.stringify({ draft }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH PROCESSING
// ═══════════════════════════════════════════════════════════════════════════════

async function batchProcessEmails(payload: {
  emails: Array<{
    id: string;
    sender: string;
    senderEmail: string;
    subject: string;
    bodyPreview: string;
  }>;
}): Promise<Response> {
  const apiKey = SOVEREIGN_AI_KEY();
  if (!apiKey) {
    throw new Error("SOVEREIGN_AI_KEY not configured");
  }

  const { emails } = payload;

  // Process emails in batch for efficiency
  const systemPrompt = `You are the Mail Sentinel doing rapid batch classification.

For each email, return a JSON array with objects containing:
{
  "id": "email id",
  "category": "urgent" | "finance" | "social" | "work" | "newsletter" | "meeting" | "spam" | "personal",
  "priority": "urgent" | "high" | "normal" | "low",
  "summary": "10-15 word summary",
  "autoAction": "archive" | "delete" | "flag" | "none"
}

Be fast and accurate. Focus on obvious classifications.`;

  const emailList = emails.map(e => 
    `ID: ${e.id}\nFROM: ${e.sender} <${e.senderEmail}>\nSUBJECT: ${e.subject}\nPREVIEW: ${e.bodyPreview?.substring(0, 200) || 'No preview'}`
  ).join('\n\n---\n\n');

  const response = await sovereignFetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Classify these ${emails.length} emails:\n\n${emailList}` }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  let results: Array<{
    id: string;
    category: string;
    priority: string;
    summary: string;
    autoAction: string;
  }> = [];

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      results = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.error("[MailSentinel] Failed to parse batch results");
  }

  console.log(`[MailSentinel] ✓ Batch processed: ${results.length}/${emails.length} emails`);

  return new Response(
    JSON.stringify({ results, processed: results.length, total: emails.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
