// Comprehensive Offline Data Sync Manager
// Caches posts, messages, user data, DHF, and enables full offline Zoe interactions

import { supabase } from '@/integrations/supabase/client';

// Storage keys
const STORAGE_KEYS = {
  POSTS: 'zoe_offline_posts',
  MESSAGES: 'zoe_offline_messages',
  USERS: 'zoe_offline_users',
  DHF_DATA: 'zoe_offline_dhf',
  CONVERSATIONS: 'zoe_offline_conversations',
  SEARCH_INDEX: 'zoe_offline_search_index',
  PENDING_ACTIONS: 'zoe_offline_pending_actions',
  LAST_SYNC: 'zoe_offline_last_sync',
  USER_PROFILE: 'zoe_offline_user_profile',
  FRIENDS: 'zoe_offline_friends',
  NOTIFICATIONS: 'zoe_offline_notifications',
};

// Types
export interface OfflinePost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_name: string;
  author_username: string;
  author_photo?: string;
  user_liked?: boolean;
  comments?: OfflineComment[];
}

export interface OfflineComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  author_name: string;
  created_at: string;
}

export interface OfflineMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  created_at: string;
  read: boolean;
  sender_name?: string;
}

export interface OfflineUser {
  user_id: string;
  display_name: string;
  username: string;
  profile_photo_url?: string;
  bio?: string;
  status?: string;
  last_seen?: string;
}

export interface DHFOfflineData {
  user_id: string;
  behavioral_patterns: any[];
  emotional_trends: any[];
  cognitive_preferences: any[];
  learning_history: any[];
  conversation_topics: string[];
  interests: string[];
  frequent_commands: string[];
  last_updated: string;
}

export interface PendingAction {
  id: string;
  type: 'like' | 'comment' | 'message' | 'post' | 'reaction';
  data: any;
  created_at: string;
  retries: number;
}

export interface ZoeConversationContext {
  user_name: string;
  shared_topics: string[];
  past_conversations: { role: 'user' | 'zoe'; content: string; timestamp: string }[];
  user_preferences: Record<string, any>;
  emotional_history: string[];
  interests: string[];
}

// Main Offline Data Sync Class
export class OfflineDataSync {
  private static instance: OfflineDataSync;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = navigator.onLine;

  private constructor() {
    this.setupOnlineListener();
  }

  static getInstance(): OfflineDataSync {
    if (!OfflineDataSync.instance) {
      OfflineDataSync.instance = new OfflineDataSync();
    }
    return OfflineDataSync.instance;
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('[OfflineSync] Back online - syncing pending actions');
      this.syncPendingActions();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('[OfflineSync] Gone offline - using cached data');
    });
  }

  // ============= POSTS =============
  
  async syncPosts(userId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Fetch recent posts with author info
      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          id, user_id, content, media_url, media_type, 
          likes_count, comments_count, created_at, visibility,
          profiles!posts_user_id_fkey(display_name, username, profile_photo_url)
        `)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Get user's likes
      const { data: likes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);

      const likedPostIds = new Set(likes?.map(l => l.post_id) || []);

      // Transform and cache
      const offlinePosts: OfflinePost[] = (posts || []).map(post => ({
        id: post.id,
        user_id: post.user_id,
        content: post.content,
        media_url: post.media_url,
        media_type: post.media_type,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at,
        author_name: (post.profiles as any)?.display_name || 'Unknown',
        author_username: (post.profiles as any)?.username || 'unknown',
        author_photo: (post.profiles as any)?.profile_photo_url,
        user_liked: likedPostIds.has(post.id),
      }));

      this.saveToStorage(STORAGE_KEYS.POSTS, offlinePosts);
      console.log(`[OfflineSync] Cached ${offlinePosts.length} posts`);
    } catch (error) {
      console.error('[OfflineSync] Error syncing posts:', error);
    }
  }

  getPosts(): OfflinePost[] {
    return this.getFromStorage<OfflinePost[]>(STORAGE_KEYS.POSTS) || [];
  }

  searchPosts(query: string): OfflinePost[] {
    const posts = this.getPosts();
    const lowerQuery = query.toLowerCase();
    return posts.filter(post => 
      post.content?.toLowerCase().includes(lowerQuery) ||
      post.author_name.toLowerCase().includes(lowerQuery) ||
      post.author_username.toLowerCase().includes(lowerQuery)
    );
  }

  // ============= MESSAGES =============

  async syncMessages(userId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, read')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Get sender profiles
      const senderIds = [...new Set(messages?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);

      const offlineMessages: OfflineMessage[] = (messages || []).map(msg => ({
        ...msg,
        sender_name: profileMap.get(msg.sender_id) || 'Unknown',
      }));

      this.saveToStorage(STORAGE_KEYS.MESSAGES, offlineMessages);
      console.log(`[OfflineSync] Cached ${offlineMessages.length} messages`);
    } catch (error) {
      console.error('[OfflineSync] Error syncing messages:', error);
    }
  }

  getMessages(chatUserId?: string): OfflineMessage[] {
    const messages = this.getFromStorage<OfflineMessage[]>(STORAGE_KEYS.MESSAGES) || [];
    if (chatUserId) {
      return messages.filter(m => 
        m.sender_id === chatUserId || m.receiver_id === chatUserId
      );
    }
    return messages;
  }

  searchMessages(query: string): OfflineMessage[] {
    const messages = this.getMessages();
    const lowerQuery = query.toLowerCase();
    return messages.filter(msg => 
      msg.content?.toLowerCase().includes(lowerQuery) ||
      msg.sender_name?.toLowerCase().includes(lowerQuery)
    );
  }

  // ============= USERS/FRIENDS =============

  async syncUsers(userId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Get friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      const friendIds = (friendships || []).map(f => 
        f.user1_id === userId ? f.user2_id : f.user1_id
      );

      if (friendIds.length === 0) {
        this.saveToStorage(STORAGE_KEYS.FRIENDS, []);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, profile_photo_url, bio, status')
        .in('user_id', friendIds);

      const offlineUsers: OfflineUser[] = (profiles || []).map(p => ({
        user_id: p.user_id,
        display_name: p.display_name,
        username: p.username,
        profile_photo_url: p.profile_photo_url || undefined,
        bio: p.bio || undefined,
        status: p.status || undefined,
      }));

      this.saveToStorage(STORAGE_KEYS.FRIENDS, offlineUsers);
      console.log(`[OfflineSync] Cached ${offlineUsers.length} friends`);
    } catch (error) {
      console.error('[OfflineSync] Error syncing users:', error);
    }
  }

  getFriends(): OfflineUser[] {
    return this.getFromStorage<OfflineUser[]>(STORAGE_KEYS.FRIENDS) || [];
  }

  searchUsers(query: string): OfflineUser[] {
    const users = this.getFriends();
    const lowerQuery = query.toLowerCase();
    return users.filter(user =>
      user.display_name.toLowerCase().includes(lowerQuery) ||
      user.username.toLowerCase().includes(lowerQuery) ||
      user.bio?.toLowerCase().includes(lowerQuery)
    );
  }

  // ============= DHF DATA =============

  async syncDHFData(userId: string): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Fetch behavioral events
      const { data: behavioralEvents } = await supabase
        .from('behavioral_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);

      // Fetch emotion logs
      const { data: emotionLogs } = await supabase
        .from('emotion_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch DHF learning history
      const { data: learningHistory } = await supabase
        .from('dhf_learning_history')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();

      // Fetch Zoe command history for frequent commands
      const { data: commandHistory } = await supabase
        .from('zoe_command_history')
        .select('command')
        .eq('user_id', userId)
        .eq('success', true)
        .order('created_at', { ascending: false })
        .limit(100);

      // Fetch user profile for interests
      const { data: profile } = await supabase
        .from('profiles')
        .select('hobbies, bio, display_name')
        .eq('user_id', userId)
        .maybeSingle();

      // Extract conversation topics from behavioral events
      const topics = new Set<string>();
      behavioralEvents?.forEach(event => {
        if (event.context_snippet) {
          topics.add(event.context_snippet);
        }
      });

      // Extract frequent commands
      const commandCounts = new Map<string, number>();
      commandHistory?.forEach(cmd => {
        const count = commandCounts.get(cmd.command) || 0;
        commandCounts.set(cmd.command, count + 1);
      });
      const frequentCommands = Array.from(commandCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([cmd]) => cmd);

      const dhfData: DHFOfflineData = {
        user_id: userId,
        behavioral_patterns: behavioralEvents || [],
        emotional_trends: emotionLogs || [],
        cognitive_preferences: (learningHistory?.cognitive_patterns as any) || [],
        learning_history: [(learningHistory || {})],
        conversation_topics: Array.from(topics).slice(0, 50),
        interests: profile?.hobbies || [],
        frequent_commands: frequentCommands,
        last_updated: new Date().toISOString(),
      };

      this.saveToStorage(STORAGE_KEYS.DHF_DATA, dhfData);
      
      // Also save user profile separately
      if (profile) {
        this.saveToStorage(STORAGE_KEYS.USER_PROFILE, {
          display_name: profile.display_name,
          bio: profile.bio,
          hobbies: profile.hobbies,
        });
      }

      console.log('[OfflineSync] Cached DHF data and user profile');
    } catch (error) {
      console.error('[OfflineSync] Error syncing DHF data:', error);
    }
  }

  getDHFData(): DHFOfflineData | null {
    return this.getFromStorage<DHFOfflineData>(STORAGE_KEYS.DHF_DATA);
  }

  getUserProfile(): { display_name: string; bio?: string; hobbies?: string[] } | null {
    return this.getFromStorage(STORAGE_KEYS.USER_PROFILE);
  }

  // ============= ZOE CONVERSATION CONTEXT =============

  getZoeConversationContext(): ZoeConversationContext | null {
    const dhfData = this.getDHFData();
    const profile = this.getUserProfile();
    const conversations = this.getFromStorage<any[]>(STORAGE_KEYS.CONVERSATIONS) || [];

    if (!profile) return null;

    return {
      user_name: profile.display_name,
      shared_topics: dhfData?.conversation_topics || [],
      past_conversations: conversations.slice(-50),
      user_preferences: {
        hobbies: profile.hobbies,
        frequentCommands: dhfData?.frequent_commands,
      },
      emotional_history: dhfData?.emotional_trends.map((e: any) => e.emotion) || [],
      interests: dhfData?.interests || profile.hobbies || [],
    };
  }

  addConversation(role: 'user' | 'zoe', content: string) {
    const conversations = this.getFromStorage<any[]>(STORAGE_KEYS.CONVERSATIONS) || [];
    conversations.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    // Keep last 200 conversations
    this.saveToStorage(STORAGE_KEYS.CONVERSATIONS, conversations.slice(-200));
  }

  // ============= PENDING ACTIONS =============

  queueAction(type: PendingAction['type'], data: any): string {
    const actions = this.getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
    const id = crypto.randomUUID();
    
    actions.push({
      id,
      type,
      data,
      created_at: new Date().toISOString(),
      retries: 0,
    });

    this.saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, actions);
    console.log(`[OfflineSync] Queued ${type} action for later sync`);
    return id;
  }

  async syncPendingActions(): Promise<void> {
    if (!this.isOnline) return;

    const actions = this.getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
    if (actions.length === 0) return;

    console.log(`[OfflineSync] Syncing ${actions.length} pending actions`);
    const failedActions: PendingAction[] = [];

    for (const action of actions) {
      try {
        await this.executePendingAction(action);
      } catch (error) {
        console.error(`[OfflineSync] Failed to sync action ${action.type}:`, error);
        if (action.retries < 3) {
          failedActions.push({ ...action, retries: action.retries + 1 });
        }
      }
    }

    this.saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, failedActions);
  }

  private async executePendingAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'like':
        await supabase.from('post_likes').insert(action.data);
        break;
      case 'comment':
        await supabase.from('post_comments').insert(action.data);
        break;
      case 'message':
        await supabase.from('messages').insert(action.data);
        break;
      case 'post':
        await supabase.from('posts').insert(action.data);
        break;
      case 'reaction':
        await supabase.from('messages').update(action.data.update).eq('id', action.data.id);
        break;
    }
  }

  getPendingActionsCount(): number {
    const actions = this.getFromStorage<PendingAction[]>(STORAGE_KEYS.PENDING_ACTIONS) || [];
    return actions.length;
  }

  // ============= FULL SYNC =============

  async performFullSync(userId: string): Promise<void> {
    console.log('[OfflineSync] Starting full sync...');
    
    await Promise.all([
      this.syncPosts(userId),
      this.syncMessages(userId),
      this.syncUsers(userId),
      this.syncDHFData(userId),
    ]);

    this.saveToStorage(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
    console.log('[OfflineSync] Full sync completed');
  }

  getLastSyncTime(): string | null {
    return this.getFromStorage<string>(STORAGE_KEYS.LAST_SYNC);
  }

  startAutoSync(userId: string, intervalMs: number = 60000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    this.performFullSync(userId);

    // Periodic sync
    this.syncInterval = setInterval(() => {
      if (this.isOnline) {
        this.performFullSync(userId);
      }
    }, intervalMs);
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // ============= UNIVERSAL SEARCH =============

  universalSearch(query: string): {
    posts: OfflinePost[];
    messages: OfflineMessage[];
    users: OfflineUser[];
  } {
    return {
      posts: this.searchPosts(query),
      messages: this.searchMessages(query),
      users: this.searchUsers(query),
    };
  }

  // ============= STORAGE HELPERS =============

  private saveToStorage<T>(key: string, data: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`[OfflineSync] Error saving to ${key}:`, error);
      // Try to clear old data if storage is full
      this.clearOldData();
    }
  }

  private getFromStorage<T>(key: string): T | null {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`[OfflineSync] Error reading from ${key}:`, error);
      return null;
    }
  }

  private clearOldData(): void {
    // Clear oldest data to make room
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      const data = this.getFromStorage<any[]>(key);
      if (Array.isArray(data) && data.length > 50) {
        this.saveToStorage(key, data.slice(-50));
      }
    }
  }

  clearAllCache(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('[OfflineSync] All cache cleared');
  }
}

// Export singleton instance
export const offlineDataSync = OfflineDataSync.getInstance();
