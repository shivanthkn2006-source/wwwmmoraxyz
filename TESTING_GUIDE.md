# Testing Guide for Lisa AI Features

This guide will help you test all the new Lisa AI features including personality customization, proactive notifications, and user online announcements.

---

## 1. Testing Lisa Personality System

### Accessing Personality Settings

1. **Navigate to Profile Settings**
   - Click on your profile avatar in the top navigation bar
   - Select "Lisa Settings" from the profile menu
   - Click on the "Personality" tab

### Testing Different Personality Tones

**Test Casual Tone:**
1. Set personality tone to "Casual"
2. Go to AI Companion page (click Lisa voice button or navigate to `/ai-companion`)
3. Ask Lisa: "What should I do today?"
4. Expected behavior: Lisa responds in a relaxed, informal manner with contractions and casual language

**Test Professional Tone:**
1. Change personality tone to "Professional"
2. Ask the same question: "What should I do today?"
3. Expected behavior: Lisa responds with polished, respectful, and articulate language

**Test Enthusiastic Tone:**
1. Change personality tone to "Enthusiastic"
2. Ask: "How's my day looking?"
3. Expected behavior: Lisa responds with energy, exclamation marks, and uplifting language

**Test Friendly Tone (Default):**
1. Change personality tone to "Friendly"
2. Ask: "Can you help me with something?"
3. Expected behavior: Lisa responds warmly and supportively

### Testing Conversation Styles

**Test Concise Style:**
1. Set conversation style to "Concise"
2. Ask: "Explain what I can do in this app"
3. Expected behavior: Lisa gives brief, 1-2 sentence responses

**Test Balanced Style (Default):**
1. Set conversation style to "Balanced"
2. Ask the same question
3. Expected behavior: Lisa provides adequate detail without being verbose

**Test Detailed Style:**
1. Set conversation style to "Detailed"
2. Ask: "How do I create a post?"
3. Expected behavior: Lisa provides comprehensive, step-by-step explanations

### Verifying Changes Take Effect

- Changes should apply to the next message sent to Lisa
- You can test by asking the same question with different settings
- Check the AI Companion chat to see how responses differ
- Expected database changes: `profiles` table should show updated `lisa_personality_tone` and `lisa_conversation_style`

---

## 2. Testing Proactive Notifications

### Testing "Haven't Posted" Notification

**Setup:**
1. Ensure you have an active account with some previous posts
2. Wait 3+ days without creating any posts (or manually update `user_activity_patterns.last_post_date` in database to be 3+ days ago)

**Expected Behavior:**
- Lisa will analyze activity every 30 minutes
- You should receive a notification suggesting: "You haven't posted in X days, want to share something?"
- High priority suggestions (8+) will show as toast notifications
- Check Notifications panel to see the suggestion

**Manual Trigger:**
```sql
-- Run this in your database to simulate no posts for 5 days
UPDATE user_activity_patterns
SET last_post_date = NOW() - INTERVAL '5 days'
WHERE user_id = 'YOUR_USER_ID';
```

### Testing "Friend Nearby" Notification

**Setup:**
1. Have at least one friend in your friends list
2. Both you and your friend should have the same city set in profiles
3. Both should have shared hobbies/interests

**Expected Behavior:**
- When a friend with shared interests is in the same city, Lisa suggests connecting
- Message: "[Friend Name] is online and shares your interests in [hobby1] and [hobby2] and is also in [city]"
- Priority 9 notification (highest) with toast and voice announcement option

**Manual Trigger:**
```sql
-- Ensure both profiles have matching city and hobbies
UPDATE profiles
SET city = 'New York', hobbies = ARRAY['hiking', 'photography', 'travel']
WHERE user_id = 'YOUR_USER_ID';

UPDATE profiles
SET city = 'New York', hobbies = ARRAY['hiking', 'photography', 'cooking'], status = 'online'
WHERE user_id = 'FRIEND_USER_ID';
```

### Testing Proactive Suggestions Toggle

1. Go to Lisa Settings → Personality
2. Toggle "Enable Proactive Suggestions" OFF
3. Expected: No automatic proactive notifications
4. Toggle it back ON
5. Expected: Proactive notifications resume

---

## 3. Testing User Online Announcements with Location

### Feature Overview

When a friend comes online, Lisa will:
- Create a notification
- Show a toast message
- Make a voice announcement with the friend's name and location

### Testing the Feature

**Setup:**
1. Have at least one friend added to your account
2. Friend should have city information in their profile
3. Ensure browser allows audio/speech synthesis

**Test Steps:**

1. **Simulate Friend Coming Online:**
   - Ask a friend to change their status to "online" OR
   - Manually update in database:
   ```sql
   UPDATE profiles
   SET status = 'online'
   WHERE user_id = 'FRIEND_USER_ID';
   ```

2. **Expected Behavior:**
   - You receive a toast notification: "Friend Online - [Name] just came online from [City]"
   - Lisa speaks: "Lisa here! [Name] just came online from [City]. Would you like to say hi?"
   - A notification appears in your Notifications panel
   - Notification includes friend name, city, and optional country

3. **Verify Notification Details:**
   - Click on notification to view profile
   - Check that location details are accurate
   - Verify voice announcement played (if enabled)

**Test with Different Locations:**
```sql
-- Friend in different city
UPDATE profiles
SET city = 'Los Angeles', status = 'online'
WHERE user_id = 'FRIEND_USER_ID';

-- Friend in same city
UPDATE profiles
SET city = 'YOUR_CITY', status = 'online'
WHERE user_id = 'FRIEND_USER_ID';
```

### Verifying Real-time Updates

- Use two browser tabs/windows with different accounts
- Change status to "online" in one tab
- Verify notification appears in the other tab within seconds
- Check browser console for real-time subscription logs

---

## 4. Testing Voice Commands

### Available Lisa Voice Commands

1. **Navigation Commands:**
   - "Lisa, go to home"
   - "Lisa, open profile"
   - "Lisa, show chat"
   - "Lisa, open Huddle"

2. **Action Commands:**
   - "Lisa, create a post"
   - "Lisa, search for [query]"
   - "Lisa, update my bio to [text]"
   - "Lisa, change my status to [status]"

3. **Social Commands:**
   - "Lisa, show my friends"
   - "Lisa, find users interested in [hobby]"

### Testing Voice Commands

1. Click the floating Lisa voice button (bottom right)
2. Wait for the waveform animation
3. Say a command clearly
4. Expected: Command is recognized and executed
5. Check `lisa_command_history` table for logged commands

### Voice Command Troubleshooting

- **No recognition:** Check browser microphone permissions
- **Wrong command:** Speak more slowly and clearly
- **Not responding:** Refresh page and try again
- **Voice feedback:** Enable in Lisa Settings → Voice tab

---

## 5. Complete Feature Checklist

### Lisa AI Companion Features

- [ ] AI chat with conversation memory
- [ ] Voice input/output in chat
- [ ] Context-aware responses based on user profile
- [ ] Personality customization (tone + style)
- [ ] Conversation history persistence
- [ ] Learning system tracks preferences

### Proactive Notification Features

- [ ] Inactivity detection (no posts for 3+ days)
- [ ] Nearby friends with shared interests detection
- [ ] Real-time friend online notifications
- [ ] Location-based announcements
- [ ] Voice announcements for high-priority alerts
- [ ] Toast notifications with action buttons

### Voice Control Features

- [ ] Global voice commands throughout app
- [ ] Navigation commands
- [ ] Action commands (post, search, edit)
- [ ] Social commands (friends, users)
- [ ] Command history logging
- [ ] Learning system adapts to usage

### Personality & Customization

- [ ] 4 personality tones (Casual, Professional, Enthusiastic, Friendly)
- [ ] 3 conversation styles (Concise, Balanced, Detailed)
- [ ] Proactive suggestions toggle
- [ ] Settings persist across sessions
- [ ] Immediate effect on new conversations

---

## 6. Database Verification

Check these tables to verify features are working:

```sql
-- Check personality settings
SELECT 
  display_name,
  lisa_personality_tone,
  lisa_conversation_style,
  lisa_proactive_suggestions
FROM profiles
WHERE user_id = 'YOUR_USER_ID';

-- Check proactive notifications
SELECT * FROM notifications
WHERE user_id = 'YOUR_USER_ID'
AND type = 'lisa_suggestion'
ORDER BY created_at DESC;

-- Check friend online notifications
SELECT * FROM notifications
WHERE user_id = 'YOUR_USER_ID'
AND type = 'friend_online'
ORDER BY created_at DESC;

-- Check voice command history
SELECT 
  command,
  success,
  response,
  created_at
FROM lisa_command_history
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 10;

-- Check learning preferences
SELECT * FROM lisa_learning_preferences
WHERE user_id = 'YOUR_USER_ID';

-- Check activity patterns
SELECT * FROM user_activity_patterns
WHERE user_id = 'YOUR_USER_ID';
```

---

## 7. Troubleshooting Common Issues

### Personality Changes Not Applying

**Problem:** Lisa still responds in old tone
**Solution:**
- Wait 1-2 seconds after saving settings
- Start a new conversation (not in middle of existing)
- Refresh the page
- Check database to confirm settings saved

### No Proactive Notifications

**Problem:** Not receiving suggestions
**Solution:**
- Check "Enable Proactive Suggestions" is ON in settings
- Verify `user_activity_patterns` table has data
- Wait 30 minutes for next analysis cycle
- Check browser console for errors

### Voice Announcements Not Working

**Problem:** No voice when friend comes online
**Solution:**
- Check browser audio permissions
- Verify speech synthesis is supported
- Check browser console for errors
- Test with different browser (Chrome/Edge recommended)

### Real-time Updates Delayed

**Problem:** Slow notification delivery
**Solution:**
- Check internet connection
- Verify Supabase Realtime is enabled for `profiles` table
- Check browser console for subscription errors
- Refresh page to restart real-time connection

---

## 8. Performance Testing

### Load Testing Proactive Notifications

1. Create multiple user accounts
2. Add friendships between accounts
3. Simulate activity patterns for all accounts
4. Monitor notification generation
5. Verify no duplicate notifications
6. Check edge function execution time

### Real-time Subscription Testing

1. Open multiple browser tabs with different accounts
2. Change status in various tabs simultaneously
3. Verify all subscriptions receive updates
4. Check for memory leaks (leave open for extended period)
5. Monitor network traffic in browser DevTools

---

## Next Steps

After testing these features:

1. **Report Issues:** Document any bugs or unexpected behavior
2. **Provide Feedback:** Share user experience observations
3. **Test Edge Cases:** Try unusual scenarios and combinations
4. **Performance Monitoring:** Check app responsiveness with features enabled
5. **Accessibility Testing:** Verify voice features work with screen readers

For additional support, refer to:
- `LISA_USER_GUIDE.md` - Complete Lisa feature documentation
- `APP_DOCUMENTATION.md` - Full app feature guide
- `DESIGN_DIAGRAMS.md` - Visual architecture and flow diagrams
