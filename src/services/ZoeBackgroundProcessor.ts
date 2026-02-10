/**
 * ZOE BACKGROUND PROCESSOR SERVICE
 * Global singleton that processes Zoe tasks even when chat window is closed
 * Persists across the entire platform via window events and localStorage queue
 */

import { supabase } from '@/integrations/supabase/client';
import { speakAsZoe } from '@/utils/zoeVoice';
import { toast } from 'sonner';

export interface BackgroundTask {
  id: string;
  type: 'chat' | 'profile-update' | 'youtube-analysis' | 'media-processing' | 'voice-command';
  payload: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

interface TaskCallback {
  onComplete?: (task: BackgroundTask) => void;
  onError?: (task: BackgroundTask, error: string) => void;
}

class ZoeBackgroundProcessorService {
  private static instance: ZoeBackgroundProcessorService;
  private taskQueue: BackgroundTask[] = [];
  private isProcessing = false;
  private callbacks: Map<string, TaskCallback> = new Map();
  private initialized = false;
  
  private constructor() {
    this.loadPersistedQueue();
    this.setupEventListeners();
    this.startBackgroundLoop();
    this.initialized = true;
    console.log('[ZoeBackground] 🚀 Background processor initialized');
  }
  
  static getInstance(): ZoeBackgroundProcessorService {
    if (!ZoeBackgroundProcessorService.instance) {
      ZoeBackgroundProcessorService.instance = new ZoeBackgroundProcessorService();
    }
    return ZoeBackgroundProcessorService.instance;
  }
  
  private loadPersistedQueue() {
    try {
      const stored = localStorage.getItem('zoe_background_queue');
      if (stored) {
        const parsed = JSON.parse(stored) as BackgroundTask[];
        // Only load pending/processing tasks
        this.taskQueue = parsed.filter(t => t.status === 'pending' || t.status === 'processing');
        if (this.taskQueue.length > 0) {
          console.log(`[ZoeBackground] Restored ${this.taskQueue.length} pending tasks from storage`);
        }
      }
    } catch (e) {
      console.error('[ZoeBackground] Failed to load persisted queue:', e);
    }
  }
  
  private persistQueue() {
    try {
      // Keep last 50 tasks for history
      const toStore = this.taskQueue.slice(-50);
      localStorage.setItem('zoe_background_queue', JSON.stringify(toStore));
    } catch (e) {
      console.error('[ZoeBackground] Failed to persist queue:', e);
    }
  }
  
  private setupEventListeners() {
    // Listen for task submissions from any component
    window.addEventListener('zoe-background-task', ((e: CustomEvent<BackgroundTask>) => {
      this.addTask(e.detail);
    }) as EventListener);
    
    // Listen for task cancellation
    window.addEventListener('zoe-cancel-task', ((e: CustomEvent<{ taskId: string }>) => {
      this.cancelTask(e.detail.taskId);
    }) as EventListener);
    
    // Listen for queue status requests
    window.addEventListener('zoe-queue-status', (() => {
      window.dispatchEvent(new CustomEvent('zoe-queue-status-response', {
        detail: {
          pending: this.taskQueue.filter(t => t.status === 'pending').length,
          processing: this.taskQueue.filter(t => t.status === 'processing').length,
          completed: this.taskQueue.filter(t => t.status === 'completed').length,
          failed: this.taskQueue.filter(t => t.status === 'failed').length,
        }
      }));
    }) as EventListener);
  }
  
  private startBackgroundLoop() {
    // MOBILE OPTIMIZATION: Process queue less frequently to save battery
    // Use 2 seconds on mobile-like devices, 500ms on desktop
    const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const loopInterval = isMobileDevice ? 2000 : 500;
    
    setInterval(() => {
      if (!this.isProcessing) {
        this.processNextTask();
      }
    }, loopInterval);
  }
  
  addTask(task: Omit<BackgroundTask, 'id' | 'status' | 'createdAt'>, callback?: TaskCallback): string {
    const fullTask: BackgroundTask = {
      ...task,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending',
      createdAt: Date.now(),
    };
    
    this.taskQueue.push(fullTask);
    if (callback) {
      this.callbacks.set(fullTask.id, callback);
    }
    
    this.persistQueue();
    console.log(`[ZoeBackground] ➕ Task added: ${fullTask.type} (${fullTask.id})`);
    
    // Notify listeners
    window.dispatchEvent(new CustomEvent('zoe-task-added', { detail: fullTask }));
    
    return fullTask.id;
  }
  
  cancelTask(taskId: string) {
    const task = this.taskQueue.find(t => t.id === taskId);
    if (task && task.status === 'pending') {
      task.status = 'failed';
      task.error = 'Cancelled by user';
      this.persistQueue();
      console.log(`[ZoeBackground] ❌ Task cancelled: ${taskId}`);
    }
  }
  
  private async processNextTask() {
    const pendingTask = this.taskQueue.find(t => t.status === 'pending');
    if (!pendingTask) return;
    
    this.isProcessing = true;
    pendingTask.status = 'processing';
    this.persistQueue();
    
    console.log(`[ZoeBackground] ⚙️ Processing: ${pendingTask.type} (${pendingTask.id})`);
    
    try {
      const result = await this.executeTask(pendingTask);
      pendingTask.status = 'completed';
      pendingTask.completedAt = Date.now();
      pendingTask.result = result;
      
      console.log(`[ZoeBackground] ✅ Completed: ${pendingTask.type} (${pendingTask.id})`);
      
      // Notify via callback
      const callback = this.callbacks.get(pendingTask.id);
      if (callback?.onComplete) {
        callback.onComplete(pendingTask);
      }
      
      // Notify via event
      window.dispatchEvent(new CustomEvent('zoe-task-completed', { detail: pendingTask }));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      pendingTask.status = 'failed';
      pendingTask.error = errorMsg;
      
      console.error(`[ZoeBackground] ❌ Failed: ${pendingTask.type} (${pendingTask.id})`, error);
      
      // Notify via callback
      const callback = this.callbacks.get(pendingTask.id);
      if (callback?.onError) {
        callback.onError(pendingTask, errorMsg);
      }
      
      // Notify via event
      window.dispatchEvent(new CustomEvent('zoe-task-failed', { detail: pendingTask }));
    }
    
    this.callbacks.delete(pendingTask.id);
    this.persistQueue();
    this.isProcessing = false;
  }
  
  private async executeTask(task: BackgroundTask): Promise<any> {
    switch (task.type) {
      case 'chat':
        return this.processChatTask(task);
      case 'profile-update':
        return this.processProfileUpdateTask(task);
      case 'youtube-analysis':
        return this.processYouTubeAnalysisTask(task);
      case 'media-processing':
        return this.processMediaTask(task);
      case 'voice-command':
        return this.processVoiceCommandTask(task);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }
  
  private async processChatTask(task: BackgroundTask): Promise<any> {
    const { message, userId, context } = task.payload;
    
    const { data, error } = await supabase.functions.invoke('zoe-omega-chat', {
      body: { message, userId, context }
    });
    
    if (error) throw error;
    
    // Optionally speak the response
    if (data?.response && task.payload.speakResponse) {
      speakAsZoe(data.response);
    }
    
    return data;
  }
  
  private async processProfileUpdateTask(task: BackgroundTask): Promise<any> {
    const { userId, updates, source } = task.payload;
    
    // Update profile in database
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId);
    
    if (error) throw error;
    
    // Announce completion
    const updatedFields = Object.keys(updates).filter(k => updates[k] !== null && updates[k] !== undefined);
    if (updatedFields.length > 0 && task.payload.announce) {
      const message = `I've updated your ${updatedFields.join(', ')} in your profile.`;
      speakAsZoe(message);
      toast.success('Profile updated by Zoe', { description: message });
    }
    
    return { updatedFields, source };
  }
  
  private async processYouTubeAnalysisTask(task: BackgroundTask): Promise<any> {
    const { videoUrl, userId, onAnalysisComplete } = task.payload;
    
    const { data, error } = await supabase.functions.invoke('analyze-youtube', {
      body: { video_url: videoUrl, user_id: userId }
    });
    
    if (error) throw error;
    
    // Dispatch result event for any listening UI
    window.dispatchEvent(new CustomEvent('zoe-youtube-analysis-complete', {
      detail: { videoUrl, analysis: data }
    }));
    
    return data;
  }
  
  private async processMediaTask(task: BackgroundTask): Promise<any> {
    const { mediaType, mediaData, context, userId } = task.payload;
    
    if (mediaType === 'video') {
      const { data, error } = await supabase.functions.invoke('process-live-video', {
        body: {
          video_data: mediaData,
          context: context || 'Analyze this video',
          analysis_type: 'comprehensive'
        }
      });
      
      if (error) throw error;
      return data;
    }
    
    // For images/documents, use zoe-omega-vision
    const { data, error } = await supabase.functions.invoke('zoe-omega-vision', {
      body: { image: mediaData, context, userId }
    });
    
    if (error) throw error;
    return data;
  }
  
  private async processVoiceCommandTask(task: BackgroundTask): Promise<any> {
    const { command, userId, context } = task.payload;
    
    const { data, error } = await supabase.functions.invoke('zoe-agent', {
      body: { command, userId, context }
    });
    
    if (error) throw error;
    
    if (data?.message && task.payload.speakResponse) {
      speakAsZoe(data.message);
    }
    
    return data;
  }
  
  // Public API
  getQueueStatus() {
    return {
      pending: this.taskQueue.filter(t => t.status === 'pending').length,
      processing: this.taskQueue.filter(t => t.status === 'processing').length,
      completed: this.taskQueue.filter(t => t.status === 'completed').length,
      failed: this.taskQueue.filter(t => t.status === 'failed').length,
      tasks: this.taskQueue.slice(-20), // Last 20 tasks
    };
  }
  
  getTask(taskId: string): BackgroundTask | undefined {
    return this.taskQueue.find(t => t.id === taskId);
  }
  
  clearCompletedTasks() {
    this.taskQueue = this.taskQueue.filter(t => t.status !== 'completed');
    this.persistQueue();
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const zoeBackgroundProcessor = ZoeBackgroundProcessorService.getInstance();

// Helper functions for easy access
export const addBackgroundTask = (
  type: BackgroundTask['type'],
  payload: Record<string, any>,
  callback?: TaskCallback
): string => {
  return zoeBackgroundProcessor.addTask({ type, payload }, callback);
};

export const getBackgroundQueueStatus = () => zoeBackgroundProcessor.getQueueStatus();
export const getBackgroundTask = (id: string) => zoeBackgroundProcessor.getTask(id);
export const clearCompletedBackgroundTasks = () => zoeBackgroundProcessor.clearCompletedTasks();
