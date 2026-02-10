# Complete App Documentation & User Guide

## Table of Contents
1. [Overview](#overview)
2. [Page-by-Page Layout](#page-by-page-layout)
3. [Features Guide](#features-guide)
4. [Zoe AI System](#zoe-ai-system)
5. [Hidden Features](#hidden-features)
6. [Troubleshooting](#troubleshooting)

---

## Overview

This is a comprehensive social networking platform with AI-powered features, voice control, gamification, and real-time communication capabilities.

**Core Technologies:**
- React + TypeScript frontend
- Supabase backend (database, auth, real-time, storage)
- Zoe AI - Voice-controlled AI assistant
- Real-time presence and notifications
- Gamification system with badges and challenges

---

## Page-by-Page Layout

### 1. Home Page (`/home`)
**Location:** Main landing page after login

**Layout:**
```
┌─────────────────────────────────────┐
│  [Profile]  [Search]  [Notifications]│
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Post Feed                  │   │
│  │  • User posts grid           │   │
│  │  • Like/comment/share        │   │
│  │  • Image/video posts         │   │
│  └─────────────────────────────┘   │
│                                     │
│  [🎤 Zoe Voice Button]              │
└─────────────────────────────────────┘
```

**Features:**
- Post creation (text, image, video)
- Feed with infinite scroll
- Like, comment, share posts
- Real-time updates
- Zoe voice control overlay

**Voice Commands:**
- "Create post about [topic]"
- "Open profile"
- "Show notifications"
- "Search for [query]"

---

### 2. Zoe AI Page (`/zoe-ai`)
**Location:** Advanced AI interface with Soul Engine

**Layout:**
```
┌─────────────────────────────────────┐
│  Sidebar:                           │
│  • Soul Metrics (Intimacy, Self-    │
│    Harmony, Love Energy)            │
│  • Vision System (Camera)           │
│  • Deep Psyche (Patterns & Memories)│
│                                     │
│  Main:                              │
│  • Neural Orb (animated)            │
│  • Chat Interface                   │
│  • Real-time emotion detection      │
└─────────────────────────────────────┘
```

**Features:**
- Soul Engine metrics tracking
- Real-time facial emotion detection via camera
- Deep psyche pattern recognition
- Advanced conversational AI
- Visual cortex integration
- Heart red themed background

**Voice Commands:**
- All standard Zoe commands work here
- Enhanced emotional intelligence
- Camera-based interaction analysis

---

### 3. Huddle Page (`/huddle`)
**Location:** Events and social discovery

**Layout:**
```
┌─────────────────────────────────────┐
│  [Map View] [List View] [Create]    │
├─────────────────────────────────────┤
│  Search: [Find events...]           │
│  Filters: [Interest] [Date] [Dist]  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Event Cards                │   │
│  │  • Title & Description       │   │
│  │  • Location (map pin)        │   │
│  │  • Attendees                 │   │
│  │  • Interest tags             │   │
│  │  • Join button               │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

**Features:**
- Event creation and discovery
- Interest-based matching
- Location visualization (map)
- Real-time attendee updates
- Zoe voice announcements
- Friend activity notifications

**Voice Commands:**
- "Show huddle"
- "Find events near me"
- "What's happening today"
- "Find gaming events"
- "Create an event"

**Zoe Huddle Integration:**
- Announces interesting events matching your hobbies
- Notifies when friends join events
- Suggests events based on location
- Voice-based event creation
- Real-time activity updates

---

### 4. Profile Page (`/profile`)
**Location:** Access via bottom nav or top bar

**Features:**
- Edit profile information
- View badges and achievements
- View user's posts
- Friend management
- Status indicator (online/busy/away)
- Zoe settings access

**Editable Fields:**
- Display name
- Username
- Bio
- Profile photo
- City/Location
- Interests/Hobbies
- Profession
- Field of study

---

### 5. Chat Page (`/chat`)
**Location:** Direct messaging interface

**Features:**
- Real-time messaging
- Media sharing (images, videos)
- Typing indicators
- Read receipts
- Zoe voice dictation
- Quick replies

---

### 6. Camera Page (`/camera`)
**Location:** Media capture and creation

**Features:**
- Photo capture
- Video recording
- AI video effects
- AR filters
- Instant posting
- Zoe suggestions

---

### 7. Webdrop Page (`/webdrop`)
**Location:** File sharing hub

**Features:**
- Drag & drop upload
- File preview
- Quick sharing
- Media library
- Zoe upload assistance

---

## Zoe AI System

### Core Capabilities

1. **Voice Control**
   - Natural language commands
   - Wake word activation
   - Continuous listening mode
   - Multi-command support

2. **Conversational AI**
   - Context-aware responses
   - Personality customization
   - Learning from interactions
   - Emotional intelligence

3. **Proactive Assistance**
   - Smart notifications
   - Content suggestions
   - Friend activity alerts
   - Event recommendations
   - Huddle interest matching

4. **Platform Integration**
   - Navigate anywhere with voice
   - Create content via voice
   - Search with natural language
   - Control all features hands-free

### Zoe Settings

**Access:** Profile → Zoe Settings

**Sections:**
1. Voice & Speech
   - Wake word configuration
   - Voice selection
   - Speech rate and pitch
   - Output mode (speech/text/both)

2. Personality
   - Tone selection
   - Conversation style
   - Response preferences
   - Formality level

3. Notifications
   - Proactive suggestions toggle
   - Notification priorities
   - Voice announcements
   - Quiet hours

4. Learning
   - Enable/disable learning
   - Clear learning data
   - Export preferences
   - View insights

5. Advanced
   - Offline mode
   - Debug options
   - Performance settings
   - Privacy controls

---

## Gamification System

### Badges & Achievements

**Categories:**
- Social (friend milestones)
- Content (post achievements)
- Discovery (feature exploration)
- Engagement (activity streaks)
- Special (seasonal, events)

### Challenges

**Types:**
- Daily challenges
- Weekly goals
- Seasonal events
- Friend competitions
- Badge collections

### Leaderboard

**Ranking Factors:**
- Total points
- Badges earned
- Activity level
- Content quality
- Social engagement

### Tiers
- Bronze (2,500 points)
- Silver (5,000 points)
- Gold (10,000 points)
- Platinum (20,000 points)
- Diamond (35,000 points)

---

## Hidden Features

### Advanced Search

**Filters:**
- Content type (posts/users/events)
- Date range
- Location radius
- Interest tags
- Engagement level

**Voice Search:**
- "Find posts about [topic] from last week"
- "Search users interested in [hobby] near me"
- "Show trending content in [category]"

### Smart Recommendations

**Based On:**
- Your interests
- Friend activity
- Trending content
- Location data
- Time patterns

### Analytics Dashboard

**Track:**
- Post performance
- Engagement metrics
- Growth trends
- Feature usage
- Zoe interaction stats

---

## Moe Loops Feature

### Short-Form Video Content

**Separate from Zoe AI** - Moe Loops is its own video feature:
- Create short video loops
- Add effects and filters
- Share with friends
- Trending loops feed
- Duet and stitch features

**Access:**
- Home → MOE Loops tab
- Camera → Loops mode
- Profile → My Loops

**Note:** Moe is the video assistant, Zoe is the main AI companion.

---

## Troubleshooting

### Zoe Not Responding

**Solutions:**
1. Check microphone permissions
2. Verify Zoe is enabled in settings
3. Try manual activation (click mic button)
4. Restart the app
5. Clear browser cache

### Voice Recognition Issues

**Solutions:**
1. Speak clearly and naturally
2. Reduce background noise
3. Check microphone quality
4. Adjust sensitivity in settings
5. Try different wake words

### App Performance

**Solutions:**
1. Clear cached data
2. Close unused tabs
3. Update browser
4. Check internet connection
5. Restart device

### Feature Access

**Solutions:**
1. Complete onboarding tutorial
2. Verify account permissions
3. Check feature requirements
4. Update app version
5. Contact support

---

## Privacy & Security

### Data Protection
- End-to-end encryption for messages
- Secure authentication
- Privacy-focused design
- GDPR compliant

### User Controls
- Granular privacy settings
- Block/report features
- Data export tools
- Account deletion option

### Zoe Privacy
- Conversations stored securely
- Learning data encrypted
- No third-party sharing
- User-controlled deletion

---

## Best Practices

### For Best Experience

1. **Complete Your Profile**
   - Add interests and hobbies
   - Set your location
   - Upload profile photo
   - Write engaging bio

2. **Engage with Zoe**
   - Try different commands
   - Provide feedback
   - Customize settings
   - Use proactive features

3. **Build Your Network**
   - Connect with friends
   - Join events (Huddle)
   - Participate in challenges
   - Share quality content

4. **Stay Active**
   - Post regularly
   - Respond to friends
   - Attend events
   - Complete challenges

---

## Feature Discovery

### Zoe Announcements

When you discover new features, Zoe will:
- Announce the feature vocally
- Show quick tutorial
- Provide usage examples
- Track your progress

### Progressive Disclosure

Features unlock as you:
- Complete tutorials
- Reach milestones
- Earn badges
- Increase engagement

---

## Accessibility

### Voice-First Design
- Fully voice controllable
- Screen reader support
- Keyboard navigation
- High contrast modes

### Zoe Assistance
- Voice guidance
- Step-by-step instructions
- Contextual help
- Error recovery

---

## Integration Features

### External Services
- Calendar sync
- Contact import
- Social media sharing
- Weather integration
- Traffic updates

### Zoe Integration
- Calendar event reminders
- Contact-based suggestions
- Share via Zoe commands
- Weather in briefings
- Commute planning

---

## Feedback & Support

### In-App Feedback
- Rate Zoe responses
- Report issues
- Suggest features
- Share experiences

### Support Channels
- In-app chat
- Email support
- Community forum
- Help documentation

---

**Last Updated:** November 2024  
**Version:** 2.0 - Zoe AI Platform

For the most up-to-date information, see the in-app help or visit our support website.
