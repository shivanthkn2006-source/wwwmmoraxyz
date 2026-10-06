/**
 * Entering a building (Real Map or M'Mora World) opens its room: a wooden side
 * table with a drawer, maybe a Green Herb and antique coins. Pickups use the
 * same ids as vrPickups, so taken items stay taken everywhere.
 */
import { useSyncExternalStore } from 'react';

export type Room = { id: string; name: string; herbId?: string; coinId?: string; coinAmt?: number };
let room: Room | null = null;
const ls = new Set<() => void>();
export function enterRoom(r: Room) { room = r; ls.forEach((l) => l()); }
export function leaveRoom() { room = null; ls.forEach((l) => l()); }
export const getRoom = () => room;
export const useRoom = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => room, () => room);
