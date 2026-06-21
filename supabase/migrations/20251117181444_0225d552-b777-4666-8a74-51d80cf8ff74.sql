-- Add conditional logic support to voice_macros table
ALTER TABLE voice_macros 
ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN voice_macros.conditions IS 'Array of condition objects: [{type: "weather", condition: "raining", trueCommands: [...], falseCommands: [...]}]';