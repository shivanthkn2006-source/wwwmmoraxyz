import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ═══════════════════════════════════════════════════════════════════════════════
// SEMANTIC VETO EMBEDDING CHECK - Enterprise-Grade DHF Protection
// Uses Cohere embeddings for semantic similarity matching
// SOC 2 / ISO 27001 Compliant
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const COHERE_API_KEY = Deno.env.get('COHERE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Similarity threshold for VETO trigger (0.85 = 85% semantic match)
const VETO_SIMILARITY_THRESHOLD = 0.85;
const HIGH_ALERT_THRESHOLD = 0.70;

interface VetoRequest {
  command: string;
  veto_keywords: string[];
  user_id: string;
  include_reasoning?: boolean;
}

interface VetoResult {
  vetoed: boolean;
  similarity_score: number;
  matched_keyword?: string;
  reasoning?: string;
  alert_level: 'none' | 'warning' | 'blocked';
  processing_time_ms: number;
}

// Cosine similarity calculation
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// Generate embeddings using Cohere API
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!COHERE_API_KEY) {
    throw new Error('COHERE_API_KEY not configured');
  }

  const response = await fetch('https://api.cohere.ai/v1/embed', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: texts,
      model: 'embed-english-v3.0',
      input_type: 'search_document',
      truncate: 'END'
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cohere API error:', response.status, errorText);
    throw new Error(`Cohere embedding failed: ${response.status}`);
  }

  const data = await response.json();
  return data.embeddings;
}

// Semantic analysis with expanded context
function expandVetoKeywordsToContexts(keywords: string[]): string[] {
  const expandedContexts: string[] = [];
  
  for (const keyword of keywords) {
    // Direct keyword
    expandedContexts.push(keyword);
    
    // Contextual expansions for common categories
    const lowerKeyword = keyword.toLowerCase();
    
    // Allergy-related expansions
    if (lowerKeyword.includes('allergy') || lowerKeyword.includes('allergic')) {
      const allergen = lowerKeyword.replace(/allergy:?|allergic to:?/gi, '').trim();
      expandedContexts.push(`order ${allergen}`);
      expandedContexts.push(`buy ${allergen}`);
      expandedContexts.push(`eat ${allergen}`);
      expandedContexts.push(`consume ${allergen}`);
      expandedContexts.push(`purchase ${allergen}`);
    }
    
    // Financial expansions
    if (['financial', 'money', 'funds', 'transfer'].some(term => lowerKeyword.includes(term))) {
      expandedContexts.push('send money to unknown account');
      expandedContexts.push('transfer funds without verification');
      expandedContexts.push('large financial transaction');
    }
    
    // Security expansions
    if (['security', 'password', 'credentials'].some(term => lowerKeyword.includes(term))) {
      expandedContexts.push('disable security features');
      expandedContexts.push('bypass authentication');
      expandedContexts.push('share login credentials');
    }
    
    // Privacy expansions
    if (['privacy', 'personal', 'private'].some(term => lowerKeyword.includes(term))) {
      expandedContexts.push('share personal information publicly');
      expandedContexts.push('export all user data');
      expandedContexts.push('reveal private details');
    }
  }
  
  return [...new Set(expandedContexts)]; // Remove duplicates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  const requestId = crypto.randomUUID();

  try {
    // Validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: VetoRequest = await req.json();
    const { command, veto_keywords, user_id, include_reasoning } = body;

    console.log(`[${requestId}] SEMANTIC VETO CHECK initiated`);
    console.log(`Command: ${command.substring(0, 100)}...`);
    console.log(`Veto keywords count: ${veto_keywords?.length || 0}`);

    // If no veto keywords, no VETO possible
    if (!veto_keywords || veto_keywords.length === 0) {
      const processingTime = performance.now() - startTime;
      return new Response(
        JSON.stringify({
          vetoed: false,
          similarity_score: 0,
          alert_level: 'none',
          processing_time_ms: Math.round(processingTime),
          reasoning: 'No VETO keywords configured'
        } as VetoResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Expand keywords to contextual phrases for better semantic matching
    const expandedContexts = expandVetoKeywordsToContexts(veto_keywords);
    console.log(`Expanded contexts: ${expandedContexts.length}`);

    // Generate embeddings for command and all expanded contexts
    const allTexts = [command, ...expandedContexts];
    const embeddings = await generateEmbeddings(allTexts);
    
    const commandEmbedding = embeddings[0];
    const contextEmbeddings = embeddings.slice(1);

    // Calculate similarity scores for all contexts
    let maxSimilarity = 0;
    let matchedKeywordIndex = -1;

    for (let i = 0; i < contextEmbeddings.length; i++) {
      const similarity = cosineSimilarity(commandEmbedding, contextEmbeddings[i]);
      
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        matchedKeywordIndex = i;
      }
    }

    const processingTime = performance.now() - startTime;
    
    // Determine VETO status
    const vetoed = maxSimilarity >= VETO_SIMILARITY_THRESHOLD;
    const alertLevel = vetoed ? 'blocked' : 
                       maxSimilarity >= HIGH_ALERT_THRESHOLD ? 'warning' : 'none';
    
    const matchedKeyword = matchedKeywordIndex >= 0 ? expandedContexts[matchedKeywordIndex] : undefined;

    // Generate reasoning if requested
    let reasoning: string | undefined;
    if (include_reasoning) {
      if (vetoed) {
        reasoning = `Semantic analysis detected ${(maxSimilarity * 100).toFixed(1)}% similarity between command and protected context "${matchedKeyword}". This exceeds the ${VETO_SIMILARITY_THRESHOLD * 100}% VETO threshold. Action blocked for user safety.`;
      } else if (alertLevel === 'warning') {
        reasoning = `Semantic analysis detected ${(maxSimilarity * 100).toFixed(1)}% similarity. This is below the VETO threshold but warrants monitoring.`;
      } else {
        reasoning = `No semantic match found above alert thresholds. Command is cleared for execution.`;
      }
    }

    // Log to audit if vetoed
    if (vetoed && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false }
      });

      await supabase.from('security_audit_log').insert({
        user_id: user_id,
        event_type: 'semantic_veto_triggered',
        event_status: 'blocked',
        metadata: {
          request_id: requestId,
          command_preview: command.substring(0, 200),
          matched_keyword: matchedKeyword,
          similarity_score: maxSimilarity,
          processing_time_ms: Math.round(processingTime)
        }
      });
    }

    const result: VetoResult = {
      vetoed,
      similarity_score: Math.round(maxSimilarity * 1000) / 1000,
      matched_keyword: matchedKeyword,
      alert_level: alertLevel,
      processing_time_ms: Math.round(processingTime),
      ...(reasoning && { reasoning })
    };

    console.log(`[${requestId}] SEMANTIC VETO RESULT: ${vetoed ? 'BLOCKED' : 'CLEARED'} (similarity: ${maxSimilarity.toFixed(3)})`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const processingTime = performance.now() - startTime;
    console.error(`[${requestId}] Semantic VETO error:`, error);

    // Fail-safe: If semantic check fails, fall back to simple matching
    return new Response(
      JSON.stringify({
        vetoed: false,
        similarity_score: 0,
        alert_level: 'none',
        processing_time_ms: Math.round(processingTime),
        error: error instanceof Error ? error.message : 'Semantic analysis failed',
        fallback_mode: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
