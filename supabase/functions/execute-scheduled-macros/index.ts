import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScheduledMacro {
  id: string;
  user_id: string;
  macro_name: string;
  trigger_phrase: string;
  commands: string[];
  schedule_days: string[];
  schedule_time: string;
  last_scheduled_run: string | null;
  variables: Array<{
    name: string;
    defaultValue: string;
    description: string;
  }>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Checking for scheduled macros to execute...');

    // Get current time info
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];

    console.log(`Current time: ${currentTime}, day: ${currentDay}`);

    // Fetch enabled scheduled macros
    const { data: macros, error } = await supabase
      .from('voice_macros')
      .select('*')
      .eq('enabled', true)
      .eq('schedule_enabled', true)
      .not('schedule_time', 'is', null);

    if (error) {
      console.error('Error fetching scheduled macros:', error);
      throw error;
    }

    console.log(`Found ${macros?.length || 0} scheduled macros`);

    const executedMacros: string[] = [];
    
    for (const macro of (macros as ScheduledMacro[]) || []) {
      // Check if it's time to execute
      const macroTime = macro.schedule_time;
      const macroDays = Array.isArray(macro.schedule_days) ? macro.schedule_days : [];

      console.log(`Checking macro "${macro.macro_name}": time=${macroTime}, days=${macroDays.join(',')}`);

      // Check if current time matches (within 5-minute window)
      const [macroHour, macroMinute] = macroTime.split(':').map(Number);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);

      const timeMatches = macroHour === currentHour && Math.abs(macroMinute - currentMinute) < 5;

      // Check if current day is in scheduled days
      const dayMatches = macroDays.length === 0 || macroDays.includes(currentDay);

      // Check if already executed recently (within last hour)
      const lastRun = macro.last_scheduled_run ? new Date(macro.last_scheduled_run) : null;
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const notRecentlyExecuted = !lastRun || lastRun < hourAgo;

      if (timeMatches && dayMatches && notRecentlyExecuted) {
        console.log(`Executing macro: ${macro.macro_name}`);

        // Prepare commands with variable substitution
        const commands = macro.commands.map(cmd => {
          let processedCmd = cmd;
          if (macro.variables && Array.isArray(macro.variables)) {
            for (const variable of macro.variables) {
              const placeholder = `{${variable.name}}`;
              if (processedCmd.includes(placeholder)) {
                processedCmd = processedCmd.replace(
                  new RegExp(placeholder, 'g'),
                  variable.defaultValue
                );
              }
            }
          }
          return processedCmd;
        });

        // Log the execution to command history
        for (const command of commands) {
          await supabase.from('zoe_command_history').insert({
            user_id: macro.user_id,
            command: command,
            success: true,
            metadata: {
              scheduled: true,
              macro_id: macro.id,
              macro_name: macro.macro_name,
            },
            response: `Executed scheduled macro: ${macro.macro_name}`,
          });
        }

        // Update execution count and last run time
        await supabase
          .from('voice_macros')
          .update({
            execution_count: (macro as any).execution_count + 1,
            last_scheduled_run: now.toISOString(),
          })
          .eq('id', macro.id);

        // Increment the macro execution count using the database function
        await supabase.rpc('increment_macro_execution', { macro_id: macro.id });

        executedMacros.push(macro.macro_name);

        console.log(`Successfully executed macro: ${macro.macro_name}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: macros?.length || 0,
        executed: executedMacros.length,
        macros: executedMacros,
        timestamp: now.toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error) {
    console.error('Error in execute-scheduled-macros:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
