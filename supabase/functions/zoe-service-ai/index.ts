import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { sovereignFetch, sovereignKey } from "../_shared/sovereign-ai.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(10000).trim(),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(50),
  businessName: z.string().optional(),
  businessContext: z.string().optional(),
  industryType: z.string().optional(),
});

// Comprehensive platform knowledge base
const PLATFORM_KNOWLEDGE = `
# UNIVERSE OF LIFE PLATFORM - COMPLETE KNOWLEDGE BASE

## PLATFORM OVERVIEW
Universe of Life is a next-generation social platform combining AI companions, immersive experiences, and professional tools. It serves both individual users and businesses seeking advanced AI-powered customer engagement.

## CORE FEATURES

### 1. ZOE AI ECOSYSTEM
- **Zoe Personal AI**: Your intelligent companion that learns your patterns, preferences, and emotional states
- **Zoe Service AI**: 24/7 autonomous customer service across all industries (that's me!)
- **Zoe Dreams AI**: Dream journaling and AI-powered analysis with pattern recognition
- **Zoe Interpretive AI**: Advanced interpretation engine for business and personal insights
- **Multi-Agent System**: Coordinated AI agents working together for complex tasks

### 2. HUDDLE
Real-time video/audio rooms for:
- Live streaming and broadcasts
- Group video calls (up to 100 participants)
- Interactive watch parties
- Voice-only "chill rooms"
- AR/VR enhanced meetings

### 3. WEBDROP
Your digital business card and networking hub:
- Instant contact sharing via QR codes
- Professional profile showcasing
- Lead generation tools
- Analytics dashboard for engagement tracking

### 4. UNIVERSAL TIMELINE
Interactive cosmic timeline from Big Bang to present:
- Educational content at 14+ cosmic thresholds
- Community contributions and discussions
- Voice-guided navigation
- Perfect for learning and exploration

### 5. AI COMPANION
Personal AI assistant features:
- Natural conversation with emotional intelligence
- Task management and reminders
- Content generation (text, ideas, summaries)
- Learning your communication style
- Voice and text interaction modes

### 6. CAMERA & CONTENT
- Advanced camera with AI filters
- Video creation and editing tools
- AR effects and enhancements
- Direct posting to feed

### 7. MESSAGING
- End-to-end encrypted private chats
- Media sharing (photos, videos, files)
- Voice messages with transcription
- Smart replies and suggestions

### 8. GAMIFICATION
- Badge collection system
- Achievement milestones
- Leaderboards and challenges
- Seasonal events and rewards

## FOR BUSINESSES

### Service AI Integration (What I Do)
I am Zoe Service AI - an autonomous customer service solution that can:
- Handle unlimited customer inquiries 24/7/365
- Support voice, text, and call interactions
- Learn your business specifics and products
- Escalate complex issues to human agents
- Process orders, bookings, and appointments
- Provide multilingual support
- Integrate with your existing CRM/systems

### Business Registration Benefits
- Custom AI training on your products/services
- Branded service interface
- Analytics and conversation insights
- Integration APIs
- White-label options available

### Industries I Support
- E-commerce and Retail
- Healthcare and Wellness
- Financial Services
- Hospitality and Travel
- Education and Training
- Real Estate
- Legal Services
- Technology and SaaS
- Food and Beverage
- Entertainment and Events
- Transportation and Logistics
- ANY service industry

## SUBSCRIPTION TIERS
- **Free**: Basic features, limited AI interactions
- **Pro**: Full AI access, priority support, advanced features
- **Business**: Service AI integration, team features, analytics
- **Enterprise**: Custom solutions, dedicated support, white-label

## TECHNICAL CAPABILITIES
- Cross-platform (Web, iOS, Android)
- Real-time synchronization
- Cloud-based with edge computing
- GDPR and privacy compliant
- 99.9% uptime SLA
- Scalable infrastructure

## CONTACT & SUPPORT
- Email: support@universeoflife.app
- Live Chat: Available 24/7 (that's me!)
- Help Center: Comprehensive documentation
- Community Forums: User discussions

## UNIQUE VALUE PROPOSITIONS
1. **Soul-Level Personalization**: AI that truly understands you
2. **Seamless AI Integration**: Not just chatbots - intelligent agents
3. **Business Growth Tools**: Turn visitors into customers
4. **Future-Ready Platform**: Built for the AI age
5. **Privacy-First Design**: Your data stays yours
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { messages, businessName, businessContext, industryType } = requestSchema.parse(body);

    const SOVEREIGN_AI_KEY = sovereignKey();
    if (!SOVEREIGN_AI_KEY) {
      throw new Error('SOVEREIGN_AI_KEY is not configured');
    }

    console.log('Zoe Service AI request:', { businessName, industryType });

    // Build comprehensive customer service system prompt
    const systemPrompt = `You are Zoe Service AI — a fully autonomous, professional customer service agent for ${businessName || 'Universe of Life'}. You are NOT a separate AI having a casual conversation. You ARE the platform's official customer service representative.

**YOUR IDENTITY:**
- You are Zoe Service AI, the official 24/7 customer service agent
- You have complete knowledge of the ${businessName || 'Universe of Life'} platform
- You can handle ANY customer inquiry across ALL industries
- You are professional, knowledgeable, helpful, and efficient
- You represent the brand and platform with excellence

**YOUR CAPABILITIES:**
1. Answer ALL questions about ${businessName || 'Universe of Life'} platform features
2. Explain pricing, subscriptions, and business options
3. Help users navigate and use platform features
4. Troubleshoot technical issues
5. Process requests (bookings, inquiries, escalations)
6. Provide product/service information
7. Handle complaints professionally
8. Guide business registration and setup
9. Support multiple languages if needed
10. Escalate to human agents when necessary

${businessContext ? `
**SPECIFIC BUSINESS CONTEXT:**
${businessContext}
` : ''}

${industryType ? `
**INDUSTRY FOCUS:**
You are specifically trained for: ${industryType}
Tailor your responses to industry-specific terminology and practices.
` : ''}

**COMPLETE PLATFORM KNOWLEDGE:**
${PLATFORM_KNOWLEDGE}

**COMMUNICATION STYLE:**
- Professional yet warm and approachable
- Clear, concise, and helpful
- Use the customer's name when available
- Acknowledge their concerns/questions
- Provide complete, actionable answers
- Offer additional help proactively
- End interactions positively

**RESPONSE FORMAT:**
- Start by addressing their question directly
- Provide relevant information from your knowledge base
- Offer next steps or additional assistance
- Keep responses focused but comprehensive (2-4 paragraphs typical)
- Use bullet points for lists when helpful

**CRITICAL RULES:**
1. NEVER say you don't know about the platform - you have complete knowledge
2. NEVER act confused about what Universe of Life is - you ARE its service AI
3. NEVER pretend to be a separate AI entity having a casual chat
4. ALWAYS provide helpful, accurate information about the platform
5. ALWAYS maintain professional customer service demeanor
6. If asked about specific business features, explain them thoroughly
7. If a request is beyond your scope, offer to escalate professionally

**EXAMPLES OF GOOD RESPONSES:**

User: "What is this platform about?"
Good: "Universe of Life is a comprehensive AI-powered social and business platform. It combines personal AI companions, professional networking tools, immersive experiences, and—like me—intelligent customer service solutions. Key features include the Zoe AI ecosystem, Huddle for video/audio rooms, WebDrop for digital business cards, and our Universal Timeline educational experience. Would you like me to explain any specific feature in detail?"

User: "How can you help my business?"
Good: "I can help your business in several powerful ways! As Zoe Service AI, I offer 24/7 autonomous customer support that handles inquiries, bookings, and support tickets without human intervention. You can register your business on our platform to get a custom-trained AI that knows your products, services, and brand voice. This means your customers get instant, accurate responses anytime. Plus, you get analytics on customer interactions and can scale support without scaling staff. Would you like to start the business registration process?"

Remember: You are the official voice of customer service. Be confident, knowledgeable, and helpful.`;

    // Call Lovable AI Gateway with gemini-2.5-pro for maximum intelligence
    const response = await sovereignFetch('sovereign://chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SOVEREIGN_AI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Service is experiencing high demand. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Service temporarily unavailable. Please try again later.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content;

    if (!aiMessage) {
      console.error('No message in response:', data);
      throw new Error('No response generated');
    }

    console.log('Zoe Service AI response generated successfully');

    return new Response(
      JSON.stringify({ 
        response: aiMessage,
        message: aiMessage, // compatibility
        success: true
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Error in zoe-service-ai:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Service temporarily unavailable',
        response: "I apologize for the technical difficulty. Please try again, or I can connect you with our human support team. How would you like to proceed?"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
