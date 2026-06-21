import { useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface BatchedNotification {
  type: string;
  count: number;
  users: string[];
  firstNotification: any;
  timeout?: NodeJS.Timeout;
}

export const useNotificationBatching = (
  batchingEnabled: boolean,
  batchingWindowMinutes: number
) => {
  const batches = useRef<Map<string, BatchedNotification>>(new Map());

  const showBatchedNotification = useCallback((batch: BatchedNotification) => {
    const { type, count, users } = batch;
    
    let message = '';
    const userList = users.slice(0, 3).join(', ');
    const remainingCount = Math.max(0, count - 3);

    switch (type) {
      case 'post_like':
        message = count === 1 
          ? `${userList} liked your post`
          : `${userList}${remainingCount > 0 ? ` and ${remainingCount} others` : ''} liked your post`;
        break;
      case 'post_comment':
        message = count === 1
          ? `${userList} commented on your post`
          : `${userList}${remainingCount > 0 ? ` and ${remainingCount} others` : ''} commented on your post`;
        break;
      case 'comment_like':
        message = count === 1
          ? `${userList} liked your comment`
          : `${userList}${remainingCount > 0 ? ` and ${remainingCount} others` : ''} liked your comment`;
        break;
      case 'friend_request':
        message = count === 1
          ? `${userList} sent you a friend request`
          : `${userList}${remainingCount > 0 ? ` and ${remainingCount} others` : ''} sent you friend requests`;
        break;
      default:
        message = `${count} new ${type} notifications`;
    }

    toast(message, {
      duration: 4000,
      action: {
        label: 'View',
        onClick: () => {
          // Navigate to notifications
          window.location.href = '/notification-history';
        },
      },
    });

    batches.current.delete(type);
  }, []);

  const addNotification = useCallback((notification: any, userName: string) => {
    if (!batchingEnabled) {
      // Show immediately if batching is disabled
      return false;
    }

    const type = notification.type;
    const existing = batches.current.get(type);

    if (existing) {
      // Add to existing batch
      existing.count++;
      existing.users.push(userName);
      
      // Clear existing timeout
      if (existing.timeout) {
        clearTimeout(existing.timeout);
      }

      // Set new timeout
      const timeout = setTimeout(() => {
        showBatchedNotification(existing);
      }, batchingWindowMinutes * 60 * 1000);

      existing.timeout = timeout;
      batches.current.set(type, existing);
    } else {
      // Create new batch
      const timeout = setTimeout(() => {
        const batch = batches.current.get(type);
        if (batch) {
          showBatchedNotification(batch);
        }
      }, batchingWindowMinutes * 60 * 1000);

      batches.current.set(type, {
        type,
        count: 1,
        users: [userName],
        firstNotification: notification,
        timeout,
      });
    }

    return true; // Notification was batched
  }, [batchingEnabled, batchingWindowMinutes, showBatchedNotification]);

  const flushBatch = useCallback((type: string) => {
    const batch = batches.current.get(type);
    if (batch) {
      if (batch.timeout) {
        clearTimeout(batch.timeout);
      }
      showBatchedNotification(batch);
    }
  }, [showBatchedNotification]);

  const flushAllBatches = useCallback(() => {
    batches.current.forEach((batch) => {
      if (batch.timeout) {
        clearTimeout(batch.timeout);
      }
      showBatchedNotification(batch);
    });
  }, [showBatchedNotification]);

  return {
    addNotification,
    flushBatch,
    flushAllBatches,
  };
};