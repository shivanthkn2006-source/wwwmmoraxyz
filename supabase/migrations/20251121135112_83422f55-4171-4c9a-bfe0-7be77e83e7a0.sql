-- Rename all Lisa tables to Zoe tables
ALTER TABLE lisa_command_history RENAME TO zoe_command_history;
ALTER TABLE lisa_content_creations RENAME TO zoe_content_creations;
ALTER TABLE lisa_emotional_state RENAME TO zoe_emotional_state;
ALTER TABLE lisa_learning_preferences RENAME TO zoe_learning_preferences;
ALTER TABLE lisa_relationship_memory RENAME TO zoe_relationship_memory;
ALTER TABLE lisa_settings RENAME TO zoe_settings;

-- Update profile columns
ALTER TABLE profiles RENAME COLUMN lisa_conversation_style TO zoe_conversation_style;
ALTER TABLE profiles RENAME COLUMN lisa_personality_tone TO zoe_personality_tone;
ALTER TABLE profiles RENAME COLUMN lisa_proactive_suggestions TO zoe_proactive_suggestions;

-- Update voice_assistant_settings columns
ALTER TABLE voice_assistant_settings RENAME COLUMN lisa_custom_commands TO zoe_custom_commands;
ALTER TABLE voice_assistant_settings RENAME COLUMN lisa_visible TO zoe_visible;