// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DOCUMENT X-RAY - Edge Function
// Phase 2: The Analysis Gap - Parse PDFs, images, and documents
// ═══════════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DocumentAnalysis {
  extractedText: string;
  summary: string;
  keyPoints: string[];
  documentType: string;
  pageCount?: number;
  wordCount: number;
  language: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const analysisType = formData.get("analysisType") as string || "full"; // full, summary, extract

    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`[zoe-document-xray] Processing: ${file.name} (${file.size} bytes, ${file.type})`);

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 1: Extract text content based on file type
    // ═══════════════════════════════════════════════════════════════════════════

    let extractedText = "";
    let documentType = "unknown";

    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    // For text-based files, read directly
    if (fileType.includes("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md") || fileName.endsWith(".csv")) {
      extractedText = await file.text();
      documentType = "text";
      console.log(`[zoe-document-xray] Text file extracted: ${extractedText.length} chars`);
    }
    // For PDFs and images, use Gemini's vision capabilities
    else if (fileType.includes("pdf") || fileType.includes("image/")) {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      const mimeType = fileType.includes("pdf") ? "application/pdf" : fileType;
      documentType = fileType.includes("pdf") ? "pdf" : "image";

      console.log(`[zoe-document-xray] Using Gemini Vision for ${documentType}`);

      // Use Gemini Pro Vision for OCR/document understanding
      const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash", // Flash supports vision
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `You are a document analysis AI. Extract ALL text content from this ${documentType}. 
                  
Output the complete text exactly as it appears in the document, preserving structure where possible.
If it's an image with text, perform OCR and extract all visible text.
If it's a PDF, extract all text content from all visible pages.

After the extracted text, add a separator "---ANALYSIS---" and provide:
1. Document type (contract, report, article, invoice, etc.)
2. Main language detected
3. Approximate word count

Format:
[EXTRACTED TEXT HERE]
---ANALYSIS---
Type: [type]
Language: [language]
Words: [count]`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`
                  }
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
      });

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error("[zoe-document-xray] Vision API error:", errorText);
        throw new Error(`Vision API error: ${visionResponse.status}`);
      }

      const visionData = await visionResponse.json();
      const fullResponse = visionData.choices?.[0]?.message?.content || "";
      
      // Parse the response
      const parts = fullResponse.split("---ANALYSIS---");
      extractedText = parts[0]?.trim() || "";
      
      console.log(`[zoe-document-xray] Vision extracted: ${extractedText.length} chars`);
    }
    // For other file types, try to read as text
    else {
      try {
        extractedText = await file.text();
        documentType = "binary-as-text";
      } catch {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
    }

    if (!extractedText || extractedText.length < 10) {
      return new Response(
        JSON.stringify({ 
          error: "Could not extract text from document",
          hint: "The document may be empty, image-only without readable text, or in an unsupported format."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 2: Generate summary and key points using AI
    // ═══════════════════════════════════════════════════════════════════════════

    const wordCount = extractedText.split(/\s+/).length;
    let summary = "";
    let keyPoints: string[] = [];

    if (analysisType === "full" || analysisType === "summary") {
      console.log(`[zoe-document-xray] Generating summary for ${wordCount} words`);

      const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite", // Fast and cheap for summarization
          messages: [
            {
              role: "system",
              content: `You are a document analyst. Summarize documents concisely and extract key points.
              
Output ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary of the document",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "documentType": "contract|report|article|invoice|letter|legal|technical|other",
  "language": "detected language"
}`
            },
            {
              role: "user",
              content: `Analyze this document and provide a summary:\n\n${extractedText.substring(0, 8000)}${extractedText.length > 8000 ? "\n\n[Document truncated for analysis...]" : ""}`
            }
          ],
          max_tokens: 500,
          temperature: 0.2,
        }),
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        const content = summaryData.choices?.[0]?.message?.content || "{}";
        
        try {
          const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const parsed = JSON.parse(cleanedContent);
          summary = parsed.summary || "";
          keyPoints = parsed.keyPoints || [];
          documentType = parsed.documentType || documentType;
        } catch {
          console.error("[zoe-document-xray] Failed to parse summary JSON");
          summary = "Document processed but summary generation failed.";
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STEP 3: Store document context for RAG (optional, if userId provided)
    // ═══════════════════════════════════════════════════════════════════════════

    let documentId: string | null = null;

    if (userId) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Store document context in sovereign memory for future reference
        const { data: memoryData, error: memoryError } = await supabase
          .from("zoe_sovereign_memory")
          .insert({
            user_id: userId,
            event_type: "document_upload",
            content_text: extractedText.substring(0, 50000), // Limit storage
            zoe_state_json: {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              documentType,
              summary,
              keyPoints,
              wordCount,
              uploadedAt: new Date().toISOString(),
            }
          })
          .select("id")
          .single();

        if (!memoryError && memoryData) {
          documentId = memoryData.id;
          console.log(`[zoe-document-xray] Document stored in memory: ${documentId}`);
        }
      } catch (storageError) {
        console.error("[zoe-document-xray] Storage error (non-fatal):", storageError);
      }
    }

    const latencyMs = Math.round(performance.now() - startTime);
    console.log(`[zoe-document-xray] ✓ Complete in ${latencyMs}ms | ${wordCount} words | ${keyPoints.length} key points`);

    const analysis: DocumentAnalysis = {
      extractedText,
      summary,
      keyPoints,
      documentType,
      wordCount,
      language: "en", // Could be detected
    };

    return new Response(
      JSON.stringify({
        success: true,
        analysis,
        documentId,
        latencyMs,
        fileName: file.name,
        fileSize: file.size,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    console.error(`[zoe-document-xray] Error after ${latencyMs}ms:`, error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error processing document";

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
