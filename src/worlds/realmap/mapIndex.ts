/**
 * What's loaded on the Real Map right now (per ~200 m block): streets with
 * names, named buildings and places. Street traffic and the in-world search
 * read from here, so nothing is fetched twice.
 */
import { useSyncExternalStore } from 'react';
import type { OsmChunk } from './osm';

const blocks = new Map<string, OsmChunk>();
let version = 0;
const ls = new Set<() => void>();
const emit = () => { version++; ls.forEach((l) => l()); };

export function indexBlock(key: string, d: OsmChunk) { blocks.set(key, d); emit(); }
export function dropBlock(key: string) { if (blocks.delete(key)) emit(); }
export const mapBlocks = () => blocks;
export const useMapVersion = () => useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => version, () => version);
export function __resetMapIndex() { blocks.clear(); emit(); }
