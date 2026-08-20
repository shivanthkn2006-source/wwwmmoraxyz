/**
 * Ambient search routing + dispatch resolution.
 * Maps universal-index entity types and <zoe_dispatch> actions to app routes.
 * Pure logic — no UI.
 */
import type { AmbientSearchRecord, ZoeDispatchAction } from '@/core/ports/useAmbientSearch';

export function routeForEntity(entityType: string, entityId: string): string {
  switch (entityType) {
    case 'post':
    case 'loop_video':
    case 'image':
    case 'quote':
      return `/home?post=${entityId}`;
    case 'chat':
      return `/zoe-infinity?thread=${entityId}`;
    case 'dhf_node':
      return `/dhf?node=${entityId}`;
    case 'spot':
      return `/selfie-city?pin=${entityId}`;
    case '3d_asset':
      return `/dhf?asset=${entityId}`;
    case 'profile':
    case 'user':
      return `/profile/${entityId}`;
    default:
      return `/home?ref=${entityId}`;
  }
}

export function labelForRecord(record: AmbientSearchRecord): string {
  const raw = (record.content_synthesis || '').replace(/\s+/g, ' ').trim();
  const title = (record.metadata as any)?.title;
  return (title || raw || record.entity_type).slice(0, 80);
}

/** Resolve an agentic dispatch block into a navigation target (or null if not navigational). */
export function routeForDispatch(action: ZoeDispatchAction | null | undefined): string | null {
  if (!action || !action.action) return null;
  const payload = action.payload || {};
  switch (action.action.toUpperCase()) {
    case 'OPEN_POST':
    case 'PLAY_LOOP':
    case 'OPEN_LOOP':
      return payload.postId || payload.entityId ? `/home?post=${payload.postId || payload.entityId}` : '/home';
    case 'OPEN_PROFILE':
      return payload.userId ? `/profile/${payload.userId}` : null;
    case 'OPEN_CHAT':
    case 'ASK_ZOE':
      return '/zoe-infinity';
    case 'OPEN_DHF':
      return '/dhf';
    case 'NAVIGATE':
      return typeof payload.route === 'string' && payload.route.startsWith('/') ? payload.route : null;
    default:
      return null;
  }
}
