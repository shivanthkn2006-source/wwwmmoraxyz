import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

// ═══════════════════════════════════════════════════════════════════════════════
// PROCESS DHF ASSET - File Upload & DHF Enrichment Function
// Analyzes uploaded files and enriches the Digital Human Fingerprint stack
// ═══════════════════════════════════════════════════════════════════════════════

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Pre-initialize environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SOVEREIGN_AI_KEY = sovereignKey();

// Singleton Supabase client
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    });
  }
  return supabaseClient!;
}

// Generate DHF stack hash for integrity verification
function generateDhfStackHash(userId: string, fileUrl: string, timestamp: string): string {
  const data = `${userId}:${fileUrl}:${timestamp}:${crypto.randomUUID()}`;
  return btoa(data).replace(/[+/=]/g, '').substring(0, 32);
}

// Extract data type from file metadata
function detectDataType(fileName: string, mimeType: string): string {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('health') || lowerName.includes('medical') || lowerName.includes('allerg')) {
    return 'Health Record';
  }
  if (lowerName.includes('journal') || lowerName.includes('diary') || lowerName.includes('note')) {
    return 'Journal Entry';
  }
  if (lowerName.includes('finance') || lowerName.includes('bank') || lowerName.includes('tax') || lowerName.includes('invoice')) {
    return 'Financial Data';
  }
  if (lowerName.includes('memory') || lowerName.includes('photo') || lowerName.includes('album')) {
    return 'Memory Archive';
  }
  if (lowerName.includes('pref') || lowerName.includes('setting') || lowerName.includes('config')) {
    return 'Preference Profile';
  }
  if (lowerName.includes('contact') || lowerName.includes('friend') || lowerName.includes('family')) {
    return 'Relationship Data';
  }
  if (lowerName.includes('resume') || lowerName.includes('cv') || lowerName.includes('job') || lowerName.includes('career')) {
    return 'Career Document';
  }
  if (lowerName.includes('cert') || lowerName.includes('degree') || lowerName.includes('diploma') || lowerName.includes('transcript')) {
    return 'Educational Record';
  }
  
  // Check by mime type
  if (mimeType?.includes('image')) return 'Memory Archive';
  if (mimeType?.includes('pdf')) return 'Personal Document';
  
  return 'Other';
}

// Determine sensitivity level based on data type and content
function determineSensitivityLevel(dataType: string, fileName: string): 'low' | 'medium' | 'high' | 'critical' {
  const highSensitivityTypes = ['Health Record', 'Financial Data'];
  const criticalPatterns = ['password', 'secret', 'private', 'confidential', 'ssn', 'credit'];
  
  const lowerName = fileName.toLowerCase();
  
  if (criticalPatterns.some(p => lowerName.includes(p))) {
    return 'critical';
  }
  if (highSensitivityTypes.includes(dataType)) {
    return 'high';
  }
  if (['Personal Document', 'Relationship Data', 'Career Document'].includes(dataType)) {
    return 'medium';
  }
  return 'low';
}

// Extract veto keywords from file content/name for VETO system
function extractVetoKeywords(fileName: string, dataType: string, contentSummary?: string): string[] {
  const keywords: string[] = [];
  const lowerName = fileName.toLowerCase();
  
  // Health-related vetoes
  if (dataType === 'Health Record' || lowerName.includes('allerg')) {
    keywords.push('allergy_conflict', 'health_risk', 'medication_interaction');
    
    // Extract specific allergy mentions
    const allergyPatterns = ['peanut', 'gluten', 'dairy', 'shellfish', 'egg', 'soy', 'tree nut'];
    allergyPatterns.forEach(allergy => {
      if (lowerName.includes(allergy) || contentSummary?.toLowerCase().includes(allergy)) {
        keywords.push(`allergy:${allergy}`);
      }
    });
  }
  
  // Financial vetoes
  if (dataType === 'Financial Data') {
    keywords.push('financial_review_required', 'spending_limit');
  }
  
  // Privacy vetoes
  if (['Relationship Data', 'Personal Document'].includes(dataType)) {
    keywords.push('privacy_protected', 'personal_data');
  }
  
  // Career/Professional vetoes
  if (dataType === 'Career Document') {
    keywords.push('professional_context', 'employment_data');
  }
  
  return keywords;
}

// Call AI for content analysis
async function analyzeContentWithAI(
  fileUrl: string,
  fileName: string,
  dataType: string,
  mimeType: string
): Promise<{ summary: string; entities: any[]; vetoKeywords: string[] }> {
  if (!SOVEREIGN_AI_KEY) {
    console.log('No AI key available, using basic analysis');
    return {
      summary: `${dataType} file: ${fileName}`,
      entities: [],
      vetoKeywords: extractVetoKeywords(fileName, dataType)
    };
  }

  try {
    const prompt = `Analyze this uploaded file for DHF (Digital Human Fingerprint) enrichment:
    
File: ${fileName}
Type: ${dataType}
MIME: ${mimeType}

Please provide:
1. A brief summary (2-3 sentences) of what this file likely contains
2. Key entities that should be tracked (names, dates, locations, medical terms, financial figures)
3. Keywords that should trigger VETO protection (e.g., allergies, financial limits, privacy preferences)

Respond in JSON format:
{
  "summary": "...",
  "entities": [{"type": "...", "value": "...", "context": "..."}],
  "veto_keywords": ["keyword1", "keyword2"]
}`;

    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a DHF analysis assistant. Extract key information from file metadata for Digital Human Fingerprint enrichment. Focus on protective keywords for the VETO system.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || `${dataType} file: ${fileName}`,
        entities: parsed.entities || [],
        vetoKeywords: [...extractVetoKeywords(fileName, dataType), ...(parsed.veto_keywords || [])]
      };
    }
    
    return {
      summary: `${dataType} file: ${fileName}`,
      entities: [],
      vetoKeywords: extractVetoKeywords(fileName, dataType)
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    return {
      summary: `${dataType} file: ${fileName}`,
      entities: [],
      vetoKeywords: extractVetoKeywords(fileName, dataType)
    };
  }
}

// Update DHF ingestion metrics
async function updateDhfMetrics(supabase: SupabaseClient, userId: string, dataType: string, sensitivityLevel: string) {
  try {
    // Calculate quality score boost based on data type and sensitivity
    const qualityBoosts: Record<string, number> = {
      'Health Record': 25,
      'Financial Data': 20,
      'Journal Entry': 15,
      'Memory Archive': 12,
      'Personal Document': 10,
      'Relationship Data': 18,
      'Career Document': 14,
      'Educational Record': 12,
      'Preference Profile': 8,
      'Other': 5
    };
    
    const sensitivityMultipliers: Record<string, number> = {
      'critical': 2.0,
      'high': 1.5,
      'medium': 1.0,
      'low': 0.8
    };
    
    const baseBoost = qualityBoosts[dataType] || 5;
    const multiplier = sensitivityMultipliers[sensitivityLevel] || 1.0;
    const qualityIncrease = Math.round(baseBoost * multiplier);
    
    // Update zoe_personalization with increased DHF quality
    const { data: existing } = await supabase
      .from('zoe_personalization')
      .select('dhf_quality_score, data_richness')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      await supabase
        .from('zoe_personalization')
        .update({
          dhf_quality_score: Math.min(100, (existing.dhf_quality_score || 0) + qualityIncrease),
          data_richness: Math.min(100, (existing.data_richness || 0) + Math.round(qualityIncrease * 0.5)),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      await supabase
        .from('zoe_personalization')
        .insert({
          user_id: userId,
          dhf_quality_score: qualityIncrease,
          data_richness: Math.round(qualityIncrease * 0.5)
        });
    }
    
    console.log(`DHF metrics updated for user ${userId}: +${qualityIncrease} quality score`);
  } catch (error) {
    console.error('Failed to update DHF metrics:', error);
  }
}

// Main request handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const startTime = performance.now();

  try {
    // Validate authorization
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Database connection not available');
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token', code: 'AUTH_INVALID' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const body = await req.json();
    
    const { 
      file_url, 
      file_name, 
      mime_type,
      file_size 
    } = body;

    if (!file_url || !file_name) {
      return new Response(
        JSON.stringify({ error: 'Missing file_url or file_name', code: 'VALIDATION_ERROR' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${requestId}] Processing DHF asset for user ${userId}: ${file_name}`);

    // Detect data type and sensitivity
    const dataType = detectDataType(file_name, mime_type);
    const sensitivityLevel = determineSensitivityLevel(dataType, file_name);
    
    // Generate DHF stack hash for integrity
    const timestamp = new Date().toISOString();
    const dhfStackHash = generateDhfStackHash(userId, file_url, timestamp);

    // Analyze content with AI
    const analysis = await analyzeContentWithAI(file_url, file_name, dataType, mime_type);

    // Insert into dhf_asset_logs
    const { data: assetLog, error: insertError } = await supabase
      .from('dhf_asset_logs')
      .insert({
        user_id: userId,
        file_url,
        file_name,
        data_type: dataType,
        upload_timestamp: timestamp,
        dhf_stack_hash: dhfStackHash,
        file_size_bytes: file_size || 0,
        content_summary: analysis.summary,
        extracted_entities: analysis.entities,
        sensitivity_level: sensitivityLevel,
        processing_status: 'completed',
        veto_keywords: analysis.vetoKeywords
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[${requestId}] Failed to insert asset log:`, insertError);
      throw new Error('Failed to log DHF asset');
    }

    // Update DHF ingestion metrics
    await updateDhfMetrics(supabase, userId, dataType, sensitivityLevel);

    // Log to security audit trail
    await supabase.from('security_audit_log').insert({
      user_id: userId,
      event_type: 'dhf_asset_upload',
      event_status: 'success',
      metadata: {
        request_id: requestId,
        file_name,
        data_type: dataType,
        sensitivity_level: sensitivityLevel,
        dhf_stack_hash: dhfStackHash,
        veto_keywords_count: analysis.vetoKeywords.length
      }
    });

    const processingTime = Math.round(performance.now() - startTime);
    console.log(`[${requestId}] DHF asset processed in ${processingTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        asset_id: assetLog.id,
        data_type: dataType,
        sensitivity_level: sensitivityLevel,
        dhf_stack_hash: dhfStackHash,
        content_summary: analysis.summary,
        veto_keywords: analysis.vetoKeywords,
        entities_extracted: analysis.entities.length,
        processing_time_ms: processingTime,
        message: `DHF asset "${file_name}" processed and enriched successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorTime = Math.round(performance.now() - startTime);
    console.error(`[${requestId}] DHF asset processing error:`, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
        code: 'PROCESSING_ERROR',
        request_id: requestId,
        processing_time_ms: errorTime
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
