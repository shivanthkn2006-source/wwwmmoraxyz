# SELFIE CITY SPECIFICATION
## Location-Based Social Commerce Platform

---

**Version:** 1.0  
**Classification:** TECHNICAL/BUSINESS  
**Date:** January 5, 2026

---

## EXECUTIVE SUMMARY

Selfie City is a location-based social network that inverts the attention economy. Instead of extracting value from users, it rewards them for authentic content creation at physical locations. Brands pay to sponsor locations; users earn for visiting and engaging.

---

## 1. CORE CONCEPT

### 1.1 The Value Proposition

```
┌─────────────────────────────────────────────────────────────┐
│                  TRADITIONAL SOCIAL MEDIA                    │
│                                                             │
│  User Creates Content ──▶ Platform Profits ──▶ User Gets 0  │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      SELFIE CITY                            │
│                                                             │
│  User Creates Content ──▶ Brand Pays ──▶ User Earns 70%    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| **Live Selfie Map** | Real-time map showing user activity |
| **Geofenced Campaigns** | Brand-sponsored locations with rewards |
| **Authenticity Verification** | AI-powered content validation |
| **Karma System** | Reputation score for quality contributions |
| **Creator Economy** | Direct payments to users |

---

## 2. DATA MODELS

### 2.1 Selfie City Pin

```typescript
interface SelfieCityPin {
  id: string;
  userId: string;
  
  // Location
  latitude: number;
  longitude: number;
  locationName: string;
  
  // Content
  imageUrl: string;
  caption: string | null;
  tags: string[];
  
  // Verification
  isVerified: boolean;
  verifiedAt: Date | null;
  verificationMethod: 'ai' | 'manual' | 'blockchain';
  authenticityScore: number;          // 0-100
  
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  views: number;
  
  // Rewards
  campaignId: string | null;
  rewardsEarned: number;
  rewardsCurrency: 'credits' | 'cash' | 'product';
  
  // Meta
  visibility: 'public' | 'friends' | 'private';
  expiresAt: Date | null;             // For ephemeral pins
  createdAt: Date;
}
```

### 2.2 Brand Campaign

```typescript
interface BrandCampaign {
  id: string;
  
  // Brand Info
  brandAccountId: string;
  merchantUserId: string;
  campaignName: string;
  description: string | null;
  
  // Location
  geofenceCenterLat: number;
  geofenceCenterLng: number;
  geofenceRadiusMeters: number;
  
  // Timing
  startTime: Date;
  endTime: Date;
  status: 'draft' | 'active' | 'paused' | 'completed';
  
  // Budget
  budgetTotal: number;
  budgetSpent: number;
  currency: 'USD' | 'INR' | 'SGD';
  
  // Rewards
  rewardType: 'cash' | 'credits' | 'product' | 'discount';
  rewardAmount: number;
  maxClaims: number;
  currentClaims: number;
  
  // Targeting
  targetTags: string[];
  targetUserTiers: UserTier[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2.3 Campaign Claim

```typescript
interface CampaignClaim {
  id: string;
  campaignId: string;
  userId: string;
  pinId: string | null;
  
  // Verification
  status: 'pending' | 'verified' | 'rejected' | 'paid';
  verifiedAt: Date | null;
  
  // Payment
  rewardEarned: number;
  paidAt: Date | null;
  paymentMethod: string | null;
  
  createdAt: Date;
}
```

---

## 3. AUTHENTICITY VERIFICATION

### 3.1 Multi-Layer Verification

```
┌─────────────────────────────────────────────────────────────┐
│                AUTHENTICITY VERIFICATION                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  LAYER 1: METADATA ANALYSIS                                 │
│  ├── EXIF data verification                                 │
│  ├── GPS coordinates matching                               │
│  ├── Timestamp validation                                   │
│  └── Device fingerprint check                               │
│                                                             │
│  LAYER 2: IMAGE ANALYSIS                                    │
│  ├── AI deepfake detection                                  │
│  ├── Location landmark recognition                          │
│  ├── Manipulation artifact detection                        │
│  └── Stock photo matching                                   │
│                                                             │
│  LAYER 3: BEHAVIORAL ANALYSIS                               │
│  ├── User posting patterns                                  │
│  ├── Travel plausibility                                    │
│  ├── Historical accuracy                                    │
│  └── Social graph verification                              │
│                                                             │
│  LAYER 4: BLOCKCHAIN ATTESTATION (Optional)                 │
│  ├── Hash timestamp                                         │
│  ├── Immutable record                                       │
│  └── Third-party verification                               │
│                                                             │
│  OUTPUT: Authenticity Score (0-100)                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Verification API

```typescript
interface VerificationRequest {
  pinId: string;
  imageUrl: string;
  claimedLocation: {
    latitude: number;
    longitude: number;
  };
  metadata: ImageMetadata;
  userId: string;
}

interface VerificationResult {
  isAuthentic: boolean;
  score: number;                      // 0-100
  confidence: number;                 // 0-100
  
  checks: {
    metadataValid: boolean;
    gpsMatches: boolean;
    noManipulation: boolean;
    notStockPhoto: boolean;
    behaviorNormal: boolean;
  };
  
  flags: string[];                    // Any concerns
  recommendation: 'approve' | 'review' | 'reject';
}
```

---

## 4. KARMA SYSTEM

### 4.1 Karma Points Structure

```typescript
interface UserKarma {
  userId: string;
  
  // Scores
  totalKarma: number;
  monthlyKarma: number;
  
  // Breakdown
  contentScore: number;               // Quality of posts
  engagementScore: number;            // Interactions received
  helpfulnessScore: number;           // Value to community
  consistencyScore: number;           // Regular participation
  authenticityScore: number;          // Verification rate
  
  // Tier
  currentTier: KarmaTier;
  nextTierThreshold: number;
  tierHistory: TierChange[];
  
  // Privileges
  privileges: KarmaPrivilege[];
}

type KarmaTier = 
  | 'newcomer'      // 0-100
  | 'explorer'      // 101-500
  | 'contributor'   // 501-2000
  | 'influencer'    // 2001-10000
  | 'ambassador'    // 10001-50000
  | 'legend';       // 50001+

interface KarmaPrivilege {
  name: string;
  description: string;
  requiredTier: KarmaTier;
  isActive: boolean;
}
```

### 4.2 Karma Earning

| Action | Karma Points |
|--------|-------------|
| Post verified selfie | +10 |
| Receive like | +1 |
| Receive comment | +2 |
| Post featured | +50 |
| Complete campaign | +25 |
| Refer new user | +100 |
| Daily login streak | +5 per day |
| Help new user | +15 |
| Report fraudulent content | +20 |

### 4.3 Tier Benefits

| Tier | Reward Multiplier | Features |
|------|-------------------|----------|
| Newcomer | 1.0x | Basic features |
| Explorer | 1.1x | Priority support |
| Contributor | 1.25x | Early campaign access |
| Influencer | 1.5x | Analytics dashboard |
| Ambassador | 2.0x | Brand partnerships |
| Legend | 3.0x | Revenue share, verification badge |

---

## 5. BRAND TOOLS

### 5.1 Campaign Builder

```typescript
interface CampaignBuilder {
  // Basic Info
  setBasicInfo(name: string, description: string): void;
  
  // Location
  setGeofence(center: LatLng, radiusMeters: number): void;
  setMultipleLocations(locations: Geofence[]): void;
  
  // Timing
  setDuration(start: Date, end: Date): void;
  setRecurring(schedule: RecurringSchedule): void;
  
  // Budget
  setBudget(total: number, currency: Currency): void;
  setDailyLimit(limit: number): void;
  
  // Rewards
  setReward(type: RewardType, amount: number): void;
  setTieredRewards(tiers: RewardTier[]): void;
  
  // Targeting
  setUserTiers(tiers: KarmaTier[]): void;
  setTags(tags: string[]): void;
  setDemographics(demographics: Demographics): void;
  
  // Creative
  setLandingPage(content: CampaignLanding): void;
  setInstructions(instructions: string): void;
  
  // Launch
  preview(): CampaignPreview;
  launch(): Promise<Campaign>;
}
```

### 5.2 Analytics Dashboard

```typescript
interface CampaignAnalytics {
  campaignId: string;
  
  // Overview
  totalImpressions: number;
  totalClaims: number;
  conversionRate: number;
  budgetUtilization: number;
  
  // Engagement
  avgEngagementRate: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  
  // Demographics
  userTierBreakdown: Record<KarmaTier, number>;
  ageBreakdown: Record<string, number>;
  genderBreakdown: Record<string, number>;
  
  // Performance Over Time
  dailyMetrics: DailyMetric[];
  
  // Content
  topPerformingPins: PinSummary[];
  contentThemes: ThemeAnalysis[];
  
  // ROI
  costPerClaim: number;
  estimatedReach: number;
  brandMentions: number;
}
```

---

## 6. REVENUE MODEL

### 6.1 Revenue Split

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE DISTRIBUTION                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Brand Pays: $100                                           │
│                                                             │
│  ├── User Reward: $70 (70%)                                │
│  │   └── Direct payment to content creator                 │
│  │                                                          │
│  ├── Platform Fee: $20 (20%)                               │
│  │   └── Operations, infrastructure, AI                    │
│  │                                                          │
│  └── Community Fund: $10 (10%)                             │
│      └── New creator support, challenges, grants           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 Monetization Streams

| Stream | Description | % of Revenue |
|--------|-------------|--------------|
| Campaign Fees | Brand campaign spending | 60% |
| Premium Features | Advanced analytics, targeting | 20% |
| Verification Services | Enterprise content verification | 10% |
| API Access | Third-party integrations | 5% |
| Marketplace | User-to-user transactions | 5% |

---

## 7. TECHNICAL ARCHITECTURE

### 7.1 Map Infrastructure

```typescript
interface MapConfig {
  // Provider
  provider: 'mapbox' | 'leaflet' | 'google';
  
  // Layers
  layers: {
    base: 'streets' | 'satellite' | 'dark';
    pins: boolean;
    heatmap: boolean;
    campaigns: boolean;
    zones: boolean;
  };
  
  // Real-time
  realtime: {
    enabled: boolean;
    refreshInterval: number;          // ms
    maxPinsVisible: number;
  };
  
  // Clustering
  clustering: {
    enabled: boolean;
    minZoom: number;
    radius: number;
  };
}
```

### 7.2 Geofencing

```typescript
class GeofenceEngine {
  // Check if point is inside geofence
  static isInsideGeofence(
    point: LatLng, 
    fence: Geofence
  ): boolean;
  
  // Calculate distance to geofence center
  static distanceToCenter(
    point: LatLng, 
    fence: Geofence
  ): number;
  
  // Find nearby campaigns
  static findNearbyCampaigns(
    point: LatLng, 
    radiusMeters: number
  ): Promise<Campaign[]>;
  
  // Watch for geofence entry/exit
  static watchGeofence(
    fence: Geofence,
    onEnter: () => void,
    onExit: () => void
  ): GeofenceWatcher;
}

interface Geofence {
  id: string;
  center: LatLng;
  radiusMeters: number;
  type: 'circle' | 'polygon';
  polygon?: LatLng[];              // For complex shapes
}
```

---

## 8. USER FLOWS

### 8.1 Content Creation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  CONTENT CREATION FLOW                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. USER OPENS CAMERA                                       │
│     └── Location detected                                   │
│     └── Nearby campaigns highlighted                        │
│                                                             │
│  2. USER TAKES SELFIE                                       │
│     └── Image captured                                      │
│     └── Metadata embedded                                   │
│     └── Location tagged                                     │
│                                                             │
│  3. ADD DETAILS                                             │
│     └── Caption (optional)                                  │
│     └── Tags (suggested)                                    │
│     └── Campaign link (if applicable)                       │
│                                                             │
│  4. SUBMIT                                                  │
│     └── Verification queue                                  │
│     └── Authenticity analysis                               │
│     └── Spam check                                          │
│                                                             │
│  5. VERIFICATION (Async)                                    │
│     └── AI analysis                                         │
│     └── Score calculation                                   │
│     └── Approval/rejection                                  │
│                                                             │
│  6. REWARD (If campaign)                                    │
│     └── Claim created                                       │
│     └── Verification confirmed                              │
│     └── Credits/cash distributed                            │
│                                                             │
│  7. LIVE ON MAP                                             │
│     └── Pin visible                                         │
│     └── Engagement tracked                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Brand Campaign Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   BRAND CAMPAIGN FLOW                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. BRAND REGISTERS                                         │
│     └── Account verification                                │
│     └── Payment method setup                                │
│     └── Brand profile creation                              │
│                                                             │
│  2. CREATE CAMPAIGN                                         │
│     └── Set location(s)                                     │
│     └── Define reward structure                             │
│     └── Set budget and duration                             │
│     └── Configure targeting                                 │
│                                                             │
│  3. REVIEW & LAUNCH                                         │
│     └── Preview campaign                                    │
│     └── Confirm budget hold                                 │
│     └── Activate campaign                                   │
│                                                             │
│  4. CAMPAIGN LIVE                                           │
│     └── Users see geofence on map                          │
│     └── Proximity notifications sent                        │
│     └── Real-time analytics available                       │
│                                                             │
│  5. CONTENT MODERATION                                      │
│     └── Auto-verification                                   │
│     └── Brand review (optional)                             │
│     └── Approval/rejection                                  │
│                                                             │
│  6. PAYMENT PROCESSING                                      │
│     └── Verified claims aggregated                          │
│     └── User payments distributed                           │
│     └── Platform fee collected                              │
│                                                             │
│  7. CAMPAIGN COMPLETION                                     │
│     └── Final analytics report                              │
│     └── Content library access                              │
│     └── ROI summary                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 9. DIVINE NOTIFICATIONS

### 9.1 Proximity-Based Alerts

```typescript
interface DivineNotification {
  id: string;
  userId: string;
  
  // Type
  notificationType: 'campaign' | 'deal' | 'social' | 'achievement';
  
  // Content
  title: string;
  message: string;
  brandName: string | null;
  
  // Location
  locationLat: number | null;
  locationLng: number | null;
  distanceMeters: number | null;
  
  // Reward
  rewardOffered: number | null;
  
  // Link
  campaignId: string | null;
  dealId: string | null;
  
  // Tracking
  sentAt: Date;
  expiresAt: Date | null;
  wasClicked: boolean;
  clickedAt: Date | null;
  wasConverted: boolean;
  convertedAt: Date | null;
}
```

### 9.2 Notification Rules

| Trigger | Notification | Frequency Limit |
|---------|--------------|-----------------|
| Enter campaign geofence | Campaign invite | 1 per campaign per day |
| Near new deal | Deal alert | 3 per day |
| Friend posts nearby | Social update | 5 per day |
| Earn achievement | Celebration | Unlimited |
| Campaign ending soon | Urgency reminder | 1 per campaign |

---

## 10. INTEGRATION WITH ZOE

### 10.1 Zoe-Selfie City Bridge

```typescript
interface ZoeSelfieCityIntegration {
  // Location Context
  getCurrentLocation(): Promise<LatLng>;
  getNearbyOpportunities(): Promise<Opportunity[]>;
  
  // Recommendations
  suggestBestTime(campaignId: string): Promise<TimeRecommendation>;
  suggestPhotoAngle(location: LatLng): Promise<AngleSuggestion>;
  
  // Earnings
  getEarningsSummary(): Promise<EarningsSummary>;
  predictMonthlyEarnings(): Promise<EarningsPrediction>;
  
  // Social
  findFriendsNearby(): Promise<NearbyFriend[]>;
  suggestCollaboration(): Promise<CollabSuggestion>;
}
```

### 10.2 Voice Commands

| Command | Action |
|---------|--------|
| "Zoe, find me campaigns nearby" | List active campaigns within 1km |
| "Zoe, what can I earn here?" | Show potential earnings at current location |
| "Zoe, take a selfie for [brand]" | Open camera with campaign overlay |
| "Zoe, how much have I earned this week?" | Earnings summary |
| "Zoe, claim my rewards" | Initiate payout |

---

## APPENDIX: Database Schema

```sql
-- Selfie City Pins
CREATE TABLE selfie_city_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users,
  
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  location_name TEXT,
  
  image_url TEXT NOT NULL,
  caption TEXT,
  tags TEXT[],
  
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  authenticity_score INTEGER,
  
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  
  campaign_id UUID REFERENCES brand_campaigns,
  
  visibility TEXT DEFAULT 'public',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Brand Campaigns
CREATE TABLE brand_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id UUID REFERENCES brand_accounts,
  merchant_user_id UUID NOT NULL,
  
  campaign_name TEXT NOT NULL,
  description TEXT,
  
  geofence_center_lat FLOAT NOT NULL,
  geofence_center_lng FLOAT NOT NULL,
  geofence_radius_meters INTEGER DEFAULT 500,
  
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'draft',
  
  budget_total NUMERIC,
  budget_spent NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  
  reward_type TEXT DEFAULT 'credits',
  reward_amount NUMERIC DEFAULT 0,
  max_claims INTEGER,
  current_claims INTEGER DEFAULT 0,
  
  target_tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Claims
CREATE TABLE campaign_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES brand_campaigns,
  user_id UUID NOT NULL REFERENCES auth.users,
  pin_id UUID REFERENCES selfie_city_pins,
  
  status TEXT DEFAULT 'pending',
  verified_at TIMESTAMP WITH TIME ZONE,
  
  reward_earned NUMERIC,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pins_location ON selfie_city_pins(latitude, longitude);
CREATE INDEX idx_pins_user ON selfie_city_pins(user_id);
CREATE INDEX idx_campaigns_status ON brand_campaigns(status);
CREATE INDEX idx_claims_status ON campaign_claims(status);
```

---

*This document was generated by Zoe DHF Business Intelligence Module*
*Protocol: SELFIE-CITY-SPEC | Version: 1.0*
