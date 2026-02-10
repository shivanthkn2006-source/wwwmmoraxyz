# Advanced Search Features Documentation

## Overview
The search system provides powerful capabilities for discovering users, posts, and features with intelligent ranking, filtering, and organization tools.

## Core Features

### 1. **Intelligent Ranking Algorithm**
Search results are automatically ranked using a sophisticated scoring system that considers:

- **Relevance Score** (50% weight): How closely the result matches your search query
  - Exact matches score highest
  - Partial matches in names, usernames, or content
  - Multiple occurrence boost

- **Engagement Score** (30% weight): User interaction metrics
  - Likes count (2x multiplier)
  - Comments count (5x multiplier)
  - Capped at 100 points maximum

- **Recency Score** (20% weight): How fresh the content is
  - Last 24 hours: 100 points
  - Last week: 80 points
  - Last month: 50 points
  - Older: 20 points

### 2. **Search History**
- Automatically tracks all your searches
- Persistent storage in database
- Quick access to previous searches
- Shows up to 10 most recent queries
- One-click to re-execute a search
- Clear all history option

### 3. **Saved Searches**
Create bookmarks for frequently used searches:
- **Save current search**: Give it a custom name
- **Include filters**: Saved searches remember your filter settings
- **Quick access**: Click any saved search to instantly re-run it
- **Last used tracking**: See when you last used each saved search
- **Delete option**: Remove saved searches you no longer need

### 4. **Trending Searches**
Discover what others are searching for:
- **Real-time data**: Updates every 5 minutes
- **24-hour window**: Shows searches from the last day
- **Top 10 ranking**: See the most popular queries
- **Visual indicators**: 
  - 🔥 Red flame for #1
  - 🔥 Orange flame for #2
  - 🔥 Yellow flame for #3
- **Metrics displayed**:
  - Total search count
  - Unique users count
- **"Hot" badge**: Top 3 searches marked as hot

### 5. **Advanced Filters**

#### Date Range Filter
Filter posts by when they were created:
- All Time (default)
- Today
- Past Week
- Past Month
- Past Year

#### Location Filter
Find users and content from specific cities:
- Dropdown of all available locations
- Filters both user profiles and post authors
- "All Locations" option to clear filter

#### Post Type Filter
Search for specific content types:
- All Types (default)
- Text Only (posts without media)
- Images (posts with image media)
- Videos (posts with video media)

#### Filter Indicators
- Active filter button shows highlighted state
- Filter icon displays dot indicator when filters are active
- "Reset" button to clear all filters at once

### 6. **Smart Suggestions**
As you type (1-2 characters):
- Shows your recent search history
- Displays matching feature names
- Maximum 8 suggestions shown
- Click any suggestion to auto-fill search

### 7. **Sorting Options**
Choose how to order your results:

#### Relevance (Default)
- Uses the ranking algorithm's total score
- Best for finding most relevant matches
- Considers text match + engagement + recency

#### Date
- Newest results first
- Perfect for finding latest content
- Ignores relevance and engagement

#### Popularity
- Based on total engagement (likes + comments)
- Best for finding trending or viral content
- Useful for discovering popular posts

### 8. **Pagination**
Handle large result sets efficiently:
- **10 results per page** (default)
- Navigation controls:
  - "Previous" button (disabled on first page)
  - Page indicator ("Page X of Y")
  - "Next" button (disabled on last page)
- Maintains your position when switching tabs or changing sort order
- Page resets to 1 when changing search query or filters

### 9. **Search Analytics Dashboard**
- **Overview metrics**: Total searches, unique queries, average per day
- **Daily Activity**: Visual bar chart of last 7 days
- **Weekly Trends**: Search volume by week for last 4 weeks
- **Top Searches**: Most frequently searched terms with counts
- **Recent Searches**: Latest unique queries with timestamps
- **Refresh capability**: Update data on demand

### 10. **Voice Search by Lisa AI**
- **Hands-free searching** using Lisa AI voice assistant
- Click microphone button to start listening
- Say natural phrases like "search for users in Mumbai"
- Lisa processes voice and executes search automatically
- Visual indicator when listening (pulsing red microphone)
- Cancel anytime by clicking again
- Works with all existing search features

# Search Features Documentation Update

## Voice Search by Lisa AI

**New Feature Added:** Complete voice search integration with Lisa AI across the entire platform.

### Global Availability
- Lisa AI is now available on **ALL pages** except the authentication page
- Voice search works from any screen - home, profile, chat, camera, etc.
- No need to navigate to a specific page to use voice search

### Voice Commands
Say any of these commands after the wake word "Hi Lisa":

**Basic Search:**
- "search for [query]" - General search across users, posts, and features
- "find [query]" - Same as search
- "look for [query]" - Same as search
- "look up [query]" - Same as search

**Targeted Search:**
- "search for [query] in posts" - Search only posts
- "find [query] in users" - Search only users
- "look for [query] in features" - Search only features
- "search for [query] in people" - Search only users

**Search Management:**
- "open search" - Opens the search overlay
- "show search" - Opens the search overlay
- "activate search" - Opens the search overlay

### Examples
- "Hi Lisa, search for technology posts"
- "Hi Lisa, find users in Mumbai"
- "Hi Lisa, look for voice features"
- "Hi Lisa, search for cooking"
- "Hi Lisa, open search"

### Greeting & Introduction
- When Lisa greets you on page load, she will introduce the voice search capability
- The greeting happens once per day and mentions:
  - Weather and traffic information
  - Upcoming events
  - **Voice search availability**
  - How to use voice commands

### Integration with Search Analytics
- All voice searches are tracked in the analytics dashboard
- Marked with "voice" as the access method
- Helps you see how often you use voice vs. manual search

### How It Works
1. **Say the wake word**: "Hi Lisa"
2. **Give your command**: "search for [what you want]"
3. **Lisa responds**: Confirms what she's searching for
4. **Search executes**: Automatically opens search and shows results
5. **Results displayed**: All matching users, posts, and features shown

### Features
- **Automatic navigation**: If you're not on the home page, Lisa navigates you there
- **Smart type detection**: Automatically filters by posts/users/features if mentioned
- **Feedback**: Lisa speaks what she's doing and shows visual feedback
- **Tracking**: All searches logged for your analytics
- **Works everywhere**: Use from any page in the app

### Advantages Over Manual Search
- **Hands-free**: No need to type, perfect while multitasking
- **Fast**: Speak faster than you type
- **Natural**: Use conversational language
- **Accessible**: Great for users with typing difficulties
- **Efficient**: No need to navigate to search first

### Integration Points
- **HomePage**: Fully integrated with greeting and all voice commands
- **SearchBar**: Receives voice commands and executes searches
- **Analytics**: Tracks voice search usage separately
- **Lisa Context**: Maintains conversation context for follow-ups

Lisa is now your complete voice assistant for discovering content across the platform!
- **Instant feedback**: Loading indicator during search
- **Live results**: Updates as you type
- **Empty state messages**: Helpful feedback when no results found

## Search Result Types

### Users
- **Display**: Avatar with status indicator and event glow
- **Information shown**:
  - Display name
  - Username (@handle)
  - Profile photo
  - Status badge (if set)
  - Event glow (for birthdays/anniversaries)
- **Action**: Click to view user profile

### Posts
- **Display**: Large thumbnail for media posts, icon for text
- **Information shown**:
  - Post content (up to 2 lines)
  - Media preview (16x16 rounded thumbnail)
  - "Tap to view full post" hint
- **Action**: Click to open post detail modal with full interaction capabilities

### Features
- **Display**: Icon with category badge
- **Information shown**:
  - Feature icon in gradient container
  - Feature name
  - Category badge (e.g., "Social", "Content")
  - Description (truncated to 1 line)
- **Action**: 
  - Navigates to feature location
  - Triggers LISA explanation
  - Tracks analytics

## User Interface

### Search Bar Location
- **Bottom Navigation**: Tap search icon to open
- **Full-screen modal**: Overlays entire screen for focused searching
- **Keyboard aware**: Adjusts height when keyboard is visible

### Header Components
- **Title**: "Search"
- **Close button**: X icon to dismiss search
- **Action buttons row**:
  - Saved Searches (bookmark icon)
  - Trending Searches (trending up icon)
  - Advanced Filters (sliders icon)

### Input Section
- **Search field**: With search icon and clear button
- **Suggestions dropdown**: Appears below input when typing
- **Filter pills row**: Quick access to category filters
- **Sort dropdown**: Appears when results are present

### Results Area
- **Scrollable list**: Max height with overflow scroll
- **Loading state**: Animated search icon with message
- **Empty state**: Icon and helpful message
- **History section**: Shows when no query entered
- **Recommendations**: LISA's feature suggestions

### Pagination Footer
- **Only visible**: When results span multiple pages
- **Controls**: Previous/Next buttons with page indicator
- **Disabled states**: Grayed out at boundaries

## Best Practices

### For Users
1. **Use saved searches** for queries you run frequently
2. **Check trending** to discover what others are interested in
3. **Combine filters** for more specific results
4. **Try different sort orders** to find what you need faster
5. **Use suggestions** to speed up typing

### For Optimal Results
- **Be specific**: More detailed queries yield better matches
- **Use filters**: Narrow down large result sets
- **Check history**: You might have searched for this before
- **Explore trending**: Discover popular content and users

## Technical Details

### Performance
- **Debounced queries**: Prevents excessive API calls
- **Indexed searches**: Database indexes on key fields
- **Cached history**: Loads once per session
- **Pagination**: Reduces data transfer for large results

### Privacy
- **Private history**: Only you can see your search history
- **Secure storage**: All data encrypted in database
- **RLS policies**: Row-level security enforced
- **No public tracking**: Individual searches not exposed

### Analytics
- **Feature tracking**: Records when features found via search
- **Anonymized trends**: Trending data shows aggregated counts only
- **Access method**: "search" recorded as access method
- **No PII**: Personal information not included in analytics

## Future Enhancements

### Planned Features
- Voice search capability
- Search within specific date ranges
- Export search results
- Search analytics dashboard
- Boolean operators (AND, OR, NOT)
- Wildcard search patterns
- Saved search sharing
- Search notifications

### Upcoming Improvements
- Machine learning ranking
- Personalized relevance
- Collaborative filtering
- Semantic search
- Auto-complete from corpus
- Synonym expansion
- Typo correction

## Troubleshooting

### Common Issues

**Search not returning results**
- Check spelling
- Remove or adjust filters
- Try broader terms
- Check date range filter

**Results seem irrelevant**
- Try different sort order
- Use more specific terms
- Add additional filters
- Check for typos

**Saved search not working**
- Ensure you gave it a name
- Check if filters are correctly saved
- Try creating it again

**Pagination not showing**
- Need more than 10 results
- Check if filters reducing result count

## Support
For additional help with search features, consult the User Manual or contact support.
