-- Add scheduling and organization fields to voice_macros
ALTER TABLE voice_macros 
ADD COLUMN IF NOT EXISTS schedule_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS schedule_cron text,
ADD COLUMN IF NOT EXISTS schedule_days jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS schedule_time text,
ADD COLUMN IF NOT EXISTS last_scheduled_run timestamp with time zone,
ADD COLUMN IF NOT EXISTS category text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS variables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;

COMMENT ON COLUMN voice_macros.schedule_enabled IS 'Whether this macro runs on a schedule';
COMMENT ON COLUMN voice_macros.schedule_cron IS 'Cron expression for scheduling';
COMMENT ON COLUMN voice_macros.schedule_days IS 'Array of days: ["monday", "tuesday", etc.]';
COMMENT ON COLUMN voice_macros.schedule_time IS 'Time in HH:MM format';
COMMENT ON COLUMN voice_macros.category IS 'Category/folder: general, work, home, entertainment, etc.';
COMMENT ON COLUMN voice_macros.variables IS 'Array of variable definitions: [{name, defaultValue, description}]';
COMMENT ON COLUMN voice_macros.is_template IS 'Whether this is a template macro';

-- Create index for scheduled macro queries
CREATE INDEX IF NOT EXISTS idx_voice_macros_scheduled 
ON voice_macros(schedule_enabled, schedule_time) 
WHERE schedule_enabled = true AND enabled = true;