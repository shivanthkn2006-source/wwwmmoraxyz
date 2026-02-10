# Voice Onboarding System - Complete Guide

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Feature Status:** Active

---

## Overview

The Voice Onboarding System provides a completely hands-free, conversational way for new users to set up their profile and establish a rapport with Lisa AI.

---

## User Experience Flow

### Phase 1: Welcome & Basic Info (Steps 1-7)

**Step 1: Introduction**
```
Lisa: "Hey there! I'm Lisa, your AI companion. I'm super excited to get to know you! 
       What should I call you?"
User: *speaks their name*
Lisa: "Nice to meet you, {name}!"
```

**Step 2: Pronouns**
```
Lisa: "Quick question - what are your pronouns? Just so I can address you right."
User: *speaks pronouns*
Lisa: "Got it!"
```

**Step 3: Location**
```
Lisa: "Cool cool! So where are you hanging out these days? Which city?"
User: *speaks city name*
Lisa: "Awesome!"
```

**Step 4: Field of Study**
```
Lisa: "What's your thing? What are you studying or what field are you into?"
User: *speaks field*
Lisa: "Nice!"
```

**Step 5: Profession**
```
Lisa: "And work-wise, what do you do? Or what do you wanna do?"
User: *speaks profession*
Lisa: "Sweet!"
```

**Step 6: Hobbies**
```
Lisa: "Alright, fun part! What do you love doing when you're not working or studying? 
       Any hobbies?"
User: *speaks comma-separated hobbies*
Lisa: "Love it!"
```

**Step 7: Bio**
```
Lisa: "Tell me a bit about yourself in your own words. What makes you, you?"
User: *speaks bio*
Lisa: "Perfect!"
```

### Phase 2: Rapport Building (Steps 8-12)

**Step 8: Rapport Introduction**
```
Lisa: "Okay {name}, now that I know the basics, let's get real for a sec. 
       I wanna really understand you, not just the surface stuff. Cool?"
User: "Yes" / "Sure" / "Okay"
Lisa: "Great! These next few questions might seem personal, but they help me 
       understand how to support you better."
```

**Step 9: Mother Relationship**
```
Lisa: "How's your relationship with your mom? You two close, or is it complicated?"
User: *shares about mother relationship*
Lisa: *Casual acknowledgment* "Thanks for sharing that with me."
```

**Step 10: Social Life**
```
Lisa: "What about your social life? Are you the life of the party, or more of a 
       chill-with-a-few-close-friends type?"
User: *describes social style*
Lisa: *Casual acknowledgment*
```

**Step 11: Current Mood**
```
Lisa: "How are you feeling right now, honestly? Like, what's your current vibe?"
User: *shares current emotional state*
Lisa: *Empathetic acknowledgment*
```

**Step 12: Passion**
```
Lisa: "What gets you fired up? What makes you jump out of bed excited?"
User: *shares passions*
Lisa: *Encouraging response*
```

### Phase 3: Completion & Humor

**Step 13: Humor Break & Completion**
```
Lisa: "Alright, heavy stuff done! Here's a joke to lighten the mood: 
       Why don't scientists trust atoms? Because they make up everything! 😄 
       Ready to dive into our app?"
User: *responds*
Lisa: "Alright {name}, we're all set! I feel like I know you already. 
       Let's make some amazing memories together! 🌟"
```

---

## Technical Implementation

### Component: `LisaVoiceOnboarding.tsx`

**Key Features:**
- Web Speech API integration
- Real-time transcription display
- Progress tracking (13 steps)
- Data validation and storage
- Speech synthesis for Lisa's voice
- Visual feedback with waveform animation

**State Management:**
```typescript
interface OnboardingData {
  display_name?: string;
  field_of_study?: string;
  gender?: string;
  profession?: string;
  city?: string;
  bio?: string;
  hobbies?: string[];
  relationshipAnswers?: {
    motherRelationship?: string;
    socialInteractions?: string;
    currentMood?: string;
    interests?: string;
  };
}
```

**Database Integration:**
- Updates `profiles` table with basic info
- Creates `lisa_emotional_state` entry with relationship context
- Marks `onboarding_progress` as completed
- Sets personality to 'casual' and style to 'conversational'

---

## Speech Recognition

### Browser Compatibility
- Uses `webkitSpeechRecognition` API
- Supported browsers: Chrome, Edge, Safari (desktop)
- Continuous listening: `false` (one response at a time)
- Interim results: `false` (only final transcriptions)
- Language: `en-US`

### Error Handling
- **Network errors**: "Could not understand. Please try again!"
- **No speech**: Automatic retry after 3 seconds
- **Timeout**: Auto-restarts recognition

---

## Voice Synthesis

### Configuration
```typescript
utterance.rate = 0.95      // Slightly slower for clarity
utterance.pitch = 1.1      // Slightly higher, feminine tone
utterance.volume = 1.0     // Full volume
```

### Voice Selection
- Prefers female voices (e.g., "Samantha", "Female" variants)
- Falls back to default system voice if unavailable

---

## Casual Acknowledgments

Lisa uses varied responses to keep conversation natural:
- "Got it!"
- "Awesome!"
- "Cool cool!"
- "Nice!"
- "Love it!"
- "Sweet!"
- "Perfect!"

---

## Data Storage

### Profile Updates
```sql
UPDATE profiles SET
  display_name = ?,
  field_of_study = ?,
  gender = ?,
  profession = ?,
  city = ?,
  bio = ?,
  hobbies = ?,
  lisa_personality_tone = 'casual',
  lisa_conversation_style = 'conversational'
WHERE user_id = ?
```

### Emotional State Creation
```sql
INSERT INTO lisa_emotional_state (
  user_id,
  relationship_stage,
  intimacy_level,
  current_mood,
  emotional_context
) VALUES (?, 'getting_to_know', 3, ?, ?)
```

### Onboarding Completion
```sql
UPDATE onboarding_progress SET
  completed = true,
  current_step = 100
WHERE user_id = ?
```

---

## User Interface

### Visual Elements
- **Lisa Avatar**: Animated border pulse when speaking
- **Progress Bar**: Shows completion (1/13 to 13/13)
- **Transcript Display**: Shows what user said
- **Waveform Animation**: Three animated bars when listening
- **Action Button**: Mic (blue) when idle, MicOff (red) when listening

### Responsive Design
- Mobile-optimized with full-screen overlay
- Centered card layout
- Large, touch-friendly buttons
- Clear visual feedback

---

## Best Practices for Users

### Speaking Tips
1. **Speak clearly** at normal pace
2. **Wait for Lisa** to finish speaking before responding
3. **Be natural** - no need for special phrasing
4. **List hobbies** with commas: "reading, gaming, cooking"
5. **Take your time** - there's no rush

### Privacy
- All voice data is processed locally in browser
- Only final transcripts are stored in database
- Audio is never recorded or saved
- You can skip onboarding and fill profile manually

### Troubleshooting
- **Not hearing Lisa?** Check system volume
- **Lisa not hearing you?** Check microphone permissions
- **Recognition issues?** Try refreshing and using Chrome
- **Want to skip?** There's no option yet (feature request)

---

## Developer Notes

### Integration Points
- Triggered automatically when `onboarding_progress.completed = false`
- Blocks access to ProfilePage until complete
- Can be manually triggered by deleting onboarding progress record
- Works alongside `LisaSyncIndicator` for status display

### Future Enhancements
- Multi-language support
- Voice selection (pitch, speed, gender)
- Skip/pause functionality
- Re-record individual answers
- Custom question sets based on user type
- Integration with learning system for follow-up questions

---

## Analytics & Metrics

### Tracked Events
- Onboarding start time
- Time per question (average)
- Completion rate
- Drop-off points
- Speech recognition errors
- Most common answers per question

### Success Metrics
- 90%+ completion rate target
- <10 minutes average duration
- <5% error rate
- High satisfaction scores

---

## Conclusion

The Voice Onboarding System represents a paradigm shift in user onboarding - moving from forms to conversations. By building rapport early, Lisa establishes trust and provides a foundation for personalized, emotionally intelligent interactions throughout the user's journey.
