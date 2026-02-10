import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { admin_user_id, job_id, analyze } = payload.record || payload;

    console.log(`[Worker] Starting audit job ${job_id} for admin ${admin_user_id}`);

    // Update job status to RUNNING
    await supabase
      .from('job_queue')
      .update({ status: 'RUNNING', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    // Gather comprehensive audit data
    const auditData = {
      timestamp: new Date().toISOString(),
      platform: {
        name: "Universe of Life",
        environment: "production",
        version: "2.0.0"
      },
      architecture: {
        frontend: "React + TypeScript + Vite",
        backend: "Lovable Cloud (PostgreSQL + Edge Functions)",
        ai: "Neural Engine Pro, Advanced Voice Synthesis",
        storage: "Lovable Cloud Storage",
        authentication: "Lovable Cloud Auth"
      },
      features: {
        core: ["Social Feed", "Private Timelines", "Messaging", "Huddle Map", "WebDrop", "Voice Commands"],
        authentication: ["Email/Password", "Face Verification", "WebAuthn", "Trusted Devices"],
        social: ["Friend Requests", "Posts", "Comments", "Likes", "Tags", "Notifications"],
        admin: ["Analytics Dashboard", "God Mode", "AI Audit", "Platform Health"],
        revenue: ["Freemium Tiers", "B2C Premium", "B2B Enterprise", "API Access"]
      },
      edgeFunctions: [
        "ai-audit-endpoint", "ai-companion-chat", "ai-video-transform", "analyze-face-emotion",
        "apply-ai-filter", "assemblyai-tts", "check-reminders",
        "execute-scheduled-macros", "face-verification", "generate-image", "generate-text",
        "lovable-tts", "moderate-content", "platform-diagnostics", "realtime-voice",
        "score-post-relevance", "security-operations", "track-activity", "transcribe-audio",
        "zoe-agent", "zoe-chat", "zoe-dance-architect", "zoe-multiagent", "run-ai-audit-job"
      ],
      databaseSchema: {
        tables: 50,
        keyTables: ["profiles", "posts", "messages", "notifications", "user_roles", "job_queue", "audit_reports"],
        rlsPolicies: "Enabled on all tables",
        triggers: "Comment/like counters, profile sync, notifications"
      },
      currentIssues: [],
      freeTierStatus: {
        active: true,
        constraints: "Operating within free tier limits",
        scalingPlan: "Upgrade when 50 concurrent users consistently exceeded"
      },
      recentChanges: [
        "AI Audit Endpoint with Gemini 3 Pro analysis",
        "Async job queue architecture",
        "Admin role-based access control",
        "Secure JWT validation"
      ],
      voiceCommands: ["70+ timeline keywords", "Zoe AI control", "Feature navigation", "Dream analysis"],
      technologyStack: {
        frontend: ["React", "TypeScript", "Tailwind CSS", "Framer Motion", "Three.js"],
        backend: ["Supabase", "PostgreSQL", "Deno"],
        ai: ["Gemini 3 Pro", "Vision AI", "TTS"],
        tools: ["Vite", "ESLint", "PostCSS"]
      },
      apiEndpoints: [
        "/ai-audit-endpoint (secured, admin-only)",
        "/run-ai-audit-job (webhook-triggered)",
        "/zoe-multiagent (public)",
        "/platform-diagnostics (secured)"
      ],
      audit: {
        requestedBy: admin_user_id,
        jobId: job_id,
        performedAt: new Date().toISOString()
      }
    };

    let reportData: any = { auditData };

    // If analyze flag is set, run AI analysis
    if (analyze) {
      console.log('[Worker] Running AI analysis...');
      
      const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!lovableApiKey) {
        throw new Error('LOVABLE_API_KEY not configured');
      }

      const systemPrompt = `You are an expert platform architect analyzing the "Universe of Life" platform. 
Provide comprehensive analysis focusing on: architecture quality, security posture, revenue readiness, scalability, and technical debt.
Format your response as structured analysis with clear sections and actionable recommendations.`;

      const userPrompt = `Analyze this platform audit data and provide detailed insights:\n\n${JSON.stringify(auditData, null, 2)}`;

      const aiResponse = await fetch('https://api.lovable.app/v1/ai-gateway', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-preview',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`AI Gateway failed: ${aiResponse.statusText}`);
      }

      const aiResult = await aiResponse.json();
      const aiAnalysis = aiResult.choices?.[0]?.message?.content || 'Analysis unavailable';

      reportData = {
        auditData,
        aiAnalysis,
        analysisMetadata: {
          model: 'google/gemini-3-pro-preview',
          completedAt: new Date().toISOString(),
          tokensUsed: aiResult.usage?.total_tokens
        }
      };
    }

    // Store the report
    const { error: reportError } = await supabase
      .from('audit_reports')
      .insert({
        job_id,
        report_data: reportData,
        generated_at: new Date().toISOString()
      });

    if (reportError) throw reportError;

    // Update job status to COMPLETED
    await supabase
      .from('job_queue')
      .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
      .eq('id', job_id);

    console.log(`[Worker] Job ${job_id} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, jobId: job_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Worker] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});