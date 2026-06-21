# ZOE ORB UNIFIED MESSAGING - Complete Documentation

## Overview

The Zoe Orb now features a **Unified Conversation Platform** that seamlessly combines AI companion chat (Zoe) and user-to-user direct messaging in a single, elegant interface. This document explains the architecture, features, and usage of this integration.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Features](#core-features)
3. [How to Use](#how-to-use)
4. [Voice Commands](#voice-commands)
5. [Technical Implementation](#technical-implementation)
6. [Supported Content Types](#supported-content-types)
7. [Hands-Free Mode](#hands-free-mode)
8. [Database Schema](#database-schema)
9. [Real-Time Updates](#real-time-updates)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZOE ORB UNIFIED MESSAGING                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │   ZOE AI MODE    │◄──►│     USER MESSAGING MODE         │  │
│  │                  │    │                                  │  │
│  │ • AI Companion   │    │ • Direct Messages               │  │
│  │ • Voice Input    │    │ • Search Users                  │  │
│  │ • Media Analysis │    │ • Recent Contacts               │  │
│  │ • TTS Response   │    │ • Real-time Updates             │  │
│  └──────────────────┘    └──────────────────────────────────┘  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              UNIFIED CONVERSATION SWITCHER              │   │
│  │   Tap header → Select Zoe AI or any user contact       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  MULTIMODAL INPUT                        │   │
│  │   Text │ Images │ Documents │ Videos │ Voice Notes      │   │
│  │   Live Video Recording (1 minute max)                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  HANDS-FREE VOICE                        │   │
│  │   5-second silence detection → Auto-submit message      │   │
│  │   Voice commands: "enter", "send", "submit"              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Features

### 1. Unified Conversation Interface
- **Single panel** for both Zoe AI and user messaging
- **Tap the header** to switch between conversations
- **Zoe AI always appears first** in the conversation list
- Recent contacts appear below Zoe

### 2. Dual Messaging Modes

| Mode | Description | Color Scheme |
|------|-------------|--------------|
| **Zoe AI** | Converse with your AI companion | Purple/Primary gradient |
| **User** | Direct message any platform user | Cyan/Teal gradient |

### 3. Multimodal Content Support
- **Text Messages** - Standard text communication
- **Images** - Share and analyze photos (Zoe can describe them)
- **Documents** - Share PDFs, text files, etc.
- **Videos** - Record and share up to 1-minute live videos
- **Voice Notes** - Audio recordings with playback
- **Live Video Analysis** - Gemini 3 Pro processes video content

### 4. Hands-Free Voice Mode
- **Enabled by default** for Zoe conversations
- Speak naturally - system listens continuously
- After **5 seconds of silence**, your message auto-submits
- Say "enter", "send", or "submit" to send immediately
- Visual countdown shows remaining silence time

---

## How to Use

### Starting a Conversation

1. **Open Zoe Orb** - Tap the floating Zoe avatar
2. **Default: Zoe AI Mode** - You're chatting with Zoe
3. **Switch to User Chat** - Tap the header button showing current mode

### Switching Between Conversations

```
┌─────────────────────────────────────────────┐
│ [🟣 Zoe AI ▼]  [🌙]  [⬜] [X]              │ ← Tap here to switch
├─────────────────────────────────────────────┤
```

When you tap the header button:
- A **conversation list** appears
- **Zoe AI** is always at the top
- **Recent contacts** appear below
- **Search** to find any platform user
- **"+ New conversation"** to start fresh

### Sending a Message to Another User

1. Tap the header to open conversation list
2. Either:
   - Select from **Recent contacts**
   - Type username in **search bar**
3. Tap the user to select them
4. Type/speak your message
5. Attach media if desired
6. Send!

### Using Voice Input

**Hands-Free Mode (Default ON):**
1. Tap the 🎤 mic button to start listening
2. Speak your message naturally
3. Wait 5 seconds (countdown shown) OR say "send"
4. Message auto-submits

**Manual Mode:**
1. Tap 🎤 to start
2. Speak your message
3. Tap 🎤 again to stop and send

### Attaching Media

1. Tap the 📎 paperclip icon
2. Choose media type:
   - 📷 **Image** - From gallery
   - 📄 **Document** - PDFs, text files
   - 🎬 **Video** - From gallery
   - 🎙️ **Voice Note** - Record audio
   - 📹 **Live Video** - Record live (1 min max)
3. Add optional text message
4. Send

---

## Voice Commands

### Messaging Commands

| Voice Command | Action |
|---------------|--------|
| "Open Zoe" / "Switch to Zoe" | Switch to Zoe AI chat mode |
| "Open user chat" / "Show messages" | Switch to user messaging mode |
| "Message [username]" | Start chat with specific user |
| "Show contacts" / "List conversations" | Show recent contacts |
| "Enable hands-free" | Turn on hands-free voice mode |
| "Disable hands-free" | Turn off hands-free voice mode |

### In-Message Commands

While speaking your message, end with:
- **"enter"** - Send message immediately
- **"send"** - Send message immediately
- **"submit"** - Send message immediately
- **"send it"** - Send message immediately
- **"go"** - Send message immediately

### Example Usage

```
You: "Hey Zoe, what's the weather like today... send"
→ Message "Hey Zoe, what's the weather like today" is sent

You: "Message John... I'll be there at 5pm, see you soon... enter"
→ Opens chat with John, sends "I'll be there at 5pm, see you soon"
```

---

## Technical Implementation

### Core Components

| File | Purpose |
|------|---------|
| `src/components/ZoeOrbConversationPanel.tsx` | Main unified chat interface |
| `src/hooks/useZoeOrbUserMessaging.ts` | User messaging state & logic |
| `src/hooks/useZoeVoiceInput.ts` | Voice input with hands-free |
| `src/hooks/useZoeVoiceCommands.ts` | Voice command processing |
| `src/hooks/useVoiceNoteRecorder.ts` | Voice note recording |
| `src/hooks/useLiveVideoRecorder.ts` | Live video capture |

### State Management

```typescript
// Messaging mode state
const [messagingMode, setMessagingMode] = useState<'zoe' | 'user'>('zoe');

// Selected user for DMs
const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

// Hands-free voice mode
const [handsFreeMode, setHandsFreeMode] = useState(true);

// Voice input with silence detection
const { isListening, transcript, silenceCountdown } = useZoeVoiceInput({
  silenceTimeout: 5000,  // 5 seconds
  handsFreeMode: true,
  onSilenceDetected: () => processVoiceMessage(transcript),
});
```

### Message Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        MESSAGE FLOW                              │
└──────────────────────────────────────────────────────────────────┘

1. USER INPUT (Text/Voice/Media)
        │
        ▼
2. MODE CHECK: messagingMode === 'zoe' OR 'user'?
        │
   ┌────┴────┐
   │         │
   ▼         ▼
ZOE MODE   USER MODE
   │         │
   ▼         ▼
3a. Call    3b. Insert into
zoe-chat    'messages' table
edge fn     with receiver_id
   │         │
   ▼         ▼
4a. AI      4b. Real-time
responds    subscription
   │         triggers update
   ▼         │
5a. TTS     5b. Recipient
speaks      sees message
response    instantly
```

---

## Supported Content Types

### Zoe AI Mode

| Content Type | Processing |
|--------------|------------|
| Text | AI conversation via zoe-chat function |
| Images | Gemini Vision analysis + AI response |
| Documents | Content extraction + AI analysis |
| Videos | Gemini 3 Pro comprehensive analysis |
| Voice Notes | Stored + context for AI |

### User Messaging Mode

| Content Type | Storage |
|--------------|---------|
| Text | `messages.content` column |
| Images | Supabase Storage → `messages.media_url` |
| Documents | Supabase Storage → `messages.media_url` |
| Videos | Supabase Storage → `messages.media_url` |
| Voice Notes | Supabase Storage → `messages.media_url` |

---

## Hands-Free Mode

### How It Works

1. **Continuous Listening** - Mic stays active after you tap it
2. **Transcript Updates** - See your words as you speak
3. **Silence Detection** - 5-second timer starts after you stop speaking
4. **Visual Countdown** - Shows seconds remaining (5, 4, 3, 2, 1)
5. **Auto-Submit** - Message sends when countdown reaches 0
6. **Immediate Submit** - Say "send", "enter", or "submit" to bypass wait

### Enabling/Disabling

**Via Voice:**
- "Enable hands-free" / "Turn on hands-free mode"
- "Disable hands-free" / "Turn off hands-free mode"

**Via UI:**
- Tap the hands-free toggle button in the input area

### Best Practices

- Speak clearly and pause slightly between sentences
- Use voice commands ("send") for faster submission
- If you need to think, tap mic to pause listening
- In noisy environments, consider disabling hands-free

---

## Database Schema

### Messages Table (User-to-User)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES profiles(user_id),
  receiver_id UUID REFERENCES profiles(user_id),
  content TEXT,
  media_url TEXT,
  media_type TEXT,  -- 'image', 'video', 'audio', 'document'
  created_at TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false,
  delivered BOOLEAN DEFAULT false
);
```

### AI Companion Messages (Zoe Conversations)

```sql
CREATE TABLE ai_companion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  role TEXT,  -- 'user' or 'assistant'
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Real-Time Updates

### User Messaging Real-Time Subscription

```typescript
// Subscribe to incoming messages
const channel = supabase
  .channel(`dm-${user.id}-${selectedUser.user_id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `receiver_id=eq.${user.id}`,
  }, (payload) => {
    // Add new message to local state
    setDirectMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

### Features
- **Instant delivery** - Messages appear immediately for both parties
- **Read receipts** - Messages marked as read when viewed
- **Auto-scroll** - New messages auto-scroll into view

---

## Troubleshooting

### Voice Input Not Working

1. **Check browser permissions** - Microphone must be allowed
2. **Chrome recommended** - Best speech recognition support
3. **Quiet environment** - Background noise can interfere
4. **Speak clearly** - Enunciate for better recognition

### Messages Not Sending (User Mode)

1. **User selected?** - Ensure you've selected a recipient
2. **Check connection** - Verify internet connectivity
3. **RLS policies** - User must exist in profiles table

### Zoe Not Responding

1. **Check online status** - Offline mode has limited responses
2. **API credits** - Backend may have rate limits
3. **Try again** - Transient errors may resolve

### Media Upload Failing

1. **File size** - Keep files under 10MB
2. **Format supported** - Use common formats (jpg, png, mp4, pdf)
3. **Storage bucket** - Ensure 'messages' bucket exists

---

## Summary

The Zoe Orb Unified Messaging system provides:

✅ **Seamless dual-mode chat** - AI and human messaging in one place  
✅ **Hands-free voice** - Speak naturally, auto-send after silence  
✅ **Multimodal support** - Text, images, videos, voice notes, documents  
✅ **Real-time updates** - Instant message delivery and sync  
✅ **Voice commands** - Full control without touching screen  
✅ **Beautiful UI** - Glassmorphic design with smooth animations  

---

*Document Version: 1.0 | Last Updated: December 2025*
