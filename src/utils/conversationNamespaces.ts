// Shared, DB-safe namespacing for conversations stored in ai_companion_messages.
// This avoids schema migrations while keeping Zoe Infinity isolated from MMORA/Orb.

export const ZOE_INFINITY_MARKER = '[[ZOE_INFINITY]]';

export const isZoeInfinityMessage = (content: string | null | undefined): boolean =>
  !!content && content.includes(ZOE_INFINITY_MARKER);

export const addZoeInfinityMarker = (content: string): string =>
  content.includes(ZOE_INFINITY_MARKER) ? content : `${ZOE_INFINITY_MARKER} ${content}`;

export const stripZoeInfinityMarker = (content: string): string =>
  content.replace(ZOE_INFINITY_MARKER, '').trim();
