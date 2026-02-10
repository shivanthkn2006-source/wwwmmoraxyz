# Visual Design Diagrams

This document contains visual diagrams showing the app's architecture, navigation flow, and feature locations.

---

## App Navigation Flow

```mermaid
graph TD
    A[App Start] --> B{User Authenticated?}
    B -->|No| C[Auth Page]
    C --> D[Login/Signup]
    D --> E[Home Page]
    B -->|Yes| E
    
    E --> F[Bottom Navigation]
    F --> G[Home Feed]
    F --> H[Chat]
    F --> I[Huddle]
    F --> J[Camera/Webdrop]
    
    E --> K[Top Bar]
    K --> L[Profile]
    K --> M[Search]
    K --> N[Notifications]
    
    E --> O[Lisa Voice Button]
    O --> P[Voice Commands]
    O --> Q[AI Companion Chat]
    
    L --> R[Profile Settings]
    R --> S[Lisa Settings]
    R --> T[Notification Preferences]
    R --> U[Account Settings]
    
    S --> V[Voice Settings]
    S --> W[Personality Settings]
    S --> X[Advanced Settings]
    S --> Y[Voice Library]
    S --> Z[Language Settings]
```

---

## Page Structure Overview

```mermaid
graph LR
    A[Main Layout] --> B[Header Bar]
    A --> C[Content Area]
    A --> D[Bottom Navigation]
    A --> E[Lisa Floating Button]
    
    B --> B1[Profile Avatar]
    B --> B2[Search Icon]
    B --> B3[Notifications Bell]
    
    C --> C1[Route Content]
    C1 --> C1A[Home Feed]
    C1 --> C1B[Chat Interface]
    C1 --> C1C[Huddle Events]
    C1 --> C1D[Profile View]
    C1 --> C1E[AI Companion]
    
    D --> D1[Home]
    D --> D2[Chat]
    D --> D3[Huddle]
    D --> D4[Camera]
    
    E --> E1[Voice Activation]
    E --> E2[Command Display]
    E --> E3[Waveform Animation]
```

---

## Home Page Layout

```mermaid
graph TB
    subgraph "Home Page Structure"
        A[Top Bar] --> A1[Profile Button]
        A --> A2[Logo/Title]
        A --> A3[Search]
        A --> A4[Notifications]
        
        B[Main Feed] --> B1[Post Creation Card]
        B --> B2[Posts Grid]
        
        B2 --> B2A[Post Card 1]
        B2 --> B2B[Post Card 2]
        B2 --> B2C[Post Card 3]
        
        B2A --> B2A1[User Info]
        B2A --> B2A2[Content]
        B2A --> B2A3[Media]
        B2A --> B2A4[Actions - Like/Comment/Share]
        
        C[Bottom Nav] --> C1[Home Active]
        C --> C2[Chat]
        C --> C3[Huddle]
        C --> C4[Camera]
        
        D[Lisa Voice Button] --> D1[Floating Bottom Right]
    end
```

---

## Profile Page Architecture

```mermaid
graph TB
    subgraph "Profile Page"
        A[Header] --> A1[Back Button]
        A --> A2[Settings Icon]
        
        B[Profile Info] --> B1[Avatar]
        B --> B2[Display Name]
        B --> B3[Username]
        B --> B4[Bio]
        B --> B5[Status Indicator]
        
        C[Action Buttons] --> C1[Edit Profile]
        C --> C2[View Badges]
        C --> C3[Share Profile]
        
        D[Stats Section] --> D1[Posts Count]
        D --> D2[Friends Count]
        D --> D3[Badges Count]
        D --> D4[Points/Tier]
        
        E[Tabs] --> E1[Posts]
        E --> E2[Media]
        E --> E3[Badges]
        
        F[Content Grid] --> F1[User Posts]
        F --> F2[Shared Content]
    end
```

---

## Chat Interface Structure

```mermaid
graph TB
    subgraph "Chat Page"
        A[Header] --> A1[Back to Chat List]
        A --> A2[Friend Name]
        A --> A3[Online Status]
        A --> A4[Options Menu]
        
        B[Message List] --> B1[Date Separator]
        B --> B2[Friend Message]
        B --> B3[User Message]
        B --> B4[Typing Indicator]
        
        B2 --> B2A[Avatar]
        B2 --> B2B[Message Bubble]
        B2 --> B2C[Timestamp]
        B2 --> B2D[Read Receipt]
        
        C[Input Area] --> C1[Emoji Button]
        C --> C2[Text Input]
        C --> C3[Attach Media]
        C --> C4[Voice Message]
        C --> C5[Send Button]
    end
```

---

## Huddle Events System

```mermaid
graph TB
    subgraph "Huddle Page"
        A[Header] --> A1[Title]
        A --> A2[Search Bar]
        A --> A3[Filter Button]
        
        B[Category Tabs] --> B1[Events]
        B --> B2[Sports]
        B --> B3[College]
        B --> B4[Fun]
        
        C[Event Cards] --> C1[Event 1]
        C --> C2[Event 2]
        C --> C3[Event 3]
        
        C1 --> C1A[Event Icon]
        C1 --> C1B[Event Title]
        C1 --> C1C[Date/Time]
        C1 --> C1D[Location]
        C1 --> C1E[Participants Count]
        C1 --> C1F[RSVP Button]
        
        D[Map View Toggle] --> D1[List View]
        D --> D2[Map View]
    end
```

---

## AI Companion Chat Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Lisa Component
    participant Edge Function
    participant AI Model
    participant Database
    
    User->>UI: Open AI Companion
    UI->>Lisa Component: Load Chat Interface
    Lisa Component->>Database: Fetch Conversation History
    Database-->>Lisa Component: Return Messages
    Lisa Component->>UI: Display Chat
    
    User->>UI: Send Message (Text/Voice)
    UI->>Lisa Component: Process Input
    Lisa Component->>Database: Save User Message
    Lisa Component->>Database: Fetch User Profile & Preferences
    Database-->>Lisa Component: Return Context
    Lisa Component->>Edge Function: Send Message + Context
    Edge Function->>AI Model: Generate Response
    AI Model-->>Edge Function: Return AI Response
    Edge Function-->>Lisa Component: Stream Response
    Lisa Component->>Database: Save AI Message
    Lisa Component->>UI: Display Response
    UI->>User: Show Message + Voice Output
```

---

## Lisa Voice Command Processing

```mermaid
flowchart TD
    A[User Says Wake Word] --> B{Wake Word Detected?}
    B -->|Yes| C[Activate Listening]
    B -->|No| A
    
    C --> D[Show Visual Feedback]
    D --> E[Capture Voice Input]
    E --> F[Speech to Text]
    
    F --> G{Command Recognized?}
    G -->|Yes| H[Parse Command]
    G -->|No| I[Show Error]
    
    H --> J{Command Type?}
    J -->|Navigation| K[Navigate to Page]
    J -->|Action| L[Execute Action]
    J -->|Query| M[Query Database]
    J -->|AI Request| N[Call AI Companion]
    
    K --> O[Update UI]
    L --> O
    M --> O
    N --> P[Generate AI Response]
    P --> O
    
    O --> Q[Log Command History]
    Q --> R[Update Learning System]
    R --> S[Voice Feedback]
    S --> T[Return to Idle]
```

---

## Notification System Architecture

```mermaid
graph TB
    subgraph "Notification Generation"
        A[Event Occurs] --> B{Event Type?}
        B -->|Social| C[Social Notification]
        B -->|System| D[System Notification]
        B -->|Lisa Proactive| E[AI Suggestion]
        
        C --> F[Create Notification Record]
        D --> F
        E --> G[Analyze User Behavior]
        G --> F
        
        F --> H[Set Priority Level]
        H --> I[Store in Database]
    end
    
    subgraph "Notification Delivery"
        I --> J[Real-time Listener]
        J --> K{User Preferences?}
        K -->|Desktop Enabled| L[Browser Notification]
        K -->|Voice Enabled| M[Lisa Voice Alert]
        K -->|Visual Only| N[In-App Badge]
        
        L --> O[Show Desktop Alert]
        M --> P[Speak Notification]
        N --> Q[Update Bell Icon]
        
        O --> R[User Interaction]
        P --> R
        Q --> R
    end
```

---

## Gamification System Flow

```mermaid
graph LR
    subgraph "Activity Tracking"
        A[User Action] --> B[Track Activity]
        B --> C[Update Stats]
        C --> D{Milestone Reached?}
    end
    
    subgraph "Badge System"
        D -->|Yes| E[Award Badge]
        E --> F[Update Badge Collection]
        F --> G[Check Collection Complete]
        G -->|Yes| H[Award Bonus Badge]
        G -->|No| I[Continue]
    end
    
    subgraph "Points & Tiers"
        E --> J[Add Points]
        H --> J
        J --> K[Calculate Total Points]
        K --> L{Tier Upgrade?}
        L -->|Yes| M[Update Tier]
        L -->|No| N[Continue]
        M --> O[Notify User]
    end
    
    subgraph "Challenges"
        B --> P[Update Challenge Progress]
        P --> Q{Challenge Complete?}
        Q -->|Yes| R[Award Challenge Points]
        R --> J
    end
```

---

## Database Schema Overview

```mermaid
erDiagram
    PROFILES ||--o{ POSTS : creates
    PROFILES ||--o{ MESSAGES : sends
    PROFILES ||--o{ FRIENDSHIPS : has
    PROFILES ||--o{ USER_BADGES : earns
    PROFILES ||--|| LISA_SETTINGS : configures
    PROFILES ||--|| LISA_LEARNING_PREFERENCES : has
    PROFILES ||--|| USER_ACTIVITY_PATTERNS : tracks
    
    POSTS ||--o{ POST_COMMENTS : has
    POSTS ||--o{ POST_LIKES : receives
    POSTS ||--o{ POST_TAGS : contains
    
    POST_COMMENTS ||--o{ COMMENT_LIKES : receives
    
    NOTIFICATIONS ||--o| PROFILES : notifies
    NOTIFICATIONS }o--|| POSTS : references
    NOTIFICATIONS }o--|| POST_COMMENTS : references
    
    USER_BADGES ||--|| BADGE_CHALLENGES : completes
    USER_BADGES ||--|| BADGE_COLLECTIONS : part_of
    
    REMINDERS ||--|| PROFILES : belongs_to
    EMOTION_LOGS ||--|| PROFILES : tracks
    
    LISA_COMMAND_HISTORY ||--|| PROFILES : logs
    AI_COMPANION_MESSAGES ||--|| PROFILES : stores
    
    PROFILES {
        uuid user_id PK
        text display_name
        text username
        text bio
        text city
        array hobbies
        text status
        text lisa_personality_tone
        text lisa_conversation_style
        boolean lisa_proactive_suggestions
    }
    
    USER_ACTIVITY_PATTERNS {
        uuid id PK
        uuid user_id FK
        timestamp last_post_date
        integer average_posts_per_week
        timestamp last_login_date
        jsonb nearby_friends_notified
    }
    
    LISA_SETTINGS {
        uuid id PK
        uuid user_id FK
        text wake_word
        text voice
        text voice_mode
        boolean offline_mode_enabled
    }
    
    LISA_LEARNING_PREFERENCES {
        uuid id PK
        uuid user_id FK
        boolean learning_enabled
        jsonb command_preferences
        jsonb response_patterns
        jsonb interaction_stats
    }
```

---

## Feature Location Map

```mermaid
mindmap
    root((App))
        Home
            Feed
                Posts Grid
                Create Post
                Like/Comment
            Lisa Voice
                Voice Commands
                AI Chat
        Profile
            User Info
                Edit Profile
                Status
            Stats
                Posts
                Friends
                Badges
            Settings
                Lisa Settings
                    Voice
                    Personality
                    Advanced
                    Library
                    Language
                Notifications
                Account
        Chat
            Conversations
                Message List
                Real-time
            Input
                Text
                Media
                Voice
        Huddle
            Events
                Categories
                Search
                RSVP
            Map
                Nearby
                Navigation
        Features
            Gamification
                Badges
                Challenges
                Leaderboard
                Points/Tiers
            Search
                Users
                Posts
                Saved
                Trending
            Notifications
                Social
                System
                Lisa Proactive
                Desktop Push
```

---

## Lisa AI Integration Points

```mermaid
graph TB
    subgraph "Frontend Components"
        A[LisaAssistant] --> B[Voice Control]
        A --> C[Chat Interface]
        A --> D[Command Parser]
        
        E[LisaVoiceControl] --> F[Floating Button]
        E --> G[Command Display]
        
        H[LisaSettings] --> I[Configuration UI]
        H --> J[Personality Settings]
    end
    
    subgraph "Backend Services"
        K[lisa-chat Edge Function] --> L[AI Model Gateway]
        M[lisa-notification-analyzer] --> N[Behavior Analysis]
        
        L --> O[Lovable AI]
        O --> P[Google Gemini]
        O --> Q[OpenAI GPT]
    end
    
    subgraph "Data Layer"
        R[lisa_settings Table]
        S[lisa_learning_preferences]
        T[lisa_command_history]
        U[user_activity_patterns]
        V[ai_companion_messages]
    end
    
    A --> K
    E --> D
    D --> K
    K --> R
    K --> S
    K --> V
    
    M --> U
    M --> R
    N --> W[Notification Creation]
    
    B --> T
    C --> V
```

---

## Real-time Data Flow

```mermaid
sequenceDiagram
    participant User1
    participant Client1
    participant Supabase
    participant Client2
    participant User2
    
    User1->>Client1: Perform Action (Post/Message/Status)
    Client1->>Supabase: Insert/Update Record
    Supabase->>Supabase: Trigger Database Events
    Supabase->>Supabase: Execute Triggers
    Supabase->>Supabase: Create Notifications
    
    Supabase-->>Client2: Real-time Update (Postgres Changes)
    Client2->>Client2: Update UI
    Client2->>User2: Show Notification
    
    alt Voice Notifications Enabled
        Client2->>Client2: Generate Voice Alert
        Client2->>User2: Speak Notification
    end
    
    alt Desktop Notifications Enabled
        Client2->>Browser: Create Desktop Notification
        Browser->>User2: Show System Notification
    end
```

---

## Mobile vs Desktop Layout

```mermaid
graph TB
    subgraph "Mobile Layout - 320-768px"
        M1[Single Column]
        M2[Bottom Navigation]
        M3[Hamburger Menu]
        M4[Collapsed Sidebar]
        M5[Full Width Content]
        M6[Stacked Cards]
    end
    
    subgraph "Tablet Layout - 769-1024px"
        T1[Two Column Grid]
        T2[Bottom Navigation]
        T3[Expanded Sidebar]
        T4[Wider Content]
        T5[Side-by-Side Cards]
    end
    
    subgraph "Desktop Layout - 1025px+"
        D1[Three Column Grid]
        D2[Left Sidebar]
        D3[Center Content]
        D4[Right Sidebar]
        D5[Full Navigation Bar]
        D6[Multi-Column Cards]
    end
    
    A[Responsive Design System] --> M1
    A --> T1
    A --> D1
```

---

## Security & Privacy Architecture

```mermaid
graph TB
    subgraph "Authentication Layer"
        A[User Login] --> B[Supabase Auth]
        B --> C[JWT Token]
        C --> D[RLS Policies]
    end
    
    subgraph "Data Access Control"
        D --> E{Check User Access}
        E -->|Own Data| F[Full Access]
        E -->|Friend Data| G[Limited Access]
        E -->|Public Data| H[Read Only]
        E -->|No Access| I[Deny]
    end
    
    subgraph "Privacy Settings"
        J[Profile Visibility] --> J1[Public]
        J --> J2[Friends Only]
        J --> J3[Private]
        
        K[Data Sharing] --> K1[Lisa Learning]
        K --> K2[Proactive Suggestions]
        K --> K3[Voice History]
    end
    
    subgraph "Encryption"
        L[Messages] --> M[End-to-End Encrypted]
        N[Lisa Data] --> O[User-Isolated]
        P[Voice Commands] --> Q[Processed Real-time]
    end
    
    F --> R[Database]
    G --> R
    H --> R
    M --> R
    O --> R
```

---

## Performance Optimization Strategy

```mermaid
graph LR
    subgraph "Frontend Optimization"
        A[Code Splitting] --> A1[Route-based]
        A --> A2[Component Lazy Load]
        
        B[Caching] --> B1[Service Worker]
        B --> B2[IndexedDB]
        B --> B3[Memory Cache]
        
        C[Asset Optimization] --> C1[Image Compression]
        C --> C2[Media Lazy Load]
        C --> C3[Bundle Minification]
    end
    
    subgraph "Backend Optimization"
        D[Database] --> D1[Indexed Queries]
        D --> D2[Connection Pooling]
        D --> D3[Query Optimization]
        
        E[Edge Functions] --> E1[Cold Start Reduction]
        E --> E2[Response Caching]
        E --> E3[Streaming]
        
        F[CDN] --> F1[Static Assets]
        F --> F2[Global Distribution]
    end
    
    subgraph "Real-time Optimization"
        G[Supabase Realtime] --> G1[Selective Subscriptions]
        G --> G2[Debounced Updates]
        G --> G3[Batch Processing]
    end
```

---

*These diagrams provide a comprehensive visual overview of the app's architecture, navigation flow, and feature locations. Use them as a reference for understanding how different parts of the system work together.*