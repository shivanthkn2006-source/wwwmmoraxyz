import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get reminders that are due (within next 5 minutes) and not sent
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60000);

    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select('*, profiles!reminders_user_id_fkey(display_name, user_id)')
      .lte('reminder_time', fiveMinutesFromNow.toISOString())
      .eq('is_sent', false)
      .eq('is_completed', false);

    if (error) throw error;

    console.log(`Found ${dueReminders?.length || 0} due reminders`);

    // Process each reminder
    for (const reminder of dueReminders || []) {
      try {
        // Create notification
        await supabase.from('notifications').insert({
          user_id: reminder.user_id,
          type: 'reminder',
          from_user_id: reminder.user_id, // Self-notification
          post_id: reminder.related_id || null,
        });

        // Mark reminder as sent
        await supabase
          .from('reminders')
          .update({ is_sent: true })
          .eq('id', reminder.id);

        // If recurring, create next occurrence
        if (reminder.is_recurring && reminder.recurrence_pattern) {
          const nextTime = calculateNextOccurrence(
            new Date(reminder.reminder_time),
            reminder.recurrence_pattern
          );

          await supabase.from('reminders').insert({
            user_id: reminder.user_id,
            title: reminder.title,
            description: reminder.description,
            reminder_time: nextTime.toISOString(),
            reminder_type: reminder.reminder_type,
            related_id: reminder.related_id,
            is_recurring: true,
            recurrence_pattern: reminder.recurrence_pattern,
          });
        }

        console.log(`Processed reminder: ${reminder.title}`);
      } catch (err) {
        console.error(`Error processing reminder ${reminder.id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount: dueReminders?.length || 0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking reminders:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function calculateNextOccurrence(currentTime: Date, pattern: string): Date {
  const next = new Date(currentTime);
  
  switch (pattern) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  
  return next;
}