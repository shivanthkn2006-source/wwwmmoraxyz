/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE AUTO MAIL GENERATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Generates realistic mail between users for testing and demonstration.
 * Uses relationship context for personalized content.
 * Sends notification to Zoe for voice announcement.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Mail templates by category
const MAIL_TEMPLATES = {
  family: [
    { subject: 'Dinner plans for Sunday?', body: 'Hey! Are we still on for Sunday dinner? I was thinking we could try that new Italian place downtown. Let me know!' },
    { subject: 'Check out this photo!', body: 'I found this old photo from our trip last summer. Remember how much fun we had? We should plan another trip soon!' },
    { subject: 'Quick question about the weekend', body: 'Are you free this weekend? I was thinking we could catch up over coffee. Miss talking to you!' },
    { subject: 'Movie night?', body: 'There is a new movie coming out this Friday. Want to watch it together? I heard it is really good!' },
    { subject: 'Thinking of you', body: 'Just wanted to say hi and let you know I am thinking of you. Hope everything is going well on your end!' },
  ],
  work: [
    { subject: 'Project Update - Q1 Goals', body: 'Hi! Just wanted to share a quick update on our Q1 progress. We are on track to meet all our targets. Great work so far!' },
    { subject: 'Meeting Tomorrow at 10 AM', body: 'Reminder: We have our weekly sync tomorrow at 10 AM. Please come prepared with your updates.' },
    { subject: 'New Feature Request', body: 'The client requested a new feature for the dashboard. Can we discuss the feasibility in our next call?' },
  ],
  financial: [
    { subject: 'Monthly Budget Review', body: 'Hey, I was looking at our monthly expenses and noticed we are under budget this month. Great job on saving!' },
    { subject: 'Investment Opportunity', body: 'I came across an interesting investment opportunity. Would love to discuss it with you when you have time.' },
  ],
  personal: [
    { subject: 'Happy Birthday!', body: 'Happy Birthday! Hope you have an amazing day filled with joy and happiness. Wishing you all the best!' },
    { subject: 'Congratulations!', body: 'I heard the great news! Congratulations on your achievement. You truly deserve it!' },
    { subject: 'Miss you!', body: 'It has been a while since we last talked. Just wanted to reach out and say I miss you. Lets catch up soon!' },
  ],
  meeting: [
    { subject: 'Calendar Invite: Catch-up Call', body: 'I have sent you a calendar invite for our catch-up call. Looking forward to talking with you!' },
    { subject: 'Rescheduling Our Meeting', body: 'Something came up and I need to reschedule our meeting. Can we move it to next week?' },
  ],
};

const CATEGORIES = ['family', 'work', 'financial', 'personal', 'meeting'] as const;
const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

interface GenerateMailRequest {
  senderId: string;
  recipientId: string;
  category?: string;
  priority?: string;
  customSubject?: string;
  customBody?: string;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  console.log(`[AutoMailGen ${requestId}] ═══════════════════════════════════════`);
  console.log(`[AutoMailGen ${requestId}] Request received at ${new Date().toISOString()}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const authToken = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(authToken);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: GenerateMailRequest = await req.json();
    const { senderId, recipientId, category, priority, customSubject, customBody } = body;

    console.log(`[AutoMailGen ${requestId}] Sender: ${senderId}, Recipient: ${recipientId}`);

    // Get sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('user_id', senderId)
      .single();

    // Get recipient profile
    const { data: recipientProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('user_id', recipientId)
      .single();

    console.log(`[AutoMailGen ${requestId}] Sender: ${senderProfile?.username}, Recipient: ${recipientProfile?.username}`);

    // Get relationship between users - find ANY relationship involving both users
    let relationship = null;
    let relError = null;
    
    // Query 1: Check if sender is requester and recipient is recipient
    const { data: rel1, error: err1 } = await supabase
      .from('user_relationships')
      .select('*')
      .eq('requester_id', senderId)
      .eq('recipient_id', recipientId)
      .eq('status', 'confirmed')
      .maybeSingle();
    
    if (!err1 && rel1) {
      relationship = rel1;
    } else {
      // Query 2: Check if sender is recipient and requester is recipient
      const { data: rel2, error: err2 } = await supabase
        .from('user_relationships')
        .select('*')
        .eq('requester_id', recipientId)
        .eq('recipient_id', senderId)
        .eq('status', 'confirmed')
        .maybeSingle();
      
      if (!err2 && rel2) {
        relationship = rel2;
      } else {
        relError = err1 || err2;
      }
    }

    if (relError) {
      console.log(`[AutoMailGen ${requestId}] Relationship query error:`, relError);
    }

    let relationshipLabel = senderProfile?.display_name || senderProfile?.username || 'someone';
    let relationshipType = 'friend';

    if (relationship) {
      // FIXED: Determine the label from the RECIPIENT's perspective
      // The recipient sees WHO the sender IS (the sender's label in the relationship)
      if (relationship.requester_id === senderId) {
        // Sender was the requester → recipient sees "requester_label" (what sender IS to recipient)
        // e.g., if Shivanth (sender) is the "child" in the relationship with Moksh50 (recipient)
        relationshipLabel = relationship.requester_label || relationshipLabel;
        relationshipType = relationship.relationship_type || 'friend';
      } else if (relationship.recipient_id === senderId) {
        // Sender was the recipient in the relationship → recipient sees "recipient_label"
        // e.g., if Moksh50 (sender) is the "father" in the relationship with Shivanth (recipient)
        relationshipLabel = relationship.recipient_label || relationshipLabel;
        relationshipType = relationship.relationship_type || 'friend';
      }
      console.log(`[AutoMailGen ${requestId}] Relationship found: ${relationshipType} (label: ${relationshipLabel})`);
      console.log(`[AutoMailGen ${requestId}] Relationship details: requester=${relationship.requester_id}, recipient=${relationship.recipient_id}`);
    } else {
      console.log(`[AutoMailGen ${requestId}] No relationship found between users, using display name`);
    }

    // Select random category and template
    const selectedCategory = category || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const templates = MAIL_TEMPLATES[selectedCategory as keyof typeof MAIL_TEMPLATES] || MAIL_TEMPLATES.personal;
    const template = templates[Math.floor(Math.random() * templates.length)];
    const selectedPriority = priority || PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];

    const mailSubject = customSubject || template.subject;
    const mailBody = customBody || template.body;
    const preview = mailBody.substring(0, 100) + (mailBody.length > 100 ? '...' : '');

    // Insert the mail
    const { data: mail, error: mailError } = await supabase
      .from('zoe_infinity_mail')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        subject: mailSubject,
        body: mailBody,
        preview,
        priority: selectedPriority,
        category: selectedCategory,
        relationship_label: relationshipLabel,
        relationship_type: relationshipType,
        metadata: {
          generated: true,
          template_used: true,
          sender_username: senderProfile?.username,
          sender_display_name: senderProfile?.display_name,
        },
      })
      .select()
      .single();

    if (mailError) {
      console.error(`[AutoMailGen ${requestId}] Mail insert error:`, mailError);
      throw mailError;
    }

    console.log(`[AutoMailGen ${requestId}] Mail created: ${mail.id}`);

    // Create notification queue entry for Zoe announcement
    const { error: notifError } = await supabase
      .from('zoe_mail_notification_queue')
      .insert({
        mail_id: mail.id,
        recipient_id: recipientId,
        sender_name: senderProfile?.display_name || senderProfile?.username || 'Unknown',
        sender_username: senderProfile?.username || 'unknown',
        relationship_label: relationshipLabel,
        subject: mailSubject,
        priority: selectedPriority,
        category: selectedCategory,
      });

    if (notifError) {
      console.error(`[AutoMailGen ${requestId}] Notification queue error:`, notifError);
      // Don't throw - mail was still sent
    } else {
      console.log(`[AutoMailGen ${requestId}] Notification queued for Zoe announcement`);
    }

    // Log to ZSMT for adaptive learning
    await supabase
      .from('zoe_sovereign_memory')
      .insert({
        user_id: recipientId,
        event_type: 'mail_received',
        content_text: `Received mail from ${relationshipLabel}: ${mailSubject}`,
        zoe_state_json: {
          mail_id: mail.id,
          sender_id: senderId,
          sender_username: senderProfile?.username,
          relationship_label: relationshipLabel,
          relationship_type: relationshipType,
          category: selectedCategory,
          priority: selectedPriority,
        },
        cqrs_write_priority: true,
      });

    console.log(`[AutoMailGen ${requestId}] ═══════════════════════════════════════`);
    console.log(`[AutoMailGen ${requestId}] Mail generation complete!`);

    return new Response(JSON.stringify({
      success: true,
      mail: {
        id: mail.id,
        subject: mailSubject,
        preview,
        category: selectedCategory,
        priority: selectedPriority,
        relationship_label: relationshipLabel,
        sender: senderProfile?.username,
        recipient: recipientProfile?.username,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AutoMailGen ${requestId}] Error:`, error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
