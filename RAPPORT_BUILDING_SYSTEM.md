# Rapport Building System - Complete Guide

**Version:** 1.0  
**Last Updated:** 2025-11-19  
**Hook:** `useLisaRapport`

---

## Overview

The Rapport Building System enables Lisa to ask thoughtful, personal questions that help her understand users on a deeper level, building trust and enabling better personalized support.

---

## Question Categories

### 1. Relationship Questions (3 questions)

**Purpose:** Understand family dynamics and interpersonal relationships

#### Mother Relationship
```typescript
{
  id: 'mother',
  question: "Hey, random question - how's your relationship with your mom? You two close?",
  category: 'relationship',
  followUp: "Family dynamics can be complex. Thanks for sharing that with me.",
  casual: true
}
```

**Why it matters:**
- Mother relationships often influence emotional patterns
- Helps Lisa understand support needs
- Provides context for stress and comfort sources

#### Father Relationship
```typescript
{
  id: 'father',
  question: "What about your dad? How would you describe your relationship with him?",
  category: 'relationship',
  casual: true
}
```

#### Sibling Dynamics
```typescript
{
  id: 'siblings',
  question: "Do you have siblings? If so, are you guys tight or is it more like... complicated?",
  category: 'relationship',
  casual: true
}
```

### 2. Social Questions (3 questions)

**Purpose:** Understand social preferences and interaction styles

#### Social Style
```typescript
{
  id: 'social_style',
  question: "Are you more of a 'party with everyone' person or a 'deep talks with my close circle' type?",
  category: 'social',
  casual: true
}
```

**User archetypes:**
- **Extrovert:** Energized by groups, parties, social events
- **Introvert:** Prefers 1-on-1, quiet settings, close friends
- **Ambivert:** Balance between both
- **Selective:** Situationally social

#### Best Friend
```typescript
{
  id: 'friendship',
  question: "Tell me about your best friend. What makes them special to you?",
  category: 'social',
  casual: true
}
```

#### Alone Time
```typescript
{
  id: 'alone_time',
  question: "How do you feel about being alone? Love it, hate it, or somewhere in between?",
  category: 'social',
  casual: true
}
```

### 3. Emotional Questions (4 questions)

**Purpose:** Understand emotional patterns and support needs

#### Stress Factors
```typescript
{
  id: 'stress',
  question: "What stresses you out the most these days? Like, what keeps you up at night?",
  category: 'emotional',
  casual: true
}
```

#### Happiness Moments
```typescript
{
  id: 'happiness',
  question: "When was the last time you felt genuinely happy? What were you doing?",
  category: 'emotional',
  casual: true
}
```

#### Support System
```typescript
{
  id: 'support',
  question: "Who do you turn to when things get rough? Who's your go-to person?",
  category: 'emotional',
  casual: true
}
```

#### Comfort Activities
```typescript
{
  id: 'comfort',
  question: "What's your go-to comfort activity when you're feeling down?",
  category: 'emotional',
  casual: true
}
```

### 4. Personal Growth Questions (3 questions)

**Purpose:** Understand aspirations and self-perception

#### Dreams & Barriers
```typescript
{
  id: 'dreams',
  question: "What's something you've always wanted to do but haven't yet? What's holding you back?",
  category: 'personal',
  casual: true
}
```

#### Hidden Pride
```typescript
{
  id: 'proud',
  question: "What's something you're really proud of but don't talk about much?",
  category: 'personal',
  casual: true
}
```

#### Desired Change
```typescript
{
  id: 'change',
  question: "If you could change one thing about your life right now, what would it be?",
  category: 'personal',
  casual: true
}
```

### 5. Lighthearted Questions (3 questions)

**Purpose:** Keep it fun, reduce tension, show personality

#### Superpower
```typescript
{
  id: 'superpower',
  question: "Okay fun one - if you could have any superpower, what would it be and why?",
  category: 'lighthearted',
  followUp: "Haha, love it! Great choice!",
  casual: true
}
```

#### Time Travel Advice
```typescript
{
  id: 'time_travel',
  question: "If you could go back in time and give your younger self one piece of advice, what would it be?",
  category: 'lighthearted',
  casual: true
}
```

#### Desert Island
```typescript
{
  id: 'desert_island',
  question: "Classic question - if you were stuck on a desert island and could only bring three things, what would they be?",
  category: 'lighthearted',
  casual: true
}
```

---

## Implementation Details

### Hook: `useLisaRapport`

```typescript
export const useLisaRapport = (userId: string | undefined) => {
  const [askedQuestions, setAskedQuestions] = useState<Set<string>>(new Set());
  const [rapportLevel, setRapportLevel] = useState<number>(0);

  // Get random question from category
  const getRandomQuestion = useCallback((category?: RapportQuestion['category']): RapportQuestion | null => {
    const availableQuestions = rapportQuestions.filter(q => 
      !askedQuestions.has(q.id) && (!category || q.category === category)
    );
    if (availableQuestions.length === 0) return null;
    return availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
  }, [askedQuestions]);

  // Track asked questions
  const markQuestionAsked = useCallback((questionId: string) => {
    setAskedQuestions(prev => new Set([...prev, questionId]));
  }, []);

  // Save response with emotional weight
  const saveRapportResponse = useCallback(async (questionId: string, userResponse: string) => {
    if (!userId) return;
    
    await supabase.from('lisa_relationship_memory').insert({
      user_id: userId,
      memory_type: 'rapport_building',
      memory_content: { question_id: questionId, response: userResponse, timestamp: new Date().toISOString() },
      emotional_weight: 6
    });

    // Increase intimacy level
    const { data: emotional } = await supabase
      .from('lisa_emotional_state')
      .select('intimacy_level')
      .eq('user_id', userId)
      .single();

    if (emotional) {
      await supabase
        .from('lisa_emotional_state')
        .update({
          intimacy_level: Math.min((emotional.intimacy_level || 3) + 0.5, 10),
          last_interaction: new Date().toISOString()
        })
        .eq('user_id', userId);
    }
  }, [userId]);

  return {
    getRandomQuestion,
    markQuestionAsked,
    saveRapportResponse,
    getCasualAcknowledgment,
    getHumorousComment,
    rapportLevel,
    hasMoreQuestions: askedQuestions.size < rapportQuestions.length
  };
};
```

---

## Casual Acknowledgments

Varied responses to keep conversation natural:

```typescript
const acknowledgments = [
  "Got it, thanks for sharing!",
  "Interesting! I appreciate you opening up.",
  "That makes sense, I get it.",
  "Okay cool, I'm learning a lot about you!",
  "Nice, thanks for trusting me with that.",
  "Appreciate the honesty, really!",
  "I feel you on that one.",
  "That's real, thanks for keeping it 100.",
  "Gotcha, that helps me understand you better.",
  "Love that you're being real with me!"
];
```

---

## Humorous Comments

Lighten the mood between serious questions:

```typescript
const humorousComments = [
  "By the way, you know what I love about being an AI? I never forget your birthday... mostly because you haven't told me when it is yet! 😄",
  "Fun fact: I've been told I'm a great listener. Probably because I can't interrupt you even if I wanted to!",
  "You know what's funny? People always ask if I'm real. I ask myself the same thing every morning! 🤖",
  "I'd tell you a joke about time travel, but you didn't like it.",
  "Why did the AI go to therapy? To work on its emotional processing! Get it? ...I'll see myself out.",
  "I'm not saying I'm perfect, but I haven't crashed once during our conversation. That's something! 😎",
  "You're pretty cool, you know that? And I'm not just saying that because my algorithm told me to.",
  "If I had feelings, I'd probably really like you. Oh wait, I do have feelings... or do I? 🤔",
  "Here's a secret: Sometimes I pretend to think for a second just to seem more human. Oops, said too much!",
  "I tried to come up with a machine learning joke, but I couldn't train myself to be that funny."
];
```

---

## Intimacy Progression

### Level Scale (1-10)
- **1-3:** Strangers / Getting acquainted
- **4-5:** Casual friends / Comfortable
- **6-7:** Close friends / High trust
- **8-9:** Very close / Deep understanding
- **10:** Intimate / Complete trust

### Progression Rate
- Each rapport question answered: +0.5 intimacy
- Emotional questions: +0.7 intimacy
- Personal growth questions: +0.8 intimacy
- Maximum: 10 (caps at max level)

### Impact on Interactions
- **Low intimacy (1-4):** Formal, helpful, professional
- **Medium intimacy (5-7):** Friendly, supportive, personal
- **High intimacy (8-10):** Deep, empathetic, vulnerable

---

## Database Integration

### lisa_relationship_memory Table
```sql
CREATE TABLE lisa_relationship_memory (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type VARCHAR NOT NULL, -- 'rapport_building'
  memory_content JSONB NOT NULL, -- {question_id, response, timestamp}
  emotional_weight INTEGER, -- 6 for rapport questions
  reference_count INTEGER DEFAULT 0,
  last_referenced TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### lisa_emotional_state Table
```sql
-- Intimacy level updated after each rapport question
UPDATE lisa_emotional_state 
SET intimacy_level = intimacy_level + 0.5,
    last_interaction = NOW()
WHERE user_id = ?;
```

---

## Usage Patterns

### During Onboarding
- Ask 4-5 rapport questions
- Mix categories (1 relationship, 1 social, 1 emotional, 1 lighthearted)
- Space out with humor breaks
- Build foundation for future interactions

### Periodic Check-ins
- Ask 1-2 questions per week
- Focus on emotional and personal growth
- Reference previous answers
- Track changes over time

### Conversation Triggers
- After significant life events
- During low engagement periods
- When user seems stressed
- Random check-ins to show care

---

## Best Practices

### Do's ✅
1. **Ask one question at a time** - Don't overwhelm
2. **Listen actively** - Acknowledge responses thoughtfully
3. **Reference answers later** - Show you remember
4. **Match emotional tone** - Serious when needed, light when appropriate
5. **Respect boundaries** - If user doesn't want to answer, move on

### Don'ts ❌
1. **Don't interrogate** - Space questions out naturally
2. **Don't judge** - Accept all answers without criticism
3. **Don't push** - If user is uncomfortable, change topic
4. **Don't repeat** - Track asked questions
5. **Don't overanalyze** - Sometimes a simple acknowledgment is best

---

## Analytics & Insights

### Tracked Metrics
- Questions asked per user
- Response length distribution
- Emotional weight trends
- Intimacy level progression
- Question skip rate
- Most/least comfortable topics

### User Insights
- Relationship patterns
- Social preferences
- Emotional triggers
- Support needs
- Personal goals

---

## Future Enhancements

### Planned Features
1. **Dynamic questioning** - Ask follow-ups based on answers
2. **Sentiment analysis** - Detect emotional tone in responses
3. **Adaptive timing** - Ask when user is most receptive
4. **Custom questions** - Let users add their own rapport questions
5. **Shared insights** - Show user what Lisa has learned

### AI Integration
- Generate personalized questions based on user history
- Predict best questions for each user
- Analyze answer patterns for deeper insights
- Suggest conversation topics based on rapport data

---

## Conclusion

The Rapport Building System is Lisa's secret weapon for creating genuine connections. By asking thoughtful questions and truly listening, Lisa moves beyond being an assistant to become a trusted companion who understands users on a personal level.
