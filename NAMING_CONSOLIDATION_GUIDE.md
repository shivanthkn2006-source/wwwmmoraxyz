# Voice Assistant Naming Consolidation Guide

## Official Naming Convention

This document establishes the official naming convention for all AI assistants in the M'Mora application.

### Primary AI Assistant: **Zoe**
- **Official Name**: Zoe
- **Purpose**: Main AI companion with emotional intelligence
- **Database**: Uses `zoe_*` tables (zoe_settings, zoe_emotional_state, zoe_learning_preferences, etc.)
- **Components**: All main AI features should use "Zoe" prefix
- **Edge Functions**: zoe-chat, zoe-notification-analyzer (formerly lisa-*)
- **Context**: ZoeContext, useZoe hook
- **Assets**: moe-avatar.png (historical name, represents Zoe's avatar)

### Secondary Feature: **Moe Loops**
- **Official Name**: Moe Loops / MOE
- **Purpose**: Video loops and short-form content feature
- **Components**: MoeLoops.tsx
- **Edge Functions**: moe-assistant (for video/content creation)
- **Database**: moe_settings (for video-specific settings)
- **Note**: "Moe" is ONLY for the video loops feature, NOT the main AI assistant

### Deprecated Names
- **"Lisa"**: ❌ DEPRECATED - All references should be changed to "Zoe"
  - Old components with "Lisa*" prefix are being consolidated into "Zoe*" equivalents
  - Legacy hooks like `useLisaAgent` maintained for backwards compatibility but internally use Zoe
  - Old edge functions `lisa-chat`, `lisa-notification-analyzer` consolidated to `zoe-*`

## Migration Status

### ✅ Completed
- Hook consolidation: `useZoeAgent` is now primary, `useLisaAgent` is legacy export
- Database schema: Already uses `zoe_*` tables correctly
- Context: ZoeContext established as primary context

### 🚧 In Progress
- Component consolidation: Merging Lisa* components into Zoe* equivalents
- Edge function updates: Consolidating lisa-* functions to zoe-*
- Documentation updates: Updating all docs to use "Zoe"

### 📋 Remaining Tasks
- Update all component imports throughout the app
- Remove duplicate Lisa* components after migration
- Update edge function references in client code
- Update all user-facing text and documentation

## Best Practices

1. **New Features**: Always use "Zoe" for AI assistant features
2. **Database**: Use `zoe_*` table prefix for AI assistant data
3. **Components**: Use `Zoe*` prefix (e.g., `ZoeSettings`, `ZoeChat`)
4. **Hooks**: Use `useZoe*` prefix (e.g., `useZoeAgent`, `useZoeVoiceCommands`)
5. **Edge Functions**: Use `zoe-*` prefix (e.g., `zoe-chat`, `zoe-notification-analyzer`)
6. **Comments**: Reference "Zoe" in code comments and documentation
7. **User-Facing Text**: Display "Zoe" to users in the UI

## Why This Matters

Consistent naming:
- Reduces confusion for developers
- Makes code more maintainable
- Aligns with database schema
- Provides clear separation between features (Zoe AI vs Moe Loops)
- Improves user experience with consistent branding

## Questions?

If unsure about naming, always use **Zoe** for the main AI assistant features.
