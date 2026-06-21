/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ZOE-NEXUS: SHADOW WORKER HOOK (Phase 3 - RIBs Equivalent)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Bridge between Main Thread (React) and Shadow Worker (Background Processing)
 * 
 * ARCHITECTURE:
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │                          MAIN THREAD (60 FPS)                               │
 * │  ┌─────────────┐     ┌──────────────────┐     ┌────────────────────┐        │
 * │  │ React UI    │────▶│ useShadowWorker  │────▶│ Three.js/Map       │        │
 * │  │ (Buttons)   │     │ (This Hook)      │     │ (Rendering)        │        │
 * │  └─────────────┘     └────────┬─────────┘     └────────────────────┘        │
 * └───────────────────────────────┼─────────────────────────────────────────────┘
 *                                 │ postMessage()
 *                                 ▼
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │                          WORKER THREAD (Heavy Lifting)                       │
 * │  ┌──────────────────────────────────────────────────────────────────────┐   │
 * │  │ zoe-data-processor.worker.ts                                          │   │
 * │  │ - Binary Decoding                                                     │   │
 * │  │ - Distance Calculations                                               │   │
 * │  │ - Soulmate Filtering                                                  │   │
 * │  │ - Interpolation Math                                                  │   │
 * │  └──────────────────────────────────────────────────────────────────────┘   │
 * └──────────────────────────────────────────────────────────────────────────────┘
 * 
 * RESULT: UI stays buttery smooth (60 FPS) even with 5,000 signals
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useRef, useCallback, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ProcessedUser {
  user_id: string;
  userIdHash: number;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen: number;
  significance_score: number;
  distance_from_me?: number;
  is_soulmate_candidate?: boolean;
}

interface BinaryTickPacket {
  packetType: 'delta' | 'full' | 'status';
  userCount: number;
  timestamp: number;
  users: any[];
  rawBytes: number;
  compressionRatio: number;
}

interface WorkerStats {
  messagesProcessed: number;
  binaryPacketsDecoded: number;
  usersProcessed: number;
  distanceCalculations: number;
  interpolations: number;
  cleanupOperations: number;
  totalProcessingTimeMs: number;
  averageProcessingTimeMs: number;
  peakProcessingTimeMs: number;
  lastProcessedAt: number;
}

interface FullProcessResult {
  users: ProcessedUser[];
  decoded: BinaryTickPacket;
  nearbyCount: number;
  onlineCount: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

interface UseShadowWorkerOptions {
  enabled?: boolean;
  onStats?: (stats: WorkerStats) => void;
  onError?: (error: Error) => void;
  timeoutMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORKER INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

let workerInstance: Worker | null = null;
let workerInitPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (workerInstance) {
    return Promise.resolve(workerInstance);
  }
  
  if (workerInitPromise) {
    return workerInitPromise;
  }
  
  workerInitPromise = new Promise((resolve, reject) => {
    try {
      // Create inline worker from the compiled TypeScript
      const workerCode = `
        // Shadow Worker - Inline Version
        const HEADER_SIZE = 6;
        const USER_BLOCK_SIZE = 24;
        const STALE_USER_TIMEOUT_MS = 60000;
        const INTERPOLATION_FACTOR = 0.15;
        const EARTH_RADIUS_KM = 6371;

        const REVERSE_STATUS_MAP = { 0: 'offline', 1: 'online', 2: 'away', 3: 'busy' };
        const REVERSE_PACKET_TYPE_MAP = { 0: 'delta', 1: 'full', 2: 'status' };

        let workerStats = {
          messagesProcessed: 0,
          binaryPacketsDecoded: 0,
          usersProcessed: 0,
          distanceCalculations: 0,
          interpolations: 0,
          cleanupOperations: 0,
          totalProcessingTimeMs: 0,
          averageProcessingTimeMs: 0,
          peakProcessingTimeMs: 0,
          lastProcessedAt: 0,
        };

        function base64ToArrayBuffer(base64) {
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes.buffer;
        }

        function decodeTickPacket(buffer) {
          const view = new DataView(buffer);
          let offset = 0;
          
          const packetType = REVERSE_PACKET_TYPE_MAP[view.getUint8(offset++)];
          const userCount = view.getUint8(offset++);
          const timestamp = view.getFloat32(offset, true) * 1000;
          offset += 4;
          
          const users = [];
          
          for (let i = 0; i < userCount && offset + USER_BLOCK_SIZE <= buffer.byteLength; i++) {
            const userIdHash = view.getUint32(offset, true); offset += 4;
            const lat = view.getFloat32(offset, true); offset += 4;
            const lng = view.getFloat32(offset, true); offset += 4;
            const headingRaw = view.getInt16(offset, true); offset += 2;
            const speedRaw = view.getUint16(offset, true); offset += 2;
            const status = REVERSE_STATUS_MAP[view.getUint8(offset++)] || 'online';
            const significanceScore = view.getUint8(offset++);
            const deltaLat = view.getFloat32(offset, true); offset += 4;
            const avatarType = view.getInt16(offset, true); offset += 2;
            
            users.push({
              userIdHash,
              lat,
              lng,
              heading: headingRaw === -1 ? null : headingRaw,
              speed: speedRaw === 0 ? null : speedRaw / 10,
              status,
              significanceScore,
              deltaLat: deltaLat !== 0 ? deltaLat : undefined,
              avatarType,
            });
          }
          
          const estimatedJsonSize = userCount * 150;
          const binarySize = buffer.byteLength;
          const compressionRatio = estimatedJsonSize > 0 ? ((1 - binarySize / estimatedJsonSize) * 100) : 0;
          
          workerStats.binaryPacketsDecoded++;
          workerStats.usersProcessed += userCount;
          
          return { packetType, userCount, timestamp, users, rawBytes: binarySize, compressionRatio };
        }

        function calculateDistance(lat1, lng1, lat2, lng2) {
          const toRad = (deg) => deg * (Math.PI / 180);
          const dLat = toRad(lat2 - lat1);
          const dLng = toRad(lng2 - lng1);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                    Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          workerStats.distanceCalculations++;
          return EARTH_RADIUS_KM * c * 1000;
        }

        function interpolatePositions(existingUsers, newUsers, myUserId, now) {
          const results = [];
          for (const bUser of newUsers) {
            const syntheticUserId = 'hash_' + bUser.userIdHash.toString(16);
            if (syntheticUserId === myUserId) continue;
            const existing = existingUsers.get(syntheticUserId);
            if (existing) {
              results.push({
                user_id: syntheticUserId,
                userIdHash: bUser.userIdHash,
                lat: existing.lat + (bUser.lat - existing.lat) * INTERPOLATION_FACTOR,
                lng: existing.lng + (bUser.lng - existing.lng) * INTERPOLATION_FACTOR,
                heading: bUser.heading ?? existing.heading,
                speed: bUser.speed ?? existing.speed,
                status: bUser.status,
                last_seen: now,
                significance_score: bUser.significanceScore,
              });
              workerStats.interpolations++;
            } else {
              results.push({
                user_id: syntheticUserId,
                userIdHash: bUser.userIdHash,
                lat: bUser.lat,
                lng: bUser.lng,
                heading: bUser.heading ?? undefined,
                speed: bUser.speed ?? undefined,
                status: bUser.status,
                last_seen: now,
                significance_score: bUser.significanceScore,
              });
            }
          }
          return results;
        }

        function cleanupStaleUsers(users, now) {
          workerStats.cleanupOperations++;
          return users.filter(u => now - u.last_seen <= STALE_USER_TIMEOUT_MS);
        }

        function filterSoulmates(params) {
          const { users, myLat, myLng, maxDistanceKm, minSignificance } = params;
          return users
            .map(user => ({ ...user, distance_from_me: calculateDistance(myLat, myLng, user.lat, user.lng) }))
            .filter(user => user.distance_from_me <= maxDistanceKm * 1000 && user.significance_score >= minSignificance && user.status === 'online')
            .map(user => ({ ...user, is_soulmate_candidate: true }))
            .sort((a, b) => a.distance_from_me - b.distance_from_me);
        }

        function calculateDistancesFromMe(users, myLat, myLng) {
          return users.map(user => ({ ...user, distance_from_me: calculateDistance(myLat, myLng, user.lat, user.lng) }));
        }

        function fullProcess(payload) {
          const { base64Data, existingUsers, myUserId, myLat, myLng } = payload;
          const now = Date.now();
          const buffer = base64ToArrayBuffer(base64Data);
          const decoded = decodeTickPacket(buffer);
          const existingMap = new Map(existingUsers);
          let users = interpolatePositions(existingMap, decoded.users, myUserId, now);
          existingMap.forEach((user, id) => { if (!users.find(u => u.user_id === id)) users.push(user); });
          users = cleanupStaleUsers(users, now);
          if (myLat !== undefined && myLng !== undefined) users = calculateDistancesFromMe(users, myLat, myLng);
          const nearbyCount = users.filter(u => (u.distance_from_me || Infinity) < 1000).length;
          const onlineCount = users.filter(u => u.status === 'online').length;
          return { users, decoded, nearbyCount, onlineCount };
        }

        self.onmessage = (event) => {
          const startTime = performance.now();
          const { type, payload, requestId } = event.data;
          workerStats.messagesProcessed++;
          let response;
          try {
            switch (type) {
              case 'PING':
                response = { type: 'PONG', payload: { ready: true, stats: workerStats }, requestId, processingTimeMs: performance.now() - startTime };
                break;
              case 'DECODE_BINARY':
                const buffer = base64ToArrayBuffer(payload.base64Data);
                const decoded = decodeTickPacket(buffer);
                response = { type: 'DECODED', payload: decoded, requestId, processingTimeMs: performance.now() - startTime };
                break;
              case 'PROCESS_DELTAS':
                const result = fullProcess(payload);
                response = { type: 'PROCESSED', payload: result, requestId, processingTimeMs: performance.now() - startTime };
                break;
              case 'CALCULATE_DISTANCES':
                const withDistances = calculateDistancesFromMe(payload.users, payload.myLat, payload.myLng);
                response = { type: 'DISTANCES', payload: withDistances, requestId, processingTimeMs: performance.now() - startTime };
                break;
              case 'FILTER_SOULMATES':
                const soulmates = filterSoulmates(payload);
                response = { type: 'SOULMATES', payload: soulmates, requestId, processingTimeMs: performance.now() - startTime };
                break;
              case 'CLEANUP_STALE':
                const cleaned = cleanupStaleUsers(payload.users, Date.now());
                response = { type: 'CLEANED', payload: cleaned, requestId, processingTimeMs: performance.now() - startTime };
                break;
              case 'INTERPOLATE':
                const existingMap = new Map(payload.existingUsers);
                const interpolated = interpolatePositions(existingMap, payload.newUsers, payload.myUserId, Date.now());
                response = { type: 'INTERPOLATED', payload: interpolated, requestId, processingTimeMs: performance.now() - startTime };
                break;
              default:
                response = { type: 'ERROR', payload: { message: 'Unknown message type: ' + type }, requestId, processingTimeMs: performance.now() - startTime };
            }
          } catch (error) {
            response = { type: 'ERROR', payload: { message: error.message, stack: error.stack }, requestId, processingTimeMs: performance.now() - startTime };
          }
          const processingTime = performance.now() - startTime;
          workerStats.totalProcessingTimeMs += processingTime;
          workerStats.averageProcessingTimeMs = workerStats.totalProcessingTimeMs / workerStats.messagesProcessed;
          workerStats.peakProcessingTimeMs = Math.max(workerStats.peakProcessingTimeMs, processingTime);
          workerStats.lastProcessedAt = Date.now();
          self.postMessage(response);
          if (workerStats.messagesProcessed % 10 === 0) {
            self.postMessage({ type: 'STATS', payload: workerStats, requestId: 'stats_' + Date.now(), processingTimeMs: 0 });
          }
        };
        self.postMessage({ type: 'PONG', payload: { ready: true, initialized: true }, requestId: 'init', processingTimeMs: 0 });
        console.log('[SHADOW_WORKER] ZOE-NEXUS Shadow Worker initialized');
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      
      const initTimeout = setTimeout(() => {
        reject(new Error('Worker initialization timeout'));
      }, 5000);
      
      worker.onmessage = (event) => {
        if (event.data.type === 'PONG' && event.data.payload?.initialized) {
          clearTimeout(initTimeout);
          workerInstance = worker;
          console.log('[SHADOW_WORKER] Worker ready');
          resolve(worker);
        }
      };
      
      worker.onerror = (error) => {
        clearTimeout(initTimeout);
        console.error('[SHADOW_WORKER] Worker error:', error);
        reject(error);
      };
    } catch (error) {
      reject(error);
    }
  });
  
  return workerInitPromise;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useShadowWorker(options: UseShadowWorkerOptions = {}) {
  const {
    enabled = true,
    onStats,
    onError,
    timeoutMs = 5000,
  } = options;
  
  const [isReady, setIsReady] = useState(false);
  const [workerStats, setWorkerStats] = useState<WorkerStats | null>(null);
  const pendingRequests = useRef<Map<string, PendingRequest>>(new Map());
  const workerRef = useRef<Worker | null>(null);
  const requestCounter = useRef(0);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE WORKER
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (!enabled) return;
    
    let mounted = true;
    
    getWorker()
      .then(worker => {
        if (!mounted) return;
        
        workerRef.current = worker;
        
        worker.onmessage = (event) => {
          const { type, payload, requestId, processingTimeMs } = event.data;
          
          // Handle stats broadcasts
          if (type === 'STATS') {
            setWorkerStats(payload);
            onStats?.(payload);
            
            // Dispatch to Zoe Core
            window.dispatchEvent(new CustomEvent('zoe-core-event', {
              detail: {
                type: 'shadow_worker_stats',
                payload: {
                  ...payload,
                  timestamp: Date.now(),
                  protocol: 'ZOE-NEXUS-SHADOW',
                }
              }
            }));
            return;
          }
          
          // Handle pending requests
          const pending = pendingRequests.current.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pendingRequests.current.delete(requestId);
            
            if (type === 'ERROR') {
              const error = new Error(payload.message);
              onError?.(error);
              pending.reject(error);
            } else {
              pending.resolve({ ...payload, processingTimeMs });
            }
          }
        };
        
        worker.onerror = (error) => {
          console.error('[SHADOW_WORKER] Error:', error);
          onError?.(new Error(error.message));
        };
        
        setIsReady(true);
        
        // Dispatch ready event to Zoe Core
        window.dispatchEvent(new CustomEvent('zoe-core-event', {
          detail: {
            type: 'shadow_worker_ready',
            payload: {
              timestamp: Date.now(),
              protocol: 'ZOE-NEXUS-SHADOW',
            }
          }
        }));
      })
      .catch(error => {
        console.error('[SHADOW_WORKER] Failed to initialize:', error);
        onError?.(error);
      });
    
    return () => {
      mounted = false;
    };
  }, [enabled, onStats, onError]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SEND MESSAGE TO WORKER
  // ═══════════════════════════════════════════════════════════════════════════
  
  const sendMessage = useCallback(<T>(
    type: string,
    payload: any
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isReady) {
        reject(new Error('Worker not ready'));
        return;
      }
      
      const requestId = `req_${++requestCounter.current}_${Date.now()}`;
      
      const timeout = setTimeout(() => {
        pendingRequests.current.delete(requestId);
        reject(new Error(`Request timeout: ${type}`));
      }, timeoutMs);
      
      pendingRequests.current.set(requestId, { resolve, reject, timeout });
      
      workerRef.current.postMessage({ type, payload, requestId });
    });
  }, [isReady, timeoutMs]);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════
  
  const decodeBinary = useCallback(async (base64Data: string): Promise<BinaryTickPacket & { processingTimeMs: number }> => {
    return sendMessage('DECODE_BINARY', { base64Data });
  }, [sendMessage]);
  
  const processDeltas = useCallback(async (
    base64Data: string,
    existingUsers: [string, ProcessedUser][],
    myUserId: string,
    myLat?: number,
    myLng?: number
  ): Promise<FullProcessResult & { processingTimeMs: number }> => {
    return sendMessage('PROCESS_DELTAS', {
      base64Data,
      existingUsers,
      myUserId,
      myLat,
      myLng,
    });
  }, [sendMessage]);
  
  const calculateDistances = useCallback(async (
    users: ProcessedUser[],
    myLat: number,
    myLng: number
  ): Promise<ProcessedUser[] & { processingTimeMs: number }> => {
    return sendMessage('CALCULATE_DISTANCES', { users, myLat, myLng });
  }, [sendMessage]);
  
  const filterSoulmates = useCallback(async (
    users: ProcessedUser[],
    myLat: number,
    myLng: number,
    maxDistanceKm: number = 10,
    minSignificance: number = 50
  ): Promise<ProcessedUser[] & { processingTimeMs: number }> => {
    return sendMessage('FILTER_SOULMATES', {
      users,
      myLat,
      myLng,
      maxDistanceKm,
      minSignificance,
    });
  }, [sendMessage]);
  
  const cleanupStaleUsers = useCallback(async (
    users: ProcessedUser[]
  ): Promise<ProcessedUser[] & { processingTimeMs: number }> => {
    return sendMessage('CLEANUP_STALE', { users });
  }, [sendMessage]);
  
  const ping = useCallback(async (): Promise<{ ready: boolean; stats: WorkerStats; processingTimeMs: number }> => {
    return sendMessage('PING', {});
  }, [sendMessage]);
  
  return {
    isReady,
    workerStats,
    decodeBinary,
    processDeltas,
    calculateDistances,
    filterSoulmates,
    cleanupStaleUsers,
    ping,
  };
}

export default useShadowWorker;
