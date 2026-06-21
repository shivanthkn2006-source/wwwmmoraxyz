import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

const scoringSchema = z.object({
  userId: z.string().uuid({ message: 'Invalid user ID format' }),
  posts: z.array(z.object({
    id: z.string().uuid(),
    content: z.string().optional(),
    media_type: z.string().optional()
  })).max(100, { message: 'Too many posts to score at once' })
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { posts, userId } = scoringSchema.parse(body);
    
    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ scoredPosts: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const COHERE_API_KEY = Deno.env.get("COHERE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!COHERE_API_KEY) {
      console.error('COHERE_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          scoredPosts: posts.map((p: any) => ({ ...p, relevance_score: 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's interests
    const { data: profile } = await supabase
      .from('profiles')
      .select('hobbies')
      .eq('user_id', userId)
      .single();

    const userInterests = profile?.hobbies || [];
    
    if (userInterests.length === 0) {
      // No interests, return posts in original order with neutral scores
      return new Response(
        JSON.stringify({ 
          scoredPosts: posts.map((p: any) => ({ ...p, relevance_score: 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create embedding for user interests (concatenated)
    const userInterestText = userInterests.join(", ");
    const userEmbedResponse = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: [userInterestText],
        input_type: "search_query"
      }),
    });

    if (!userEmbedResponse.ok) {
      console.error('Cohere embedding error for user interests');
      return new Response(
        JSON.stringify({ 
          scoredPosts: posts.map((p: any) => ({ ...p, relevance_score: 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userEmbedData = await userEmbedResponse.json();
    const userEmbedding = userEmbedData.embeddings[0];

    // Create embeddings for post contents (batch for efficiency)
    const postTexts = posts.map((p: any) => {
      let text = p.content || "";
      if (p.media_type === 'image') {
        text += " [image post]";
      }
      return text || "empty post";
    });

    const postEmbedResponse = await fetch("https://api.cohere.ai/v1/embed", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COHERE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "embed-english-v3.0",
        texts: postTexts,
        input_type: "search_document"
      }),
    });

    if (!postEmbedResponse.ok) {
      console.error('Cohere embedding error for posts');
      return new Response(
        JSON.stringify({ 
          scoredPosts: posts.map((p: any) => ({ ...p, relevance_score: 0 }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const postEmbedData = await postEmbedResponse.json();
    const postEmbeddings = postEmbedData.embeddings;

    // Calculate cosine similarity for each post
    const scoredPosts = posts.map((post: any, index: number) => {
      const postEmbedding = postEmbeddings[index];
      const similarity = cosineSimilarity(userEmbedding, postEmbedding);
      // Convert similarity (-1 to 1) to score (0 to 100)
      const score = Math.round((similarity + 1) * 50);
      return { ...post, relevance_score: score };
    });

    // Sort by relevance score (highest first)
    scoredPosts.sort((a: any, b: any) => b.relevance_score - a.relevance_score);

    return new Response(
      JSON.stringify({ scoredPosts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Scoring error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
