# Feature Announcement System

## Overview

The Feature Announcement System uses Lisa AI to introduce features to new users through voice announcements when they explore features for the first time. This creates an intuitive, futuristic onboarding experience that feels natural and engaging.

## How It Works

### 1. Database Tracking
- **Table**: `feature_announcements`
- **Purpose**: Tracks which features have been announced to each user
- **Schema**:
  - `user_id`: The user who received the announcement
  - `feature_id`: Unique identifier for the feature
  - `feature_name`: Human-readable feature name
  - `announced_at`: Timestamp of when announcement occurred

### 2. Feature Definitions
All features are defined in `src/data/appFeatures.ts` with an optional `announcement` property:

```typescript
{
  id: 'direct-messages',
  name: 'Direct Messages',
  description: 'Send private messages to friends',
  keywords: ['dm', 'message', 'chat', 'private', 'inbox'],
  category: 'chat',
  location: '/chat',
  icon: 'MessageSquare',
  announcement: 'This is your Direct Messages hub! Send private messages, photos, and videos to your friends. All your conversations are securely stored and synced across devices.'
}
```

### 3. FeatureAnnouncementWrapper Component
This wrapper component handles the logic for announcing features:

```tsx
import { FeatureAnnouncementWrapper } from '@/components/FeatureAnnouncementWrapper';

<FeatureAnnouncementWrapper featureId="direct-messages">
  <YourFeatureComponent />
</FeatureAnnouncementWrapper>
```

**Props:**
- `featureId` (required): Must match the `id` in `appFeatures.ts`
- `customAnnouncement` (optional): Override the default announcement text
- `delay` (optional): Milliseconds to wait before announcing (default: 1500ms)

### 4. Lisa AI Integration
The `LisaAssistant` component listens for `feature-announcement` custom events and:
1. Displays visual feedback with the feature name
2. Speaks the announcement text using text-to-speech
3. Tracks the announcement in analytics
4. Never repeats announcements for the same user

## Implementation Guide

### Step 1: Add Announcement Text to Feature
Edit `src/data/appFeatures.ts`:

```typescript
{
  id: 'my-new-feature',
  name: 'My New Feature',
  description: 'Brief description',
  keywords: ['keyword1', 'keyword2'],
  category: 'profile',
  location: '/profile',
  icon: 'Settings',
  announcement: 'Welcome to My New Feature! Here you can do amazing things. Let me show you around!'
}
```

### Step 2: Wrap Your Feature Component
In your page/component file:

```tsx
import { FeatureAnnouncementWrapper } from '@/components/FeatureAnnouncementWrapper';

const MyFeaturePage = () => {
  return (
    <FeatureAnnouncementWrapper featureId="my-new-feature">
      <div>
        {/* Your feature content */}
      </div>
    </FeatureAnnouncementWrapper>
  );
};
```

### Step 3: Test the Announcement
1. Clear your session storage (or use incognito mode)
2. Navigate to the feature page
3. Lisa will announce the feature after a 1.5 second delay
4. Subsequent visits will not trigger the announcement

## Best Practices

### Writing Effective Announcements

**DO:**
- Keep announcements concise (1-3 sentences)
- Focus on the primary benefit or purpose
- Use welcoming, friendly language
- Mention key actions users can take
- Use present tense and active voice

**DON'T:**
- Write lengthy explanations (save for tutorials)
- Use technical jargon
- Mention implementation details
- Include multiple unrelated points
- Use passive voice or complex sentences

**Examples:**

✅ Good:
```
"Welcome to Direct Messages! Send private messages, photos, and videos to your friends. All your conversations are securely stored and synced across devices."
```

❌ Too Long:
```
"This is the Direct Messages feature which allows you to communicate with your friends through various media types including text messages, image files, video files, and audio recordings. The system implements end-to-end encryption and utilizes a real-time synchronization protocol..."
```

### Placement Guidelines

**Announce at the page/feature level, not for every sub-component:**

✅ Wrap the entire feature page:
```tsx
<FeatureAnnouncementWrapper featureId="huddle">
  <HuddlePage />
</FeatureAnnouncementWrapper>
```

❌ Don't wrap individual buttons or small UI elements:
```tsx
// Don't do this
<FeatureAnnouncementWrapper featureId="like-button">
  <LikeButton />
</FeatureAnnouncementWrapper>
```

### Custom Announcements

Use custom announcements for context-specific situations:

```tsx
<FeatureAnnouncementWrapper 
  featureId="profile-edit"
  customAnnouncement="Welcome back! Let's update your profile information. You can change your photo, bio, and personal details here."
  delay={2000}
>
  <ProfileEditor />
</FeatureAnnouncementWrapper>
```

## Advanced Features

### Analytics Integration
Every announcement is automatically tracked in `feature_analytics`:

```sql
SELECT 
  feature_name,
  COUNT(*) as announcement_count,
  DATE(announced_at) as date
FROM feature_announcements
GROUP BY feature_name, DATE(announced_at)
ORDER BY date DESC;
```

### Manual Triggering
You can manually trigger announcements using the hook:

```tsx
import { useFeatureAnnouncements } from '@/hooks/useFeatureAnnouncements';

const MyComponent = () => {
  const { announceFeature } = useFeatureAnnouncements();

  const handleCustomAction = () => {
    announceFeature(
      'custom-feature',
      'Custom Feature',
      'This is a custom announcement for a specific action!'
    );
  };

  return <button onClick={handleCustomAction}>Trigger Announcement</button>;
};
```

### Checking Announcement Status

```tsx
import { useFeatureAnnouncements } from '@/hooks/useFeatureAnnouncements';

const MyComponent = () => {
  const { hasBeenAnnounced } = useFeatureAnnouncements();

  if (hasBeenAnnounced('my-feature')) {
    // User has already seen this feature
    return <RegularView />;
  } else {
    // First time - maybe show additional hints
    return <FirstTimeView />;
  }
};
```

## Accessibility Considerations

The system is designed with accessibility in mind:

1. **Visual Feedback**: Text displays on screen for hearing-impaired users
2. **No Auto-Play**: Announcements only play after user navigates to a feature
3. **One-Time Only**: Prevents announcement fatigue
4. **Skip-able**: Users can navigate away at any time
5. **Session-Based**: Uses sessionStorage to prevent repetition within the same session

## Troubleshooting

### Announcement Not Playing

1. **Check Lisa Settings**: Ensure Lisa is enabled in user settings
2. **Check Browser Support**: Voice features require modern browsers
3. **Check Feature ID**: Must match exactly between wrapper and appFeatures.ts
4. **Check Console**: Look for Lisa logs indicating why announcement was skipped

### Announcement Repeating

1. **Check Wrapper Placement**: Ensure wrapper is at the page level, not re-rendering
2. **Check useRef**: The wrapper uses `hasAnnounced.current` to prevent duplicates
3. **Clear Database**: In development, you may want to clear feature_announcements table

### Custom Event Not Firing

```javascript
// Debug by listening to the event
window.addEventListener('feature-announcement', (e) => {
  console.log('Feature announcement triggered:', e.detail);
});
```

## Future Enhancements

Potential improvements to the system:

1. **Multi-language Support**: Detect user language and provide localized announcements
2. **Voice Customization**: Let users choose announcement voice/speed
3. **Interactive Tutorials**: Follow announcements with interactive walkthroughs
4. **Smart Timing**: Use ML to determine optimal announcement timing
5. **Announcement Replays**: Let users replay announcements from settings
6. **Grouped Announcements**: Bundle related feature announcements together

## Examples in Codebase

Current implementations:

- **HuddlePage** (`src/pages/HuddlePage.tsx`): Announces Huddle feature
- **ChatPage** (`src/pages/ChatPage.tsx`): Announces Direct Messages
- **AICompanionPage** (`src/pages/AICompanionPage.tsx`): Announces Lisa Assistant

Study these examples to understand best practices for implementation.