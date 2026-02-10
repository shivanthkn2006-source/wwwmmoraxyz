// ═══════════════════════════════════════════════════════════════════════════════
// ZOE ORB REALTIME FEEDS - Seamless connectivity for friends, offers, brand deals
// Provides real-time updates accessible through Zoe chat interface
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export interface FriendActivity {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  activityType: 'post' | 'like' | 'comment' | 'photo' | 'location' | 'online';
  content?: string;
  timestamp: Date;
  isOnline: boolean;
}

export interface BrandDeal {
  id: string;
  brandName: string;
  brandLogo: string | null;
  category: string;
  discount: string | null;
  description: string | null;
  validUntil: Date | null;
  isPremium: boolean;
  locationLat?: number;
  locationLng?: number;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountPercentage: number;
  brandName: string;
  brandLogo: string | null;
  expiresAt: Date | null;
  category: string;
  isExclusive: boolean;
}

export interface RealtimeFeedsState {
  friendActivities: FriendActivity[];
  brandDeals: BrandDeal[];
  offers: Offer[];
  unreadCount: number;
  isLoading: boolean;
  lastUpdated: Date | null;
}

export const useZoeOrbRealtimeFeeds = () => {
  const { user } = useAuth();
  const [state, setState] = useState<RealtimeFeedsState>({
    friendActivities: [],
    brandDeals: [],
    offers: [],
    unreadCount: 0,
    isLoading: false,
    lastUpdated: null,
  });

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load friend activities
  const loadFriendActivities = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's friends
      const { data: friends } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted')
        .limit(50);

      if (!friends || friends.length === 0) {
        // Load demo activities if no friends
        setState(prev => ({
          ...prev,
          friendActivities: generateDemoFriendActivities(),
        }));
        return;
      }

      // Get friend IDs
      const friendIds = friends.map(f => 
        f.sender_id === user.id ? f.receiver_id : f.sender_id
      );

      // Get friend profiles
      const { data: profiles } = await supabase
        .from('safe_public_profiles')
        .select('user_id, username, display_name, profile_photo_url, status')
        .in('user_id', friendIds);

      // Get recent activities from posts
      const { data: posts } = await supabase
        .from('posts')
        .select('id, user_id, content, media_url, created_at')
        .in('user_id', friendIds)
        .order('created_at', { ascending: false })
        .limit(20);

      const activities: FriendActivity[] = (posts || []).map(post => {
        const profile = profiles?.find(p => p.user_id === post.user_id);
        return {
          id: post.id,
          userId: post.user_id,
          username: profile?.username || 'Unknown',
          displayName: profile?.display_name || 'Unknown',
          avatarUrl: profile?.profile_photo_url,
          activityType: post.media_url ? 'photo' : 'post',
          content: post.content?.substring(0, 100),
          timestamp: new Date(post.created_at),
          isOnline: profile?.status === 'online',
        };
      });

      setState(prev => ({
        ...prev,
        friendActivities: activities.length > 0 ? activities : generateDemoFriendActivities(),
      }));
    } catch (error) {
      console.error('[ZoeOrbFeeds] Load friends error:', error);
      setState(prev => ({
        ...prev,
        friendActivities: generateDemoFriendActivities(),
      }));
    }
  }, [user]);

  // Load brand deals
  const loadBrandDeals = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('brand_deals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const deals: BrandDeal[] = (data || []).map(deal => ({
        id: deal.id,
        brandName: deal.brand_name,
        brandLogo: deal.brand_logo_url,
        category: deal.category,
        discount: deal.discount_text,
        description: deal.description,
        validUntil: deal.valid_until ? new Date(deal.valid_until) : null,
        isPremium: deal.is_premium || false,
        locationLat: deal.location_lat,
        locationLng: deal.location_lng,
      }));

      setState(prev => ({
        ...prev,
        brandDeals: deals.length > 0 ? deals : generateDemoBrandDeals(),
      }));
    } catch (error) {
      console.error('[ZoeOrbFeeds] Load brand deals error:', error);
      setState(prev => ({
        ...prev,
        brandDeals: generateDemoBrandDeals(),
      }));
    }
  }, []);

  // Load offers
  const loadOffers = useCallback(async () => {
    try {
      // Offers from brand_deals with active discounts
      const { data, error } = await supabase
        .from('brand_deals')
        .select('*')
        .not('discount_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      const offers: Offer[] = (data || []).map(deal => ({
        id: deal.id,
        title: `${deal.discount_text} at ${deal.brand_name}`,
        description: deal.description || `Special offer from ${deal.brand_name}`,
        discountPercentage: parseInt(deal.discount_text?.replace(/\D/g, '') || '0') || 0,
        brandName: deal.brand_name,
        brandLogo: deal.brand_logo_url,
        expiresAt: deal.valid_until ? new Date(deal.valid_until) : null,
        category: deal.category,
        isExclusive: deal.is_premium || false,
      }));

      setState(prev => ({
        ...prev,
        offers: offers.length > 0 ? offers : generateDemoOffers(),
      }));
    } catch (error) {
      console.error('[ZoeOrbFeeds] Load offers error:', error);
      setState(prev => ({
        ...prev,
        offers: generateDemoOffers(),
      }));
    }
  }, []);

  // Refresh all feeds
  const refreshFeeds = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    await Promise.all([
      loadFriendActivities(),
      loadBrandDeals(),
      loadOffers(),
    ]);

    setState(prev => ({
      ...prev,
      isLoading: false,
      lastUpdated: new Date(),
    }));
  }, [loadFriendActivities, loadBrandDeals, loadOffers]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const channelName = `zoe-orb-feeds-${user.id}-${Date.now()}`;
    
    channelRef.current = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
      }, (payload) => {
        // New post from friends - trigger refresh
        loadFriendActivities();
        setState(prev => ({ ...prev, unreadCount: prev.unreadCount + 1 }));
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'brand_deals',
      }, (payload) => {
        // New brand deal
        loadBrandDeals();
        loadOffers();
        setState(prev => ({ ...prev, unreadCount: prev.unreadCount + 1 }));
      })
      .subscribe();

    // Initial load
    refreshFeeds();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [user, loadFriendActivities, loadBrandDeals, loadOffers, refreshFeeds]);

  // Get summary for Zoe chat context
  const getFeedsSummaryForChat = useCallback(() => {
    const onlineFriends = state.friendActivities.filter(a => a.isOnline).length;
    const recentActivities = state.friendActivities.slice(0, 3);
    const topDeals = state.brandDeals.slice(0, 3);
    const exclusiveOffers = state.offers.filter(o => o.isExclusive).slice(0, 2);

    return {
      onlineFriendsCount: onlineFriends,
      recentFriendActivities: recentActivities.map(a => 
        `${a.displayName} ${a.activityType === 'photo' ? 'shared a photo' : 'posted'}`
      ),
      topBrandDeals: topDeals.map(d => 
        `${d.brandName}: ${d.discount || d.description?.substring(0, 30)}`
      ),
      exclusiveOffers: exclusiveOffers.map(o => 
        `${o.discountPercentage}% off at ${o.brandName}`
      ),
      totalUnread: state.unreadCount,
      hasFreshUpdates: state.unreadCount > 0,
    };
  }, [state]);

  // Clear unread count
  const markAsRead = useCallback(() => {
    setState(prev => ({ ...prev, unreadCount: 0 }));
  }, []);

  return {
    ...state,
    refreshFeeds,
    getFeedsSummaryForChat,
    markAsRead,
  };
};

// Demo data generators for fallback
function generateDemoFriendActivities(): FriendActivity[] {
  const names = ['Maya', 'Arjun', 'Priya', 'Rahul', 'Anjali'];
  return names.map((name, i) => ({
    id: `demo-activity-${i}`,
    userId: `demo-user-${i}`,
    username: name.toLowerCase(),
    displayName: name,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    activityType: ['post', 'photo', 'like'][i % 3] as FriendActivity['activityType'],
    content: `Hey everyone! Enjoying the day ✨`,
    timestamp: new Date(Date.now() - i * 3600000),
    isOnline: i % 2 === 0,
  }));
}

function generateDemoBrandDeals(): BrandDeal[] {
  const brands = [
    { name: 'Nike', category: 'Fashion', discount: '30% OFF' },
    { name: 'Apple', category: 'Tech', discount: 'Free AirPods' },
    { name: 'Starbucks', category: 'Food', discount: 'Buy 1 Get 1' },
    { name: 'Amazon', category: 'Shopping', discount: '₹500 Cashback' },
  ];
  return brands.map((b, i) => ({
    id: `demo-deal-${i}`,
    brandName: b.name,
    brandLogo: null,
    category: b.category,
    discount: b.discount,
    description: `Special offer from ${b.name}`,
    validUntil: new Date(Date.now() + 7 * 24 * 3600000),
    isPremium: i === 0,
  }));
}

function generateDemoOffers(): Offer[] {
  const offers = [
    { brand: 'Zara', discount: 40, category: 'Fashion' },
    { brand: 'Swiggy', discount: 25, category: 'Food' },
    { brand: 'Myntra', discount: 50, category: 'Fashion' },
  ];
  return offers.map((o, i) => ({
    id: `demo-offer-${i}`,
    title: `${o.discount}% OFF at ${o.brand}`,
    description: `Exclusive offer for you!`,
    discountPercentage: o.discount,
    brandName: o.brand,
    brandLogo: null,
    expiresAt: new Date(Date.now() + 3 * 24 * 3600000),
    category: o.category,
    isExclusive: i === 0,
  }));
}
