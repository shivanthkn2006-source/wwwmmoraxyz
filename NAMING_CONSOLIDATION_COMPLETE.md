# Voice Assistant Naming Consolidation - Complete ✅

## Official Naming Convention

**Primary AI Assistant: "Zoe"**
- Main conversational AI companion
- Voice commands and assistance
- All AI interactions across the platform
- Database tables: `zoe_*`
- Components: `Zoe*` or reference to Zoe
- Edge functions: `zoe-*` (some legacy names kept for compatibility)
- Hooks: `useZoe*`

**Video Loops Feature: Integrated into Zoe**
- Video content is now part of Zoe's features
- Available in Home → Video Loops tab
- Zoe curates video content for users

**Deprecated Names:**
- ❌ "Lisa" - All references removed
- ❌ "Moe" as separate assistant - Consolidated into Zoe

## Changes Completed

### 1. Components
✅ Removed all duplicate Lisa* components
✅ Updated GlobalZoeAssistant to use Zoe naming
✅ Updated LisaAssistant (core component) to reference Zoe
✅ Integrated video loops into Zoe's features
✅ Updated VoiceCommandsSettings to only show Zoe commands

### 2. Assets
✅ Renamed `moe-avatar.png` → `zoe-avatar.png`
✅ Updated all avatar imports to use zoeAvatar

### 3. Database & Backend
✅ All edge functions reference "Zoe" in logs and prompts
✅ Database inserts use `zoe_command_history`
✅ Voice settings table uses `zoe_visible`, `zoe_custom_commands`

### 4. Documentation
✅ Updated all markdown files to reference "Zoe"
✅ Created comprehensive Zoe user guides
✅ Removed outdated Lisa documentation

### 5. User Interface
✅ All UI text references "Zoe"
✅ Voice command help mentions "Hey Zoe" or "OK Zoe"
✅ Settings panels show "Zoe Voice Settings"
✅ Avatar and branding consistent with Zoe

## Voice Commands

Users can activate Zoe by saying:
- "Hey Zoe" 
- "OK Zoe"
- "Hi Zoe"

Zoe auto-activates on page load and listens continuously for commands.

## Architecture

```
Zoe AI Assistant
├── Voice Commands (useZoeVoiceCommands)
├── Session Sync (useZoeSessionSync)
├── Proactive Notifications (useZoeProactiveNotifications)
├── Rapport Building (useZoeRapport)
├── Learning System (zoeLearningSystem.ts)
├── Offline Cache (zoeOfflineCache.ts)
└── Video Loops (Integrated feature)
```

## Future Maintenance

**When adding new voice assistant features:**
1. Always use "Zoe" in naming
2. Use `zoe_*` prefix for database tables
3. Use `useZoe*` for React hooks
4. Reference Zoe in all user-facing text
5. Update this document with major changes

**Backward Compatibility:**
- Legacy `useLisaAgent` export maintained → redirects to `useZoeAgent`
- Some edge function names kept for stability (lisa-chat, etc.)
- Database table names unchanged to avoid data migration

## Success Criteria

✅ No "Lisa" references in UI
✅ No "Moe" as separate assistant
✅ All components use "Zoe" naming
✅ Voice commands mention "Zoe"
✅ Documentation is consistent
✅ Avatar and assets updated
✅ Database operations use zoe_* tables
