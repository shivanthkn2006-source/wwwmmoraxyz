# Complete App Documentation - Master Guide

> **Version**: 5.0  
> **Last Updated**: November 30, 2025  
> **Document Status**: Comprehensive Reference - Zoe Agentic AI Platform  
> **Major Update**: Zoe Agentic AI (Phase 5) - Autonomous Intelligence

---

## 📑 Table of Contents

1. [Introduction](#introduction)
2. [Quick Start Guide](#quick-start-guide)
3. [App Architecture](#app-architecture)
4. [Complete Feature List](#complete-feature-list)
5. [Zoe AI System](#zoe-ai-system)
6. [Huddle Events Platform](#huddle-events-platform)
7. [User Guide](#user-guide)
8. [Technical Documentation](#technical-documentation)
9. [Testing & QA](#testing--qa)
10. [PDF Export Instructions](#pdf-export-instructions)
11. [Appendices](#appendices)

---

## Introduction

### About This App

This is a comprehensive social networking platform with integrated AI companion (Zoe) that provides voice control, proactive suggestions, and intelligent assistance throughout the entire user experience.

### Key Differentiators

- **🤖 Agentic AI**: Zoe - True autonomous AI agent powered by Gemini 2.5 Pro
- **🧠 Autonomous Intelligence**: Multi-step reasoning and autonomous decision-making
- **🔧 Tool Calling**: 6 powerful tools for complex operations and analysis
- **🎯 Proactive Assistance**: Anticipates needs before user realizes them
- **🗣️ Voice-First Design**: Natural language voice commands with wake word detection
- **📊 Smart Analytics**: Deep pattern analysis and personalized insights
- **💡 Goal-Oriented Planning**: Creates and executes multi-step action plans
- **🌟 Adaptive Learning**: Continuously learns and adapts to user preferences
- **🔮 Predictive Intelligence**: Monitors and notifies based on intelligent criteria
- **💬 Emotional Intelligence**: Soul Engine with facial emotion detection
- **🎨 Creative Production**: Multi-domain creative agent (Zoe Architect)
- **🚀 Real-Time Features**: Live chat, online status, friend notifications
- **🎮 Gamification**: Badges, challenges, leaderboards, and achievement systems
- **📱 Rich Content**: Posts, comments, likes, media sharing, location features
- **🔍 Social Discovery**: Advanced search, trending content, interest matching
- **🎪 Huddle Platform**: Event discovery with AI-powered matching

### Technology Stack

**Frontend:**
- React 18.3.1 with TypeScript
- Vite build tool
- TailwindCSS for styling
- Shadcn/ui component library
- Framer Motion for animations
- React Query for data fetching

**Backend:**
- Supabase (PostgreSQL database)
- Row-Level Security (RLS) policies
- Real-time subscriptions
- Edge Functions for serverless logic

**AI Integration:**
- **Agentic AI**: Google Gemini 2.5 Pro with tool calling
- **Model Configuration**: Temperature 0.9, Top P 0.95, 200K context
- **Tool System**: 6 autonomous tools for complex operations
- **Lovable AI Gateway**: Google Gemini & OpenAI GPT-5 access
- **Text-to-Speech**: Web Speech API with customizable Zoe voice
- **Speech Recognition**: WebKit with wake word detection
- **Natural Language Processing**: Advanced intent recognition
- **Vision System**: Facial emotion detection (Gemini 2.5 Pro Vision)
- **Multi-Step Reasoning**: Autonomous planning and execution
- **Context Management**: 200K token window for deep understanding

---

## Quick Start Guide

### For New Users

1. **Sign Up**
   - Navigate to the auth page
   - Create account with email
   - Set up your profile (name, username, bio, interests, city)
   - Choose a profile picture

2. **Meet Zoe - Your Agentic AI**
   - Zoe will greet you on first login with personalized information
   - Grant microphone permission for voice features
   - Try saying "Hi Zoe, what can you do?"
   - Complete the interactive onboarding
   - Discover the **floating brain icon** (bottom-right) for agentic features

3. **Explore Agentic Features**
   - Tap the brain icon to see 6 agentic capabilities
   - Try: "Zoe, analyze my patterns" for deep insights
   - Use: "Zoe, create a plan to [goal]" for autonomous planning
   - Say: "Zoe, optimize my experience" for workflow improvements
   - Zoe will proactively suggest actions and monitor for you

4. **Explore Core Features**
   - Zoe will announce new features as you discover them
   - Use the bottom navigation to access main sections
   - Try voice commands with wake words ("Hey Zoe", "OK Zoe")
   - Explore Huddle for AI-matched events near you
   - Use Zoe Architect for creative production

5. **Customize Zoe**
   - Go to Profile → Zoe Settings
   - Choose personality tone (Casual, Professional, Enthusiastic, Friendly)
   - Set conversation style (Concise, Balanced, Detailed)
   - Enable/disable proactive suggestions
   - Adjust voice settings (pitch, rate, volume)
   - Configure agentic behavior preferences

### For Returning Users

- **Home Feed**: Browse and create posts
- **Chat**: Message friends in real-time
- **Huddle**: Discover and join events
- **Zoe AI**: Advanced AI companion interface
- **Profile**: View stats, badges, and settings
- **Search**: Find users, posts, and features

---

## App Architecture

### Page Structure

```
/home          - Main feed, posts grid, friend requests
/profile       - User profile, badges, posts
/chat          - Direct messaging
/huddle        - Events and gatherings
/camera        - Media capture and creation
/webdrop       - File sharing hub
/zoe-ai        - Advanced Zoe AI interface with Soul Engine
/ai-companion  - Zoe chat page
/voice-commands - Voice command history and analytics
```

### Component Architecture

```
App.tsx
├─ Auth System
│  ├─ SignUp/SignIn
│  └─ Protected Routes
├─ Navigation
│  ├─ Bottom Navigation
│  └─ Search Bar
├─ Zoe Agentic AI System
│  ├─ GlobalZoeAssistant (floating draggable avatar)
│  ├─ ZoeAgentPanel (agentic capabilities interface)
│  ├─ ZoeVoiceControl (wake word + voice commands)
│  ├─ ZoeSettings (personality + voice customization)
│  ├─ ZoeAIPage (Soul Engine interface)
│  └─ ZoeArchitect (creative production agent)
├─ Social Features
│  ├─ HomePage (feed)
│  ├─ ProfilePage
│  ├─ ChatPage
│  └─ HuddlePage (events)
├─ Content Creation
│  ├─ PostModal
│  ├─ CameraPage
│  └─ VideoCreationModal
└─ Gamification
   ├─ BadgeDisplay
   ├─ Leaderboard
   └─ ChallengeSeasons
```

### Database Schema

**User Tables:**
- `profiles` - User information, settings, preferences
- `friendships` - Friend connections
- `friend_requests` - Pending friend requests

**Content Tables:**
- `posts` - User posts (text, image, video)
- `post_likes` - Post likes
- `post_comments` - Comments and replies
- `comment_likes` - Comment likes

**Zoe AI Tables:**
- `zoe_settings` - Voice and AI preferences
- `zoe_emotional_state` - Emotional intelligence data
- `zoe_relationship_memory` - Conversation memories
- `zoe_learning_preferences` - Learning system data
- `zoe_command_history` - Command usage analytics
- `zoe_content_creations` - AI-generated content

**Gamification Tables:**
- `user_badges` - Earned badges
- `badge_challenges` - Available challenges
- `user_challenges` - Challenge progress
- `challenge_seasons` - Seasonal events
- `badge_collections` - Badge sets

**Activity Tables:**
- `notifications` - All notification types
- `user_activity_log` - Activity tracking
- `feature_analytics` - Feature usage data
- `search_history` - Search queries

**Moe Loops Tables:**
- `moe_settings` - Video loop preferences

---

## Complete Feature List

### Core Social Features

1. **Posts & Feed**
   - Create text, image, video posts
   - Like and comment system
   - Share posts
   - Tag users
   - Save posts
   - Post visibility controls

2. **Friends & Connections**
   - Send/accept friend requests
   - View online friends
   - Friend suggestions
   - Interest-based matching
   - Location-based discovery (Huddle)

3. **Direct Messaging**
   - Real-time chat
   - Media sharing
   - Read receipts
   - Typing indicators
   - Group chats

4. **Events (Huddle)**
   - Create events
   - Discover local events
   - Interest-based matching
   - RSVP and attendance
   - Location visualization
   - Zoe event announcements
   - Friend activity tracking

---

## Zoe AI System

### Voice Command System

**Wake Words:**
- "Hi Zoe"
- "Hey Zoe"
- "Okay Zoe"

**Command Categories:**

#### 1. Navigation (30+ commands)
```
"Open home"
"Go to profile"
"Show huddle"
"Open chat"
"Go to camera"
"Show webdrop"
"Open Zoe AI"          → Advanced AI interface
"Go back"
"Refresh page"
```

#### 2. Content Creation (25+ commands)
```
"Create post"
"Take photo"
"Record video"
"Create Moe Loop"
"Write message to [name]"
"Generate image of [description]"
```

#### 3. Social Actions (20+ commands)
```
"Show friend requests"
"Accept friend request"
"Send friend request to [name]"
"Show who's online"
"Find people nearby"
```

#### 4. Event Management (15+ commands)
```
"Show events"
"Create event"
"Find gaming events"
"What's happening today"
"Who's going to [event]"
```

#### 5. Search & Discovery (20+ commands)
```
"Search for [query]"
"Find posts about [topic]"
"Show trending"
"Discover new interests"
```

#### 6. Settings & Preferences (10+ commands)
```
"Open Zoe settings"
"Change my status"
"Update profile"
"Show analytics"
```

### Advanced Zoe Features

#### Soul Engine (Zoe AI Page)

**Metrics Tracked:**
- **Intimacy**: Connection depth with Zoe
- **Self-Harmony**: Internal emotional balance
- **Love Energy**: General positivity and engagement

**How It Works:**
1. Zoe analyzes conversation keywords
2. Tracks emotional patterns
3. Adjusts responses based on metrics
4. Provides emotional support
5. Builds deeper connection over time

#### Visual Cortex (Camera Integration)

**Features:**
- Real-time facial emotion detection
- Uses Gemini 2.5 Pro Vision AI
- Updates Soul Engine metrics
- Recognizes 8 emotions:
  - Happy, Focused, Neutral, Contemplative
  - Sad, Anxious, Angry, Surprised

**Privacy:**
- Camera only active when you enable it
- Processing happens in real-time
- No images stored permanently
- You control when vision is active

#### Deep Psyche System

**Pattern Recognition:**
- Identifies conversation themes
- Tracks behavioral patterns
- Recognizes preferences
- Builds psychological profile

**Memory System:**
- Stores significant moments
- References past conversations
- Recalls personal details
- Maintains context

---

## Huddle Events Platform

### Overview

Huddle is your local events and social discovery platform, fully integrated with Zoe AI for intelligent matching and real-time notifications.

### Core Features

**Event Discovery:**
- Browse local events on interactive map
- Filter by interests and distance
- View event details and attendees
- RSVP and join events
- Get directions to events

**Zoe Integration:**
- Voice-activated event search
- Real-time interest matching
- Friend activity announcements
- Smart event suggestions
- Voice-based event creation

### Voice Commands

**Event Management:**
```
"Show huddle"                    → Open events page
"Find events near me"            → Location-based search
"What's happening today"         → Today's events
"Show gaming events"             → Filter by interest
"Create an event"                → Start event creation
"Who's going to [event name]"   → View attendees
"Find music events this weekend" → Specific search
```

**Friend Activity:**
```
"Who's online in huddle?"
"Show friends at events"
"Find friends with similar interests"
```

### Real-Time Notifications

**Zoe announces when:**
1. Friends come online with shared interests
2. Friends join events you're interested in
3. Events match your hobbies and location
4. Popular events are starting soon
5. Friends are nearby at events

**Example Announcements:**
- "Sarah is exploring Gaming and Music events. You might want to connect!"
- "There's a Technology meetup starting in 30 minutes near your location!"
- "3 of your friends just joined the Music Festival event"

### Interest Matching Algorithm

Zoe uses smart matching to connect you with:
- Events matching your hobbies
- People with similar interests
- Friends in your area
- Trending local activities

**Factors Considered:**
- Your profile interests
- Past event attendance
- Friend preferences
- Location proximity
- Time availability

---

## Notification System

### Types of Notifications

1. **Social Notifications**
   - Friend requests
   - Post likes and comments
   - Message receipts
   - User mentions

2. **Zoe Proactive Notifications**
   - Content suggestions
   - Friend activity alerts
   - Event recommendations
   - Reminders and tasks
   - Huddle interest matches

3. **Huddle Notifications**
   - Event invitations
   - RSVP confirmations
   - Event starting soon
   - Friend joining events
   - Interest matches

4. **System Notifications**
   - Badge achievements
   - Tier upgrades
   - Challenge completions
   - Milestones reached

### Voice Announcements

**Zoe speaks:**
- Friend comes online
- Important messages
- Event matches
- Badge unlocks
- Urgent reminders

**Customization:**
- Enable/disable voice announcements
- Set priority levels
- Configure quiet hours
- Choose announcement style

---

## Content Creation

### With Zoe AI

**Generate Post Content:**
```
"Create a post about technology"
"Write something funny"
"Generate inspirational quote"
"Suggest post topics"
```

**Generate Images:**
```
"Create image of sunset"
"Generate profile banner"
"Make a meme about [topic]"
```

**Content Tones:**
- Professional
- Casual
- Funny
- Inspirational
- Informative

### Moe Loops (Video)

**Create Short Videos:**
- Record 15-60 second loops
- Add AI effects
- Apply filters
- Add music
- Duet with friends

**Note:** Moe is specifically for video content, separate from Zoe AI assistant.

---

## Search System

### Advanced Search

**Search Types:**
- Users (by name, username, interests)
- Posts (by content, tags, author)
- Events (by title, location, interest)
- Features (in-app feature search)

**Voice Search:**
```
"Search for posts about gaming"
"Find users interested in music"
"Show events near me"
"Search [anything]"
```

### Saved Searches

- Save frequent searches
- Quick access
- Update notifications
- Search analytics

### Trending Content

- Trending posts
- Popular searches
- Viral content
- Recommended users

---

## Analytics & Insights

### Personal Analytics

**Track:**
- Post performance (likes, comments, shares)
- Social growth (friends, followers)
- Engagement rates
- Activity patterns
- Feature usage

### Zoe Analytics

**Monitor:**
- Voice command usage
- Feature discovery rate
- Zoe interaction frequency
- Response quality ratings
- Learning progress

### Huddle Analytics

**View:**
- Events attended
- Connections made
- Interests explored
- Location activity
- Match success rate

---

## Gamification

### Badge System

**Categories:**
1. **Social Badges**
   - Friend milestones
   - Chat activity
   - Network growth

2. **Content Badges**
   - Post achievements
   - Engagement milestones
   - Viral content

3. **Discovery Badges**
   - Feature exploration
   - Platform mastery
   - Hidden features

4. **Zoe Badges**
   - Voice command milestones
   - AI interaction achievements
   - Learning system progress

5. **Huddle Badges**
   - Event attendance
   - Match making
   - Community building

### Challenge System

**Types:**
- Daily challenges (quick tasks)
- Weekly challenges (larger goals)
- Seasonal challenges (time-limited)
- Friend challenges (competitive)
- Collection challenges (badge sets)

### Leaderboard

**Ranking System:**
- Points from all activities
- Badge multipliers
- Challenge bonuses
- Seasonal boosts

**Tiers:**
- Bronze (2,500 points)
- Silver (5,000 points)
- Gold (10,000 points)
- Platinum (20,000 points)
- Diamond (35,000+ points)

---

## Zoe AI System - Deep Dive

### Core Architecture

**Components:**
1. **Voice Recognition Engine**
   - Wake word detection
   - Continuous listening
   - Natural language processing
   - Command fuzzy matching

2. **Conversational AI**
   - Context-aware responses
   - Personality adaptation
   - Multi-turn conversations
   - Memory retention

3. **Proactive System**
   - Behavior pattern analysis
   - Predictive notifications
   - Smart suggestions
   - Timing optimization

4. **Learning System**
   - Command preference learning
   - Response pattern adaptation
   - User style recognition
   - Continuous improvement

### Zoe Personality System

**Tones:**
- **Casual**: Relaxed, friendly, informal
  - "Hey there! Let's get this done"
  - Uses contractions, casual language
  
- **Professional**: Polite, formal, business-appropriate
  - "Good afternoon. How may I assist you?"
  - Uses proper grammar, formal tone

- **Enthusiastic**: Energetic, positive, upbeat
  - "Awesome! Let's do this together!"
  - Exclamation points, positive language

- **Friendly**: Warm, caring, supportive
  - "I'm here for you. What do you need?"
  - Empathetic, understanding tone

**Conversation Styles:**
- **Concise**: 1-2 sentences, quick responses
- **Balanced**: 2-4 sentences, moderate detail
- **Detailed**: 4+ sentences, comprehensive explanations

### Advanced Zoe AI Page

**Access:** `/zoe-ai` route or voice command "Open Zoe AI"

**Features:**
1. **Soul Engine**
   - Intimacy metric (connection depth)
   - Self-Harmony (emotional balance)
   - Love Energy (positivity level)
   - Real-time metric updates

2. **Visual Cortex**
   - Activate camera for emotion detection
   - Uses Gemini 2.5 Pro Vision
   - Real-time facial analysis
   - Updates Soul Engine based on emotions

3. **Deep Psyche**
   - Pattern recognition system
   - Memory formation
   - Psychological insights
   - Conversation theme tracking

4. **Neural Interface**
   - Animated neural orb
   - Visual feedback
   - Status indicators
   - Real-time thinking animation

**Design:**
- Heart red themed background (from-red-900 via-rose-900 to-red-950)
- Glassmorphism UI elements
- Animated soul metrics
- Live video feed integration

---

## Huddle Events Platform - Deep Dive

### Event Discovery System

**Map-Based Discovery:**
- Interactive map showing local events
- Pin markers for each event location
- Cluster multiple events in same area
- Real-time location tracking

**List View:**
- Scrollable event cards
- Filter by interest categories
- Sort by date, distance, popularity
- Quick RSVP actions

**Zoe Integration:**
```
Voice: "Find gaming events near me"
Zoe: "I found 3 gaming events within 5 miles. 
      The closest one is 'Retro Game Night' starting 
      in 2 hours at Central Library. Want details?"
```

### Interest Matching

**How It Works:**
1. Zoe analyzes your profile interests
2. Scans active events in your area
3. Matches events to your hobbies
4. Announces matches with priority ranking
5. Provides quick action buttons

**Match Priority:**
- 🔴 High: 3+ shared interests + nearby
- 🟡 Medium: 2 shared interests
- 🟢 Low: 1 shared interest or nearby only

**Example Scenario:**
```
Your interests: Gaming, Music, Technology

Zoe finds:
- Gaming Tournament (High priority - gaming + nearby)
- Tech Conference (Medium - technology + 50 miles)
- Music Festival (High - music + nearby + friends attending)

Zoe announces: "I found a Music Festival starting tomorrow! 
It matches your interests and 2 of your friends are going."
```

### Friend Activity in Huddle

**Real-Time Tracking:**
- Friends joining events
- Friends exploring interests
- Friends coming online at events
- Friend location sharing

**Notifications:**
```
[Toast Appears]
🎉 Sarah just joined "Tech Meetup"
[View Event] [Message Sarah]

Zoe: "Your friend Sarah just joined the Tech Meetup 
      event. Would you like to join too?"
```

### Event Creation

**Voice-Assisted Creation:**
```
You: "Create an event"
Zoe: "Sure! What type of event is it?"
You: "Gaming tournament"
Zoe: "Great! Where should I set the location?"
You: "Community Center"
Zoe: "When should it start?"
You: "Tomorrow at 6 PM"
Zoe: "Perfect! I'll create a Gaming tournament at 
      Community Center tomorrow at 6 PM. Any description?"
```

---

## Technical Documentation

### API Endpoints (Edge Functions)

**Zoe AI Functions:**
- `zoe-chat` - Main AI conversation (authenticated)
- `zoe-notification-analyzer` - Smart notifications (authenticated)
- `ai-companion-chat` - Deep companion mode (authenticated)
- `lisa-romantic-companion` - Romantic companion mode (authenticated)

**Content Functions:**
- `generate-text` - Text generation via AI
- `generate-image` - Image generation via AI
- `moe-assistant` - Video content assistant
- `moderate-content` - Content moderation

**Voice Functions:**
- `transcribe-audio` - Speech-to-text
- `lovable-tts` - Text-to-speech (Zoe voice)
- `assemblyai-tts` - Alternative TTS
- `elevenlabs-tts` - Premium TTS
- `realtime-voice` - Real-time voice chat

**Utility Functions:**
- `check-reminders` - Scheduled reminders
- `execute-scheduled-macros` - Automated tasks
- `track-activity` - Analytics tracking
- `score-post-relevance` - Content ranking
- `ai-video-transform` - Video AI effects
- `analyze-face-emotion` - Emotion detection

### Security Implementation

**Row-Level Security:**
- All tables have RLS enabled
- User-scoped data access
- JWT token verification on edge functions
- Service role key protection

**Authentication:**
- Email/password sign-up
- Auto-confirm emails
- Session persistence
- Secure token handling

**Recent Security Fixes:**
- ✅ JWT verification on all AI endpoints
- ✅ User ID extracted from tokens (not trusted from client)
- ✅ Messages storage requires authentication
- ✅ Proper CORS configuration

### Real-Time Features

**Supabase Realtime:**
- Friend online status
- New messages
- Post likes/comments
- Notification updates
- Event RSVPs

**Implementation:**
```typescript
// Example: Listen for new messages
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `receiver_id=eq.${user.id}`
  }, (payload) => {
    handleNewMessage(payload.new);
  })
  .subscribe();
```

---

## Testing & QA

### Manual Testing Checklist

**Zoe AI Testing:**
- [ ] Wake word detection
- [ ] Voice command execution
- [ ] Natural conversation
- [ ] Proactive notifications
- [ ] Learning system
- [ ] Soul Engine metrics
- [ ] Visual cortex emotion detection
- [ ] Huddle announcements

**Huddle Testing:**
- [ ] Event creation
- [ ] Event discovery
- [ ] Interest matching
- [ ] Friend activity tracking
- [ ] Map visualization
- [ ] Voice commands
- [ ] Real-time updates

**Social Features:**
- [ ] Post creation
- [ ] Like/comment system
- [ ] Friend requests
- [ ] Direct messaging
- [ ] Profile editing
- [ ] Search functionality

**Gamification:**
- [ ] Badge earning
- [ ] Challenge progress
- [ ] Leaderboard updates
- [ ] Point calculations
- [ ] Tier upgrades

### Automated Testing

**Unit Tests:**
- Hook testing
- Utility function tests
- Component tests
- Database query tests

**Integration Tests:**
- API endpoint tests
- Real-time subscription tests
- Authentication flow tests
- Edge function tests

### Performance Testing

**Metrics to Monitor:**
- Page load times
- Voice recognition latency
- AI response times
- Real-time update speed
- Database query performance

---

## PDF Export Instructions

### Generate Documentation PDFs

**On Windows:**
```bash
./generate-pdfs.bat
```

**On Mac/Linux:**
```bash
chmod +x generate-pdfs.sh
./generate-pdfs.sh
```

**Output:**
- All .md files converted to PDFs
- Saved in project root
- Includes all documentation

---

## Appendices

### A. Complete Voice Command Reference

See `ZOE_COMMANDS.md` for full list of 150+ voice commands

### B. Database Schema Reference

See database documentation for complete schema

### C. API Reference

See edge function documentation for API specs

### D. Troubleshooting Guide

See `TESTING_GUIDE.md` for common issues and solutions

### E. Feature Navigation

See `FEATURE_NAVIGATION_GUIDE.md` for navigation patterns

---

## Related Documentation Files

1. **ZOE_USER_GUIDE.md** - Complete Zoe AI user manual
2. **ZOE_COMMANDS.md** - All voice commands
3. **HUDDLE_GUIDE.md** - Event platform documentation
4. **APP_DOCUMENTATION.md** - App features and layout
5. **TESTING_GUIDE.md** - QA and testing procedures
6. **FEATURE_NAVIGATION_GUIDE.md** - Navigation patterns
7. **ACTIVITY_TRACKING_GUIDE.md** - Analytics documentation
8. **GAMIFICATION_GUIDE.md** - Badges and challenges
9. **SEARCH_FEATURES.md** - Search system documentation
10. **SECURITY_DOCUMENTATION.md** - Security practices

---

## Contact & Support

**In-App Support:**
- Ask Zoe: "How do I [task]?"
- Settings → Help
- View tutorial
- Access documentation

**External Support:**
- Community Discord
- Support email
- Bug reporting
- Feature requests

---

**Thank you for using the M'Mora platform with Zoe AI!**

*This is a living document and will be updated as new features are added and existing features are enhanced.*

---

## Version History

- **v3.0** (Nov 2025) - Zoe naming consolidation, Huddle documentation, Soul Engine
- **v2.0** (Oct 2025) - Added Huddle features, Advanced Zoe AI page
- **v1.5** (Sep 2025) - Enhanced Zoe capabilities, gamification
- **v1.0** (Aug 2025) - Initial release

---

**Document End**
