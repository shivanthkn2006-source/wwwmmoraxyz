# User Activity Tracking & Backend Logs Guide

## Overview
Your application now tracks comprehensive user activity including sessions, page views, device information, location data, and time spent on each page. All data is securely stored and easily accessible through backend queries.

---

## 🔒 Security Fixes Implemented

### ✅ Fixed Issues:
1. **Notification Constraint** - All notification types now work correctly
2. **JWT Authentication** - All edge functions now require authentication
3. **Activity Tracking** - New secure edge function for logging user activity

### ⚠️ Important: Enable Leaked Password Protection
Go to your backend dashboard and enable "Leaked Password Protection" in authentication settings to prevent users from using compromised passwords.

---

## 📊 What's Being Tracked

### Session Data
- **IP Address** - User's IP for security and analytics
- **Device Info** - Type (mobile/tablet/desktop), vendor, model
- **Browser** - Name and version
- **Operating System** - Name and version
- **Location** - Country, region, city, coordinates, timezone
- **Session Duration** - Start time, end time, total active time

### Page Views
- **Page Path** - URL path visited
- **Page Title** - Title of the page
- **Referrer** - Where user came from
- **Time Spent** - Exact seconds spent on each page
- **Entry/Exit Times** - When user entered and left each page

### User Actions
- Custom events you can log (clicks, interactions, features used)
- Linked to specific sessions and pages

---

## 🗄️ Database Tables

### `user_sessions`
Tracks each login session with full device and location data.

### `page_views`
Records every page visit with timing information.

### `user_activity_log`
Detailed log of all user actions and events.

---

## 📈 Backend Log Queries

### View Recent User Activity
```sql
SELECT * FROM admin_activity_dashboard
ORDER BY created_at DESC
LIMIT 100;
```

This gives you:
- User info (username, display name)
- Activity type and details
- Page visited
- IP address
- Browser, device, OS
- City, country
- Timestamp

### View Active Sessions
```sql
SELECT * FROM session_analytics
WHERE ended_at IS NULL
ORDER BY started_at DESC;
```

### Get User Activity Summary (Last 7 Days)
```sql
SELECT * FROM get_user_activity_summary('USER_ID_HERE', 7);
```

Returns:
- Total sessions
- Total page views
- Total time spent (seconds)
- Unique pages visited
- Most visited page
- Most used device
- Most used browser
- Countries visited

### Track Time Spent on Specific Pages
```sql
SELECT 
  page_path,
  COUNT(*) as visits,
  AVG(duration_seconds) as avg_time_seconds,
  SUM(duration_seconds) as total_time_seconds
FROM page_views
WHERE user_id = 'USER_ID_HERE'
  AND entered_at >= NOW() - INTERVAL '30 days'
GROUP BY page_path
ORDER BY total_time_seconds DESC;
```

### Find Users by Location
```sql
SELECT 
  p.username,
  p.display_name,
  us.city,
  us.country,
  us.ip_address,
  us.started_at
FROM user_sessions us
JOIN profiles p ON us.user_id = p.user_id
WHERE us.city = 'YOUR_CITY_HERE'
  AND us.started_at >= NOW() - INTERVAL '7 days'
ORDER BY us.started_at DESC;
```

### Device & Browser Analytics
```sql
SELECT 
  browser,
  device_type,
  os,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_sessions
FROM user_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY browser, device_type, os
ORDER BY total_sessions DESC;
```

### Most Engaged Users (By Time Spent)
```sql
SELECT 
  p.username,
  p.display_name,
  COUNT(DISTINCT us.id) as session_count,
  SUM(pv.duration_seconds) as total_seconds,
  ROUND(SUM(pv.duration_seconds)::numeric / 3600, 2) as total_hours
FROM user_sessions us
JOIN profiles p ON us.user_id = p.user_id
LEFT JOIN page_views pv ON us.id = pv.session_id
WHERE us.started_at >= NOW() - INTERVAL '30 days'
GROUP BY p.username, p.display_name
ORDER BY total_seconds DESC
LIMIT 20;
```

### Real-Time Active Users
```sql
SELECT 
  p.username,
  p.display_name,
  us.city,
  us.country,
  us.last_activity_at,
  EXTRACT(EPOCH FROM (NOW() - us.last_activity_at)) as seconds_since_last_activity
FROM user_sessions us
JOIN profiles p ON us.user_id = p.user_id
WHERE us.is_active = true
  AND us.last_activity_at >= NOW() - INTERVAL '10 minutes'
ORDER BY us.last_activity_at DESC;
```

---

## 🔍 How to Access Backend Logs

1. **Open Backend Dashboard**
   ```
   Click "View Backend" button in your project settings
   ```

2. **Navigate to SQL Editor**
   - Use the queries above in the SQL editor
   - Results display instantly with full data

3. **Or Query via Code**
   ```typescript
   const { data } = await supabase
     .from('admin_activity_dashboard')
     .select('*')
     .order('created_at', { ascending: false })
     .limit(100);
   ```

---

## 🎯 Common Use Cases

### 1. Identify Inactive Users
Find users who haven't been active in 30 days:
```sql
SELECT DISTINCT ON (p.user_id)
  p.username,
  p.display_name,
  us.last_activity_at,
  EXTRACT(DAY FROM (NOW() - us.last_activity_at)) as days_inactive
FROM profiles p
LEFT JOIN user_sessions us ON p.user_id = us.user_id
WHERE us.last_activity_at < NOW() - INTERVAL '30 days'
ORDER BY p.user_id, us.last_activity_at DESC;
```

### 2. Track Feature Usage
Log custom actions in your components:
```typescript
import { useActivityTracking } from '@/hooks/useActivityTracking';

const MyComponent = () => {
  const { trackUserAction } = useActivityTracking();
  
  const handleFeatureClick = () => {
    trackUserAction('feature_used', {
      feature_name: 'premium_filter',
      feature_category: 'huddle',
    });
  };
};
```

Then query:
```sql
SELECT 
  activity_details->>'feature_name' as feature,
  COUNT(*) as usage_count,
  COUNT(DISTINCT user_id) as unique_users
FROM user_activity_log
WHERE activity_type = 'feature_used'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY activity_details->>'feature_name'
ORDER BY usage_count DESC;
```

### 3. Geographic Analytics
```sql
SELECT 
  country,
  city,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as sessions
FROM user_sessions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY country, city
ORDER BY unique_users DESC;
```

### 4. Session Duration Analysis
```sql
SELECT 
  CASE 
    WHEN session_duration_seconds < 60 THEN 'Under 1 min'
    WHEN session_duration_seconds < 300 THEN '1-5 mins'
    WHEN session_duration_seconds < 900 THEN '5-15 mins'
    WHEN session_duration_seconds < 1800 THEN '15-30 mins'
    ELSE 'Over 30 mins'
  END as duration_bucket,
  COUNT(*) as session_count
FROM session_analytics
WHERE started_at >= NOW() - INTERVAL '7 days'
GROUP BY duration_bucket
ORDER BY MIN(session_duration_seconds);
```

---

## 🔐 Privacy & Security

- **RLS Enabled**: Users can only view their own activity data
- **Service Role Access**: Backend queries use service role for admin access
- **IP Anonymization**: Consider implementing IP anonymization for GDPR compliance
- **Data Retention**: Implement automatic cleanup of old logs if needed

---

## 🚀 Rate Limiting (Recommended Next Step)

While authentication is now enabled on all edge functions, consider implementing rate limiting:

```typescript
// Example rate limit check in edge function
const { data: recentRequests } = await supabase
  .from('user_activity_log')
  .select('id')
  .eq('user_id', userId)
  .eq('activity_type', 'ai_generation')
  .gte('created_at', new Date(Date.now() - 60000).toISOString());

if (recentRequests && recentRequests.length >= 10) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

---

## 📱 Automatic Tracking

The `ActivityTracker` component is already added to your app and automatically tracks:
- ✅ Session starts when user logs in
- ✅ Session ends when user logs out or closes tab
- ✅ Page views on every navigation
- ✅ Time spent calculated on page exit
- ✅ Browser visibility changes (tab switching)
- ✅ Device and location data on first load

**No additional code needed!** Just use the tracking data in your backend queries.

---

## 🎉 You're All Set!

All security issues have been fixed and comprehensive activity tracking is now live. Access your backend logs through the SQL queries above to gain valuable insights into user behavior, engagement, and system usage.
