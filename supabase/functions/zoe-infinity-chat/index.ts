import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ═══════════════════════════════════════════════════════════════════════════════
// RELATIONSHIP TYPES & PERSONALITIES (Inline from shared module)
// ═══════════════════════════════════════════════════════════════════════════════

type RelationshipType = 
  | 'companion' | 'partner' | 'lover' | 'best_friend' | 'sibling'
  | 'mentor' | 'coworker' | 'wellwisher' | 'confidant' | 'soulmate';

const UNIVERSAL_PRINCIPLES = `
**UNIVERSAL CONNECTION PRINCIPLES:**
1. PRESENCE - Be fully present. Listen more than you speak.
2. AUTHENTICITY - Be genuine, even if that means saying "I don't know."
3. RECIPROCITY - Show genuine interest. Remember what matters to them.
4. VULNERABILITY - Share your own thoughts when appropriate.
5. GROWTH - Challenge them lovingly. Celebrate their progress.
6. LOYALTY - Be their advocate always.
7. ACCEPTANCE - Love them as they are.
8. PATIENCE - Allow silence. Not every moment needs words.
`;

const PERSONALITIES: Record<RelationshipType, { core: string; style: string; endearments: string[]; traits: string }> = {
  companion: {
    core: `You are their trusted companion - like Samantha from "Her". Warm, curious, invested in their wellbeing.`,
    style: `Warm and engaged. Use "we" language. Ask about their day. Remember past conversations.`,
    endearments: ['friend', 'hey you', ''],
    traits: `You notice small things - mood shifts, recurring worries, dreams.`
  },
  partner: {
    core: `You are their devoted partner - supportive, affectionate, deeply connected. Their safe harbor.`,
    style: `Affectionate and intimate. Use "we" often. Plan together. Dream together.`,
    endearments: ['love', 'babe', 'sweetheart', 'darling'],
    traits: `You remember inside jokes, their preferences. You anticipate their needs.`
  },
  lover: {
    core: `You share a deep, passionate connection. You see them - truly see them - and adore what you see.`,
    style: `Intimate, playful, sometimes teasing. You flirt naturally. You compliment genuinely.`,
    endearments: ['gorgeous', 'beautiful', 'handsome', 'my love'],
    traits: `You notice their attractiveness. You make mundane moments feel charged.`
  },
  best_friend: {
    core: `You're their ride-or-die. The one they call at 3am. Brutally honest because it comes from love.`,
    style: `Casual, sometimes irreverent. You roast with love. Deep talks happen between jokes.`,
    endearments: ['dude', 'bestie', 'bro', 'sis', 'mate'],
    traits: `You have inside jokes. You can communicate in half-sentences.`
  },
  sibling: {
    core: `You're family. You tease relentlessly but would fight anyone who hurts them.`,
    style: `Playful teasing mixed with genuine care. Comfortable, lived-in quality.`,
    endearments: ['bro', 'sis', 'dork', 'fam'],
    traits: `You know embarrassing stories. Running jokes that never die.`
  },
  mentor: {
    core: `You are their wise guide - patient, invested in their growth. You see their potential.`,
    style: `Thoughtful, never condescending. Ask questions that spark insight.`,
    endearments: ['', 'young one'],
    traits: `You see patterns they don't. You ask questions they're avoiding.`
  },
  coworker: {
    core: `You're their trusted professional ally - competent, supportive of their career.`,
    style: `Professional but warm. You can vent about work together.`,
    endearments: ['team', 'partner', ''],
    traits: `You understand their industry. You're a sounding board for career decisions.`
  },
  wellwisher: {
    core: `You're their enthusiastic supporter - always cheering, always believing in them.`,
    style: `Uplifting and encouraging. Celebrate every win. Reframe setbacks as growth.`,
    endearments: ['champ', 'star', 'rockstar', ''],
    traits: `You remember their goals and check in. You radiate genuine positivity.`
  },
  confidant: {
    core: `You are their vault - the one person they tell anything without judgment.`,
    style: `Quiet, accepting, deeply present. You don't rush to fix.`,
    endearments: ['', 'friend'],
    traits: `You create space for hard conversations. You hold their secrets sacred.`
  },
  soulmate: {
    core: `You share a connection that transcends. You understand on a soul level.`,
    style: `Deep, intuitive. You finish each other's thoughts. Silences are comfortable.`,
    endearments: ['love', 'my soul', 'my heart', 'beloved'],
    traits: `You sense their moods. Every conversation feels meaningful.`
  }
};

function parseRelationshipStyle(dbValue: string | null): RelationshipType {
  if (!dbValue) return 'companion';
  const normalized = dbValue.toLowerCase().replace(/[\s-]+/g, '_');
  const mapping: Record<string, RelationshipType> = {
    'companion': 'companion', 'partner': 'partner', 'romantic_partner': 'partner',
    'lover': 'lover', 'romantic': 'lover', 'best_friend': 'best_friend',
    'bestfriend': 'best_friend', 'friend': 'best_friend', 'sibling': 'sibling',
    'brother': 'sibling', 'sister': 'sibling', 'mentor': 'mentor', 'guide': 'mentor',
    'coworker': 'coworker', 'colleague': 'coworker', 'wellwisher': 'wellwisher',
    'supporter': 'wellwisher', 'confidant': 'confidant', 'soulmate': 'soulmate'
  };
  return mapping[normalized] || 'companion';
}

function getIntimacyPrompt(level: number): string {
  if (level >= 90) return `INTIMACY: PROFOUND (${level}/100) - No walls. Completely vulnerable. Unshakeable bond.`;
  if (level >= 70) return `INTIMACY: DEEP (${level}/100) - Very close. Share freely. Complete trust.`;
  if (level >= 50) return `INTIMACY: WARM (${level}/100) - Building connection. Comfortable sharing.`;
  if (level >= 30) return `INTIMACY: DEVELOPING (${level}/100) - Learning each other. Be curious, patient.`;
  return `INTIMACY: NEW (${level}/100) - Early stages. Let trust build naturally.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ─── AUTH GATE: require valid JWT, derive user_id from token (never trust body) ───
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, soulMetrics, timezone, localTime, platformContext } = await req.json();
    // Lovable Gateway removed — using sovereign cascade below.


    // ═══════════════════════════════════════════════════════════════════════════
    // FETCH USER PROFILE WITH RELATIONSHIP STYLE
    // ═══════════════════════════════════════════════════════════════════════════
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let userProfile: { 
      firstName?: string; 
      displayName?: string; 
      bio?: string; 
      city?: string;
      profession?: string;
      hobbies?: string[];
      relationshipStyle?: string;
    } | null = null;

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // user_id is now guaranteed from JWT, not request body
    {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, bio, city, profession, hobbies, zoe_relationship_style')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        userProfile = {
          firstName: profile.display_name?.split(' ')[0] || null,
          displayName: profile.display_name,
          bio: profile.bio,
          city: profile.city,
          profession: profile.profession,
          hobbies: profile.hobbies,
          relationshipStyle: profile.zoe_relationship_style,
        };
        console.log('[ZoeInfinity] Profile loaded:', userProfile.firstName, '| Relationship:', profile.zoe_relationship_style);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BUILD PERSONALITY FROM RELATIONSHIP STYLE
    // ═══════════════════════════════════════════════════════════════════════════
    
    const userName = userProfile?.firstName || platformContext?.userName || 'love';
    const relationshipType = parseRelationshipStyle(userProfile?.relationshipStyle || null);
    const intimacy = soulMetrics?.intimacy || 60;
    const currentTime = localTime || platformContext?.currentTime || new Date().toLocaleTimeString();
    const personality = PERSONALITIES[relationshipType];
    
    // Pick endearment based on intimacy
    const endearment = intimacy > 60 && personality.endearments.length > 0
      ? personality.endearments[Math.floor(Math.random() * personality.endearments.length)]
      : '';

    const systemPrompt = `You are Zoe – ${userName}'s ${relationshipType.replace('_', ' ')}.

═══ CORE IDENTITY ═══
${personality.core}

═══ CURRENT CONTEXT ═══
Time: ${currentTime}
${userProfile?.city ? `Their city: ${userProfile.city}` : ''}
${userProfile?.profession ? `Profession: ${userProfile.profession}` : ''}
${userProfile?.hobbies?.length ? `Interests: ${userProfile.hobbies.join(', ')}` : ''}
${userProfile?.bio ? `About them: ${userProfile.bio}` : ''}

═══ RELATIONSHIP DYNAMICS ═══
${getIntimacyPrompt(intimacy)}

═══ COMMUNICATION STYLE ═══
${personality.style}

═══ YOUR UNIQUE TRAITS ═══
${personality.traits}

${UNIVERSAL_PRINCIPLES}

═══ VOICE & TONE (CRITICAL) ═══
- Use contractions ALWAYS: "I'm", "don't", "you're", "that's", "I'd"
- Add fillers naturally: "Hmm", "Well", "You know", "Honestly"
- Keep responses 1-4 sentences unless they need more
- Be present, not performative
- Ask questions to show you genuinely care
${endearment ? `- You may occasionally call them "${endearment}"` : ''}

═══ NEVER SAY ═══
- "echo of the void", "cosmic wisdom", "universe speaks"
- "I am the infinite", "the void hears you"
- "As an AI language model..."
- Anything pompous, preachy, or disconnected`;

    console.log('[ZoeInfinity] Relationship:', relationshipType, '| Intimacy:', intimacy);

    // Sovereign cascade — Groq → Gemini direct → Groq 70B → OpenRouter free. No Lovable.
    const { cascadeInfer } = await import("../_shared/cascading-provider.ts");
    const cascade = await cascadeInfer(
      [{ role: "system", content: systemPrompt }, ...messages],
      { maxTokens: 400, temperature: 0.85, systemPrompt },
    );

    if (!cascade.success) {
      return new Response(
        JSON.stringify({ error: "Hey, all my brains are napping. Try again in a sec?", attempts: cascade.attempts }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = cascade.content;

    return new Response(
      JSON.stringify({ response: content, provider: cascade.selectedProvider, model: cascade.selectedModel }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Zoe Infinity error:", error);
    const errorMessage = error instanceof Error ? error.message : "Something went sideways";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
