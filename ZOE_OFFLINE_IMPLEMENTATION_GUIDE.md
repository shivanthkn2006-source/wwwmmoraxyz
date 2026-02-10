# ZOE OFFLINE IMPLEMENTATION GUIDE
## Building Offline-First Autonomous AI

---

## 📋 OVERVIEW

This guide provides detailed implementation instructions for Zoe's offline intelligence capabilities, enabling full AI functionality without internet connectivity.

---

## 🏗️ ARCHITECTURE

### Offline Intelligence Stack
```typescript
// Core Offline Architecture
interface OfflineZoeArchitecture {
  // Layer 1: On-Device AI Models
  models: {
    llm: 'gemini-nano' | 'llama-3.2-7b' | 'phi-4-mini';
    vision: 'mobilevit' | 'efficientvit';
    audio: 'whisper-tiny' | 'whisper-base';
    embeddings: 'all-minilm-l6-v2';
  };
  
  // Layer 2: Local Storage
  storage: {
    database: IndexedDB;
    vectorStore: VectorDatabase;
    cache: CacheAPI;
    fileSystem: OPFS; // Origin Private File System
  };
  
  // Layer 3: Sync Engine
  sync: {
    strategy: 'differential' | 'snapshot';
    conflictResolution: 'last-write-wins' | 'custom';
    triggers: ('manual' | 'periodic' | 'on-wifi')[];
  };
  
  // Layer 4: Fallback System
  fallback: {
    degradationLevels: IntelligenceTier[];
    cachePreloading: string[];
    emergencyMode: boolean;
  };
}
```

---

## 🔧 IMPLEMENTATION STEPS

### Step 1: Install Dependencies

```bash
npm install @huggingface/transformers
npm install idb
npm install localforage
npm install workbox-precaching
npm install comlink
```

### Step 2: Set Up Web Worker for AI Processing

```typescript
// workers/offlineAI.worker.ts
import { pipeline, env } from '@huggingface/transformers';

// Configure to use local models
env.allowLocalModels = true;
env.localModelPath = '/models/';

let textGenerator: any;
let imageClassifier: any;
let embedder: any;

// Initialize models
async function initializeModels() {
  console.log('Loading offline AI models...');
  
  textGenerator = await pipeline(
    'text-generation',
    'Xenova/gpt2', // Replace with Gemini Nano when available
    { quantized: true }
  );
  
  imageClassifier = await pipeline(
    'image-classification',
    'Xenova/vit-base-patch16-224',
    { quantized: true }
  );
  
  embedder = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
    { quantized: true }
  );
  
  console.log('Offline AI models loaded successfully');
  return true;
}

// Handle text generation
async function generateText(prompt: string, options: any) {
  const result = await textGenerator(prompt, {
    max_new_tokens: options.maxTokens || 256,
    temperature: options.temperature || 0.7,
    do_sample: true,
  });
  
  return result[0].generated_text;
}

// Handle image classification
async function classifyImage(imageData: ImageData) {
  const result = await imageClassifier(imageData);
  return result;
}

// Handle text embedding
async function generateEmbedding(text: string) {
  const result = await embedder(text, { 
    pooling: 'mean',
    normalize: true 
  });
  return Array.from(result.data);
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, payload, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'init':
        result = await initializeModels();
        break;
      case 'generate':
        result = await generateText(payload.prompt, payload.options);
        break;
      case 'classify':
        result = await classifyImage(payload.image);
        break;
      case 'embed':
        result = await generateEmbedding(payload.text);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({ id, result, success: true });
  } catch (error) {
    self.postMessage({ 
      id, 
      error: error.message, 
      success: false 
    });
  }
});
```

---

### Step 3: Create Offline Storage Manager

```typescript
// utils/offlineStorage.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ZoeOfflineDB extends DBSchema {
  conversations: {
    key: string;
    value: {
      id: string;
      messages: Message[];
      timestamp: number;
      synced: boolean;
    };
  };
  knowledge: {
    key: string;
    value: {
      id: string;
      text: string;
      embedding: number[];
      metadata: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
  timeline_content: {
    key: string;
    value: {
      id: string;
      thresholdId: number;
      content: any;
      timestamp: number;
      synced: boolean;
    };
  };
  user_preferences: {
    key: string;
    value: any;
  };
}

class OfflineStorageManager {
  private db: IDBPDatabase<ZoeOfflineDB> | null = null;
  
  async initialize() {
    this.db = await openDB<ZoeOfflineDB>('zoe-offline', 1, {
      upgrade(db) {
        // Conversations store
        db.createObjectStore('conversations', { keyPath: 'id' });
        
        // Knowledge store with timestamp index
        const knowledgeStore = db.createObjectStore('knowledge', { 
          keyPath: 'id' 
        });
        knowledgeStore.createIndex('by-timestamp', 'timestamp');
        
        // Timeline content store
        db.createObjectStore('timeline_content', { keyPath: 'id' });
        
        // User preferences
        db.createObjectStore('user_preferences', { keyPath: 'key' });
      },
    });
  }
  
  // Conversation management
  async saveConversation(conversation: any) {
    await this.db!.put('conversations', {
      ...conversation,
      synced: false,
      timestamp: Date.now(),
    });
  }
  
  async getConversation(id: string) {
    return await this.db!.get('conversations', id);
  }
  
  async getAllConversations() {
    return await this.db!.getAll('conversations');
  }
  
  // Knowledge base management
  async addKnowledge(text: string, embedding: number[], metadata: any) {
    const id = crypto.randomUUID();
    await this.db!.put('knowledge', {
      id,
      text,
      embedding,
      metadata,
      timestamp: Date.now(),
    });
    return id;
  }
  
  async searchKnowledge(queryEmbedding: number[], limit: number = 5) {
    const allKnowledge = await this.db!.getAll('knowledge');
    
    // Calculate cosine similarity
    const results = allKnowledge.map(item => ({
      ...item,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
    }));
    
    // Sort by similarity and return top results
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }
  
  // Timeline content management
  async saveTimelineContent(content: any) {
    await this.db!.put('timeline_content', {
      ...content,
      synced: false,
      timestamp: Date.now(),
    });
  }
  
  async getTimelineContent(thresholdId: number) {
    const all = await this.db!.getAll('timeline_content');
    return all.filter(item => item.thresholdId === thresholdId);
  }
  
  // Preferences
  async setPreference(key: string, value: any) {
    await this.db!.put('user_preferences', { key, value });
  }
  
  async getPreference(key: string) {
    const result = await this.db!.get('user_preferences', key);
    return result?.value;
  }
  
  // Sync management
  async getUnsyncedItems() {
    const conversations = await this.db!.getAll('conversations');
    const timelineContent = await this.db!.getAll('timeline_content');
    
    return {
      conversations: conversations.filter(c => !c.synced),
      timelineContent: timelineContent.filter(t => !t.synced),
    };
  }
  
  async markAsSynced(store: string, id: string) {
    const item = await this.db!.get(store as any, id);
    if (item) {
      await this.db!.put(store as any, { ...item, synced: true });
    }
  }
}

export const offlineStorage = new OfflineStorageManager();
```

---

### Step 4: Create Offline AI Hook

```typescript
// hooks/useOfflineAI.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { wrap } from 'comlink';
import { offlineStorage } from '@/utils/offlineStorage';

interface OfflineAIOptions {
  enableAutoInit?: boolean;
  fallbackToCloud?: boolean;
}

export const useOfflineAI = (options: OfflineAIOptions = {}) => {
  const { enableAutoInit = true, fallbackToCloud = true } = options;
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const aiWorkerRef = useRef<any>(null);
  
  // Initialize worker
  useEffect(() => {
    if (!enableAutoInit) return;
    
    const initWorker = async () => {
      try {
        // Create worker
        workerRef.current = new Worker(
          new URL('../workers/offlineAI.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        aiWorkerRef.current = wrap(workerRef.current);
        
        // Initialize models
        await aiWorkerRef.current.init();
        
        // Initialize storage
        await offlineStorage.initialize();
        
        setIsInitialized(true);
        console.log('✅ Offline AI initialized successfully');
      } catch (err) {
        console.error('❌ Failed to initialize offline AI:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };
    
    initWorker();
    
    return () => {
      workerRef.current?.terminate();
    };
  }, [enableAutoInit]);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Generate text with offline AI
  const generateText = useCallback(async (
    prompt: string,
    options: any = {}
  ): Promise<string> => {
    if (!isInitialized) {
      throw new Error('Offline AI not initialized');
    }
    
    try {
      // Try offline generation
      const result = await aiWorkerRef.current.generate({
        prompt,
        options,
      });
      
      return result;
    } catch (err) {
      console.error('Offline generation failed:', err);
      
      // Fallback to cloud if enabled and online
      if (fallbackToCloud && isOnline) {
        console.log('Falling back to cloud AI...');
        // Implement cloud fallback here
        throw new Error('Cloud fallback not implemented yet');
      }
      
      throw err;
    }
  }, [isInitialized, isOnline, fallbackToCloud]);
  
  // Classify image with offline AI
  const classifyImage = useCallback(async (
    imageData: ImageData
  ): Promise<any> => {
    if (!isInitialized) {
      throw new Error('Offline AI not initialized');
    }
    
    const result = await aiWorkerRef.current.classify({ image: imageData });
    return result;
  }, [isInitialized]);
  
  // Generate embeddings for semantic search
  const generateEmbedding = useCallback(async (
    text: string
  ): Promise<number[]> => {
    if (!isInitialized) {
      throw new Error('Offline AI not initialized');
    }
    
    const result = await aiWorkerRef.current.embed({ text });
    return result;
  }, [isInitialized]);
  
  // Semantic search in local knowledge base
  const semanticSearch = useCallback(async (
    query: string,
    limit: number = 5
  ) => {
    const queryEmbedding = await generateEmbedding(query);
    const results = await offlineStorage.searchKnowledge(queryEmbedding, limit);
    return results;
  }, [generateEmbedding]);
  
  return {
    isInitialized,
    isOnline,
    error,
    generateText,
    classifyImage,
    generateEmbedding,
    semanticSearch,
    storage: offlineStorage,
  };
};
```

---

### Step 5: Update Zoe Agent for Offline Support

```typescript
// hooks/useZoeAgentOffline.ts
import { useCallback, useState } from 'react';
import { useOfflineAI } from './useOfflineAI';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';

export const useZoeAgentOffline = () => {
  const { user } = useAuth();
  const offlineAI = useOfflineAI({ enableAutoInit: true, fallbackToCloud: true });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const executeCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    setIsProcessing(true);
    
    try {
      let response: string;
      
      // Check if online - use cloud AI for better quality
      if (offlineAI.isOnline && navigator.onLine) {
        console.log('🌐 Using cloud AI (Gemini 2.5 Pro)');
        
        const { data, error } = await supabase.functions.invoke('zoe-agent', {
          body: { command, userId: user?.id },
        });
        
        if (error) throw error;
        response = data.response;
      } else {
        // Offline mode - use local AI
        console.log('📱 Using offline AI');
        toast.info('Operating in offline mode');
        
        const systemPrompt = `You are Zoe, a calm, intelligent AI architect. 
        Provide concise, helpful responses. Current mode: Offline (limited capabilities).`;
        
        const fullPrompt = `${systemPrompt}\n\nUser: ${command}\n\nZoe:`;
        
        response = await offlineAI.generateText(fullPrompt, {
          maxTokens: 200,
          temperature: 0.7,
        });
        
        // Clean up response
        response = response.replace(fullPrompt, '').trim();
      }
      
      // Save to local storage
      await offlineAI.storage.saveConversation({
        id: crypto.randomUUID(),
        messages: [
          { role: 'user', content: command },
          { role: 'assistant', content: response },
        ],
      });
      
      // Speak response
      await speakAsZoe(response);
      
      return response;
    } catch (error) {
      console.error('Zoe agent error:', error);
      const errorMsg = offlineAI.isOnline 
        ? 'I encountered an error. Please try again.'
        : 'Offline AI is not ready yet. Please check your connection.';
      
      toast.error(errorMsg);
      await speakAsZoe(errorMsg);
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [offlineAI, user]);
  
  return {
    executeCommand,
    isProcessing,
    isOfflineReady: offlineAI.isInitialized,
    isOnline: offlineAI.isOnline,
  };
};
```

---

### Step 6: Add Service Worker for Offline Caching

```typescript
// public/sw.js
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const { precacheAndRoute } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// Cache AI models
registerRoute(
  ({ url }) => url.pathname.startsWith('/models/'),
  new CacheFirst({
    cacheName: 'ai-models',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 20,
      }),
    ],
  })
);

// Cache API responses with network-first strategy
registerRoute(
  ({ url }) => url.origin === 'https://api.supabase.com' || 
               url.origin.includes('supabase.co'),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 5 * 60, // 5 minutes
        maxEntries: 50,
      }),
    ],
  })
);

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 100,
      }),
    ],
  })
);

// Offline fallback
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});
```

---

### Step 7: Add Sync Manager for Cloud Synchronization

```typescript
// utils/syncManager.ts
import { offlineStorage } from './offlineStorage';
import { supabase } from '@/integrations/supabase/client';

class SyncManager {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  
  // Start periodic sync
  startPeriodicSync(intervalMinutes: number = 15) {
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncToCloud();
      }
    }, intervalMinutes * 60 * 1000);
  }
  
  // Stop periodic sync
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  // Manual sync
  async syncToCloud() {
    if (this.isSyncing || !navigator.onLine) {
      console.log('Sync skipped: already syncing or offline');
      return;
    }
    
    this.isSyncing = true;
    console.log('🔄 Starting sync to cloud...');
    
    try {
      const unsyncedData = await offlineStorage.getUnsyncedItems();
      
      // Sync conversations
      for (const conversation of unsyncedData.conversations) {
        try {
          await supabase.from('ai_companion_messages').insert(
            conversation.messages.map((msg: any) => ({
              user_id: conversation.userId,
              role: msg.role,
              content: msg.content,
            }))
          );
          
          await offlineStorage.markAsSynced('conversations', conversation.id);
        } catch (err) {
          console.error('Failed to sync conversation:', err);
        }
      }
      
      // Sync timeline content
      for (const content of unsyncedData.timelineContent) {
        try {
          await supabase.from('timeline_content').upsert(content);
          await offlineStorage.markAsSynced('timeline_content', content.id);
        } catch (err) {
          console.error('Failed to sync timeline content:', err);
        }
      }
      
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  // Pull latest data from cloud
  async pullFromCloud(userId: string) {
    if (!navigator.onLine) return;
    
    try {
      // Pull conversations
      const { data: messages } = await supabase
        .from('ai_companion_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      // Store in local database
      // Implementation depends on your data structure
      
      // Pull timeline content
      const { data: timelineContent } = await supabase
        .from('timeline_content')
        .select('*')
        .eq('user_id', userId);
      
      // Store in local database
      // Implementation depends on your data structure
      
      console.log('✅ Pull from cloud completed');
    } catch (error) {
      console.error('❌ Pull from cloud failed:', error);
    }
  }
}

export const syncManager = new SyncManager();
```

---

## 🎯 USAGE EXAMPLES

### Example 1: Offline Chat
```typescript
import { useZoeAgentOffline } from '@/hooks/useZoeAgentOffline';

function OfflineChat() {
  const { executeCommand, isOfflineReady, isOnline } = useZoeAgentOffline();
  
  const handleSend = async (message: string) => {
    await executeCommand(message);
  };
  
  return (
    <div>
      <div className="status">
        {isOnline ? '🌐 Online' : '📱 Offline'}
        {!isOfflineReady && ' (Loading AI...)'}
      </div>
      {/* Chat UI */}
    </div>
  );
}
```

### Example 2: Offline Knowledge Base
```typescript
const { semanticSearch, storage } = useOfflineAI();

// Add knowledge
await storage.addKnowledge(
  'The Renaissance was a period of cultural rebirth...',
  await generateEmbedding('Renaissance history'),
  { source: 'timeline', thresholdId: 5 }
);

// Search knowledge
const results = await semanticSearch('Tell me about the Renaissance');
```

---

## 📊 PERFORMANCE OPTIMIZATION

### Model Quantization
- Use 4-bit or 8-bit quantized models for 4x smaller size
- Acceptable quality loss for most use cases
- Reduces memory footprint significantly

### Lazy Loading
- Load models only when needed
- Implement model unloading for memory management
- Cache model predictions aggressively

### Progressive Enhancement
```typescript
const intelligenceLevels = [
  { tier: 'cloud-premium', model: 'gemini-2.5-pro', online: true },
  { tier: 'cloud-standard', model: 'gemini-2.5-flash', online: true },
  { tier: 'offline-advanced', model: 'gemini-nano', online: false },
  { tier: 'offline-basic', model: 'gpt2', online: false },
  { tier: 'rule-based', model: null, online: false },
];

// Select best available tier
function selectTier() {
  for (const level of intelligenceLevels) {
    if (level.online === navigator.onLine && isModelLoaded(level.model)) {
      return level;
    }
  }
  return intelligenceLevels[intelligenceLevels.length - 1]; // Fallback
}
```

---

## 🔒 SECURITY CONSIDERATIONS

### Data Protection
- All offline data encrypted at rest using Web Crypto API
- User authentication tokens never stored in IndexedDB
- Biometric data (if any) stays local, never synced

### Privacy
- Users can clear offline cache anytime
- Selective sync - choose what gets uploaded
- Transparent about what data is stored offline

---

## 🧪 TESTING

### Test Offline Mode
```typescript
// Simulate offline
Object.defineProperty(navigator, 'onLine', { value: false });

// Test AI generation
await zoeAgent.executeCommand('Tell me about the Renaissance');

// Verify local storage
const conversations = await offlineStorage.getAllConversations();
expect(conversations).toHaveLength(1);
```

---

## 📱 DEPLOYMENT CHECKLIST

- [ ] AI models downloaded and cached (~2GB)
- [ ] Service worker registered
- [ ] IndexedDB initialized
- [ ] Sync manager configured
- [ ] Offline fallback UI ready
- [ ] Performance monitoring enabled
- [ ] User education materials prepared

---

## 🎓 USER EDUCATION

### Onboarding
"Zoe now works offline! Download AI models once (2GB) and use Zoe anywhere - on planes, in remote areas, or with poor connectivity."

### Feature Discovery
- Show offline indicator in UI
- Notify users when offline mode activates
- Explain sync behavior (when and what syncs)

---

**This is the future. Zoe works everywhere, always.**
