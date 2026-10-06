/// <reference lib="webworker" />
/** Background map worker: decodes big map answers off the main thread so 3D and Zoe's voice stay smooth. */
import { parseOverpass } from './osmParse';
self.onmessage = (e: MessageEvent<{ id: number; text: string; cap: number }>) => {
  const { id, text, cap } = e.data;
  try { (self as unknown as Worker).postMessage({ id, chunk: parseOverpass(JSON.parse(text), cap) }); }
  catch (err) { (self as unknown as Worker).postMessage({ id, error: String(err) }); }
};
