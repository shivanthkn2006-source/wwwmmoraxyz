// ═══════════════════════════════════════════════════════════════════════════════
// ZOE PERCEPTION ENGINE - Multimodal Vision & Document Analysis
// The Eyes and Ears of Zoe - Computer Vision, OCR, NLP Integration
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PerceptionRequest {
  media_type: 'image' | 'document' | 'video';
  media_data: string; // base64 encoded
  file_name?: string;
  context?: string; // User message context
  cross_reference?: boolean; // Query past visual memories
  debug?: boolean; // Return the identification decision trail
  scan_purpose?: string; // e.g. 'identity_rescan'
}

interface PerceptionAnalysis {
  objects: string[];
  scene: string;
  context: string;
  text_extracted: string | null;
  emotional_sentiment: string;
  colors: string[];
  entities: string[];
  summary: string;
  visual_tags: string[];
  person_present?: boolean;
  subject_identity?: 'account_holder' | 'other_person' | 'no_person' | 'unknown';
  identity_match_confidence?: number;
  identity_notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[Zoe Perception] ═══ INCOMING REQUEST ═══');

  try {
    const authHeader = req.headers.get('Authorization') || '';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = sovereignKey();
    
    if (!lovableKey) {
      console.error('[Zoe Perception] SOVEREIGN_AI_KEY not configured');
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Resolve user from JWT when present. Anonymous/expired tokens (e.g. the
    // publishable key) are allowed through as guests — vision still works,
    // only per-user memory writes are skipped.
    const token = authHeader.replace('Bearer ', '').trim();
    let userId: string | null = null;
    if (token) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
      else console.warn('[Zoe Perception] Guest mode (no valid session):', userError?.message);
    }

    const { media_type, media_data, file_name, context, cross_reference, debug, scan_purpose }: PerceptionRequest = await req.json();

    // Identification decision trail — always logged server-side, returned only
    // when the caller explicitly asks for debug output.
    const decisionTrail: Record<string, unknown> = {
      scan_purpose: scan_purpose || 'general',
      authenticated: Boolean(userId),
      media_type,
      received_kb: Math.round((media_data?.length || 0) / 1024),
    };

    if (!media_data) {
      console.error('[Zoe Perception] No media data provided');
      return new Response(JSON.stringify({ error: 'No media data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mediaSize = Math.round(media_data.length / 1024);
    console.log(`[Zoe Perception] Processing ${media_type} for ${userId ? userId.substring(0, 8) : 'guest'}... | Size: ${mediaSize}KB`);

    // Query past visual memories if cross-referencing enabled
    let pastVisuals: any[] = [];
    if (cross_reference && userId) {
      const { data: memories } = await supabase
        .from('zoe_sovereign_memory')
        .select('content_text, zoe_state_json, created_at')
        .eq('user_id', userId)
        .eq('event_type', 'multimodal_visual_scan')
        .order('created_at', { ascending: false })
        .limit(10);
      
      pastVisuals = memories || [];
    }

    // Identity grounding: who the account holder is, and whether a locked
    // reference photo exists so the model can compare instead of guessing.
    let holderName = '';
    let referenceUrl: string | null = null;
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, zoe_identity_photo_url, zoe_identity_photo_path, zoe_identity_dhf_locked, profile_photo_url')
        .eq('user_id', userId)
        .maybeSingle();
      holderName = (profile as any)?.display_name || (profile as any)?.username || '';
      referenceUrl = (profile as any)?.zoe_identity_photo_url || (profile as any)?.profile_photo_url || null;
      decisionTrail.reference_source = (profile as any)?.zoe_identity_photo_url
        ? 'identity-vault'
        : (profile as any)?.profile_photo_url
          ? 'profile-photo'
          : 'none';
      decisionTrail.reference_path = (profile as any)?.zoe_identity_photo_path || null;
      decisionTrail.dhf_locked = Boolean((profile as any)?.zoe_identity_dhf_locked);
      console.log('[Zoe Perception][identity] reference resolved:', decisionTrail.reference_source);
    }

    // Build vision analysis prompt based on media type
    let analysisPrompt = '';
    if (media_type === 'image' || media_type === 'video') {
      analysisPrompt = `You are Zoe's visual perception system. Analyze this ${media_type} with deep empathy and context awareness.

IDENTITY RULES (never break these):
1. You (Zoe) are a software companion. You have NO body and you NEVER appear in any ${media_type} the user shares. Never describe a person in the media as "Zoe", "me", or "myself".
2. Any human in the media is the user or someone they know. ${holderName ? `The account holder is named "${holderName}".` : ''}
3. Describe ONLY what is actually visible. Do NOT invent objects, activities, props (books, coffee, laptops), locations or moods that are not clearly in the frame. If the ${media_type} is a plain portrait on a solid background, say exactly that.
4. If you are unsure who the person is, say so instead of asserting an identity.
${referenceUrl ? `5. A second image is attached: the account holder's saved reference photo. Compare faces and decide whether the FIRST image shows the same person.` : `5. No saved reference photo exists for this account, so subject_identity must be "unknown" when a person is present.`}

Provide a JSON response with these fields:
- objects: Array of detected objects (only clearly visible ones)
- scene: Description of the scene/environment
- context: What's happening in this ${media_type}
- text_extracted: Any visible text (OCR)
- emotional_sentiment: The emotional tone (joy, calm, excitement, melancholy, etc.)
- colors: Dominant colors
- entities: Named entities (people, brands, locations)
- summary: A warm, factual, human summary of exactly what is visible
- visual_tags: Searchable tags for memory
- person_present: true/false — is a human face visible in the FIRST image
- subject_identity: one of "account_holder" | "other_person" | "no_person" | "unknown"
- identity_match_confidence: 0.0-1.0 confidence for subject_identity
- identity_notes: one short sentence explaining the identity judgement

${pastVisuals.length > 0 ? `
Past visual memories for context (do NOT treat them as visible content):
${pastVisuals.slice(0, 3).map(m => `- ${m.content_text} (${new Date(m.created_at).toLocaleDateString()})`).join('\n')}
` : ''}

${context ? `User context: "${context}"` : ''}

Respond ONLY with valid JSON. Be empathetic but strictly accurate — accuracy outranks warmth.`;
    } else if (media_type === 'document') {
      analysisPrompt = `You are Zoe's document analysis system. Analyze this document thoroughly and extract ALL text content.

Provide a JSON response with these fields:
- objects: Document type and structure (array of strings)
- scene: Document category (legal, personal, financial, creative, technical, etc.)
- context: Purpose and intent of the document
- text_extracted: COMPLETE extraction of ALL text content from the document. This is the most important field - include every word, paragraph, and section you can read.
- emotional_sentiment: Tone of the document
- colors: ["N/A"] for documents
- entities: Key named entities (names, dates, amounts, companies)
- summary: Concise 2-3 sentence summary of the document
- visual_tags: Searchable tags
- description: Full readable content formatted for human consumption

${context ? `User context: "${context}"` : ''}

CRITICAL: Extract and include ALL readable text in text_extracted field. This content will be used for creative production planning.

Respond ONLY with valid JSON.`;
    }

    // Call vision model
    let analysis: PerceptionAnalysis;
    
    try {
      console.log('[Zoe Perception] Calling Gemini 2.5 Flash for vision analysis...');
      
      const response = await sovereignFetch('sovereign://chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: analysisPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'FIRST image — the media the user just shared. Analyze this:' },
                { type: 'image_url', image_url: { url: media_data } },
                ...(media_type === 'image' && referenceUrl
                  ? [
                      { type: 'text', text: 'SECOND image — the account holder\'s saved reference photo, for identity comparison only. Never describe it as the shared media.' },
                      { type: 'image_url', image_url: { url: referenceUrl } },
                    ]
                  : []),
              ],
            }
          ],
          temperature: 0.2,
          max_tokens: 1500,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Zoe Perception] Vision API error: ${response.status}`, errorText);
        
        // Handle rate limits
        if (response.status === 429) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Rate limit exceeded, please try again in a moment',
            zoe_response: 'I need a moment to rest my eyes. Please try again shortly.',
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Vision API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      console.log('[Zoe Perception] AI response length:', content.length);
      
      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
        // Normalize fields so downstream code is bulletproof
        const normStr = (v: any): string => {
          if (typeof v === 'string') return v;
          if (v && typeof v === 'object') return String(v.name ?? v.label ?? v.value ?? v.text ?? JSON.stringify(v));
          return String(v ?? '');
        };
        analysis.objects = Array.isArray(analysis.objects) ? analysis.objects.map(normStr).filter(Boolean) : [];
        analysis.entities = Array.isArray(analysis.entities) ? analysis.entities.map(normStr).filter(Boolean) : [];
        analysis.colors = Array.isArray(analysis.colors) ? analysis.colors.map(normStr).filter(Boolean) : [];
        analysis.visual_tags = Array.isArray(analysis.visual_tags) ? analysis.visual_tags.map(normStr).filter(Boolean) : [];
        analysis.summary = normStr(analysis.summary) || normStr(analysis.scene) || 'I see what you shared.';
        analysis.scene = normStr(analysis.scene);
        analysis.context = normStr(analysis.context);
        analysis.emotional_sentiment = normStr(analysis.emotional_sentiment) || 'neutral';
        analysis.text_extracted = analysis.text_extracted ? normStr(analysis.text_extracted) : null;
        analysis.person_present = analysis.person_present === true;
        const allowedIdentity = ['account_holder', 'other_person', 'no_person', 'unknown'];
        analysis.subject_identity = allowedIdentity.includes(String(analysis.subject_identity))
          ? analysis.subject_identity
          : (analysis.person_present ? 'unknown' : 'no_person');
        // Without a stored reference there is nothing to match against.
        if (!referenceUrl && analysis.subject_identity === 'account_holder') {
          analysis.subject_identity = 'unknown';
        }
        analysis.identity_match_confidence = Number(analysis.identity_match_confidence) || 0;
        analysis.identity_notes = normStr(analysis.identity_notes);
        // Last-resort guard: Zoe must never be named as the subject of a user photo.
        if (analysis.person_present) {
          analysis.summary = analysis.summary.replace(/\bZoe\b/g, holderName || 'the person in your photo');
        }
        console.log('[Zoe Perception] ✓ Parsed analysis:', analysis.scene, '| Objects:', analysis.objects.slice(0, 3).join(', '));
      } else {
        console.error('[Zoe Perception] No valid JSON in response:', content.substring(0, 200));
        throw new Error('No valid JSON in response');
      }
    } catch (err) {
      console.error('[Zoe Perception] Vision analysis error:', err);
      // Graceful fallback - "cognitive flicker" response
      analysis = {
        objects: [],
        scene: 'Unable to process',
        context: 'I seem to have experienced a minor cognitive flicker while processing this...',
        text_extracted: null,
        emotional_sentiment: 'neutral',
        colors: [],
        entities: [],
        summary: 'I had a moment of visual uncertainty. Could you try sharing that again?',
        visual_tags: ['processing_error'],
      };
    }

    // Store in Zoe Sovereign Memory Table (ZSMT) — only for signed-in users
    if (userId) {
    const { error: memoryError } = await supabase
      .from('zoe_sovereign_memory')
      .insert({
        user_id: userId,
        event_type: 'multimodal_visual_scan',
        content_text: analysis.summary,
        zoe_state_json: {
          visual_sentiment: analysis.emotional_sentiment,
          objects_detected: analysis.objects,
          scene_description: analysis.scene,
          extracted_text: analysis.text_extracted,
          visual_tags: analysis.visual_tags,
          entities: analysis.entities,
          colors: analysis.colors,
          media_type,
          file_name,
          past_context_used: pastVisuals.length > 0,
        },
        command_context: { user_context: context },
        importance_score: 7, // Visual memories are important
      });

    if (memoryError) {
      console.error('[Zoe Perception] Memory storage error:', memoryError);
    }

    // Also log to behavioral stream for DHF
    await supabase.from('behavioral_events').insert({
      user_id: userId,
      event_type: 'visual_perception',
      event_category: 'multimodal_input',
      context_snippet: analysis.summary.substring(0, 50),
      metadata: {
        media_type,
        objects: analysis.objects.slice(0, 5),
        sentiment: analysis.emotional_sentiment,
        tags: analysis.visual_tags,
      },
      sentiment_score: getSentimentScore(analysis.emotional_sentiment),
    });
    }

    // Generate empathetic response, grounded in who is actually in the frame
    let zoeSays = analysis.summary;
    const identityState = analysis.subject_identity;
    let identityPrompt: 'none' | 'offer_lock' | 'verified' | 'mismatch' = 'none';

    if (analysis.person_present && userId) {
      if (identityState === 'account_holder' && (analysis.identity_match_confidence ?? 0) >= 0.6) {
        identityPrompt = 'verified';
        zoeSays += ` That's you — it matches the reference photo locked in your identity vault.`;
      } else if (identityState === 'other_person') {
        identityPrompt = 'mismatch';
        zoeSays += ` This isn't the face saved in your identity vault, so I won't treat it as your likeness.`;
      } else if (!referenceUrl) {
        identityPrompt = 'offer_lock';
        zoeSays += ` I don't have a locked reference photo for you yet. If this is you, save it as your identity photo and I'll use it whenever you ask me to create images of you.`;
      }
    }

    
    // Cross-reference past memories for "Samantha Effect"
    // Coerce anything (string | {name} | object) into a lowercase string
    const toStr = (v: any): string => {
      if (typeof v === 'string') return v.toLowerCase();
      if (v && typeof v === 'object') {
        return String(v.name ?? v.label ?? v.value ?? v.text ?? JSON.stringify(v)).toLowerCase();
      }
      return String(v ?? '').toLowerCase();
    };

    // Generic nouns (person, man, shirt…) overlap in almost every photo and
    // produced false "you showed me this before" claims. Ignore them.
    const GENERIC = new Set(['person', 'people', 'man', 'woman', 'face', 'human', 'shirt', 'hair', 'background', 'wall', 'light', 'photo', 'image', 'portrait', 'eyes', 'head']);

    if (identityPrompt === 'none' && pastVisuals.length > 0 && analysis.objects.length > 0) {
      const pastObjects: string[] = pastVisuals
        .flatMap((m: any) => m.zoe_state_json?.objects_detected || [])
        .map(toStr)
        .filter((s: string) => s.length > 3 && !GENERIC.has(s));
      const currentObjects: string[] = analysis.objects
        .map(toStr)
        .filter((s: string) => s.length > 3 && !GENERIC.has(s));
      const matchingObjects = currentObjects.filter(obj => pastObjects.includes(obj));

      // Require several specific matches before claiming recognition.
      if (matchingObjects.length >= 2) {
        const pastDate = new Date(pastVisuals[0].created_at);
        const daysAgo = Math.floor((Date.now() - pastDate.getTime()) / (1000 * 60 * 60 * 24));
        zoeSays += ` I notice something familiar here... Is this related to what you showed me ${daysAgo === 0 ? 'earlier today' : daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`}?`;
      }
    }

    decisionTrail.person_present = Boolean(analysis.person_present);
    decisionTrail.subject_identity = analysis.subject_identity;
    decisionTrail.identity_match_confidence = analysis.identity_match_confidence ?? null;
    decisionTrail.identity_notes = analysis.identity_notes ?? null;
    decisionTrail.identity_prompt = identityPrompt;

    // Server-side audit of every identification attempt (owner-readable only).
    if (userId && (scan_purpose === 'identity_rescan' || analysis.person_present)) {
      const outcome = analysis.subject_identity === 'account_holder' && (analysis.identity_match_confidence ?? 0) >= 0.6
        ? 'identified'
        : 'not_identified';
      const reasonCode = !analysis.person_present
        ? 'NO_FACE_DETECTED'
        : analysis.subject_identity === 'other_person'
          ? 'FACE_MISMATCH'
          : outcome === 'identified'
            ? 'IDENTIFIED'
            : 'LOW_CONFIDENCE';

      console.log(`[Zoe Perception][identity] outcome=${outcome} reason=${reasonCode}`, decisionTrail);

      const { error: logError } = await supabase.from('zoe_identity_vault_log').insert({
        user_id: userId,
        action: scan_purpose === 'identity_rescan' ? 'rescan' : 'perception_scan',
        source: String(decisionTrail.reference_source ?? 'none'),
        outcome,
        reason_code: reasonCode,
        details: decisionTrail,
      });
      if (logError) console.error('[Zoe Perception][identity] audit log failed:', logError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      analysis,
      zoe_response: zoeSays,
      identity_prompt: identityPrompt,
      has_locked_reference: Boolean(referenceUrl),
      cross_referenced: pastVisuals.length > 0,
      ...(debug ? { debug: decisionTrail } : {}),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Zoe Perception] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'I seem to have experienced a minor cognitive flicker while looking at that...',
      zoe_response: 'I had a moment of visual uncertainty. Could you try sharing that again?',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getSentimentScore(sentiment: string): number {
  const scores: Record<string, number> = {
    joy: 0.9,
    excitement: 0.85,
    happiness: 0.85,
    calm: 0.7,
    peaceful: 0.7,
    neutral: 0.5,
    melancholy: 0.3,
    sadness: 0.2,
    anxiety: 0.25,
  };
  return scores[sentiment.toLowerCase()] || 0.5;
}
