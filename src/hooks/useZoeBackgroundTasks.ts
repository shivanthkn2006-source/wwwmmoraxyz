/**
 * USE ZOE BACKGROUND TASKS HOOK
 * React hook to interact with the global Zoe background processor
 * Works across the entire platform even when chat window is closed
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  zoeBackgroundProcessor, 
  BackgroundTask,
  addBackgroundTask,
  getBackgroundQueueStatus,
} from '@/services/ZoeBackgroundProcessor';

interface BackgroundTasksState {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  recentTasks: BackgroundTask[];
}

export function useZoeBackgroundTasks() {
  const [state, setState] = useState<BackgroundTasksState>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    recentTasks: [],
  });
  
  // Refresh state from processor
  const refresh = useCallback(() => {
    const status = getBackgroundQueueStatus();
    setState({
      pending: status.pending,
      processing: status.processing,
      completed: status.completed,
      failed: status.failed,
      recentTasks: status.tasks,
    });
  }, []);
  
  // Subscribe to task events
  useEffect(() => {
    const handleTaskChange = () => refresh();
    
    window.addEventListener('zoe-task-added', handleTaskChange);
    window.addEventListener('zoe-task-completed', handleTaskChange);
    window.addEventListener('zoe-task-failed', handleTaskChange);
    
    // Initial load
    refresh();
    
    // Refresh every 2 seconds to catch any updates
    const interval = setInterval(refresh, 2000);
    
    return () => {
      window.removeEventListener('zoe-task-added', handleTaskChange);
      window.removeEventListener('zoe-task-completed', handleTaskChange);
      window.removeEventListener('zoe-task-failed', handleTaskChange);
      clearInterval(interval);
    };
  }, [refresh]);
  
  // Add a chat task
  const addChatTask = useCallback((
    message: string, 
    userId: string, 
    options?: { speakResponse?: boolean; context?: Record<string, any> }
  ) => {
    return addBackgroundTask('chat', {
      message,
      userId,
      speakResponse: options?.speakResponse ?? true,
      context: options?.context,
    });
  }, []);
  
  // Add a profile update task
  const addProfileUpdateTask = useCallback((
    userId: string,
    updates: Record<string, any>,
    options?: { announce?: boolean; source?: string }
  ) => {
    return addBackgroundTask('profile-update', {
      userId,
      updates,
      announce: options?.announce ?? true,
      source: options?.source ?? 'background',
    });
  }, []);
  
  // Add a YouTube analysis task
  const addYouTubeTask = useCallback((videoUrl: string, userId: string) => {
    return addBackgroundTask('youtube-analysis', {
      videoUrl,
      userId,
    });
  }, []);
  
  // Add a media processing task
  const addMediaTask = useCallback((
    mediaType: 'image' | 'video' | 'document',
    mediaData: string,
    userId: string,
    context?: string
  ) => {
    return addBackgroundTask('media-processing', {
      mediaType,
      mediaData,
      userId,
      context,
    });
  }, []);
  
  // Add a voice command task
  const addVoiceCommandTask = useCallback((
    command: string,
    userId: string,
    options?: { speakResponse?: boolean; context?: Record<string, any> }
  ) => {
    return addBackgroundTask('voice-command', {
      command,
      userId,
      speakResponse: options?.speakResponse ?? true,
      context: options?.context,
    });
  }, []);
  
  // Cancel a task
  const cancelTask = useCallback((taskId: string) => {
    window.dispatchEvent(new CustomEvent('zoe-cancel-task', { detail: { taskId } }));
    refresh();
  }, [refresh]);
  
  // Clear completed tasks
  const clearCompleted = useCallback(() => {
    zoeBackgroundProcessor.clearCompletedTasks();
    refresh();
  }, [refresh]);
  
  return {
    ...state,
    isProcessing: state.processing > 0,
    hasPending: state.pending > 0,
    addChatTask,
    addProfileUpdateTask,
    addYouTubeTask,
    addMediaTask,
    addVoiceCommandTask,
    cancelTask,
    clearCompleted,
    refresh,
  };
}

export default useZoeBackgroundTasks;
