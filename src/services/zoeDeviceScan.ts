/**
 * ZOE DEVICE SCAN — honest hardware inventory saved into the member's DHF.
 *
 * Checks microphone, camera, speaker, memory and CPU using only what the
 * browser/OS actually reports. Nothing is guessed: any value the device will
 * not expose is `null` and shown as "—", with the reason recorded.
 *
 * It NEVER opens a permission prompt: it reads the Permissions API and the
 * device list only. Runs once per new device after sign-in, again when the
 * last scan is older than 24h, and on demand ("Zoe, scan new device").
 */
import { logBehavioralEvent, resolveAuthUid } from '@/lib/safeTelemetry';
import { getLineageSessionId, recordDhfLineage } from '@/services/dhfLineage';

export type PermissionStateLite = 'granted' | 'denied' | 'prompt' | null;

export interface DeviceScanResult {
  scannedAt: string;
  deviceKey: string;
  isNewDevice: boolean;
  microphone: { permission: PermissionStateLite; inputs: number | null };
  camera: { permission: PermissionStateLite; inputs: number | null };
  speaker: { outputs: number | null; canChooseOutput: boolean };
  memory: { deviceGb: number | null; jsHeapUsedMb: number | null; jsHeapLimitMb: number | null };
  cpu: { cores: number | null };
  platform: { os: string; browser: string; screen: string; timezone: string };
  unavailable: Record<string, string>;
}

const LAST_SCAN_KEY = 'mmora.zoe.deviceScan.last.v1';
const KNOWN_DEVICES_KEY = 'mmora.zoe.deviceScan.known.v1';
const RESCAN_MS = 24 * 60 * 60 * 1000;

export const dash = (v: unknown, suffix = ''): string =>
  v === null || v === undefined || v === '' ? '—' : `${v}${suffix}`;

async function queryPermission(name: string): Promise<PermissionStateLite> {
  try {
    const perms = (navigator as Navigator & { permissions?: Permissions }).permissions;
    if (!perms?.query) return null;
    const status = await perms.query({ name: name as PermissionName });
    return status.state as PermissionStateLite;
  } catch {
    return null; // Firefox/Safari do not expose every permission name
  }
}

function detectPlatform() {
  const ua = navigator.userAgent;
  const touch = navigator.maxTouchPoints ?? 0;
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  const os = /iPhone|iPod/.test(ua) ? 'iOS' : iPad ? 'iPadOS' : /Android/.test(ua) ? 'Android'
    : /Windows/.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux' : 'Unknown';
  const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome'
    : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Unknown';
  return {
    os,
    browser,
    screen: `${window.screen?.width ?? 0}×${window.screen?.height ?? 0}@${window.devicePixelRatio || 1}x`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
  };
}

function deviceKeyFor(p: ReturnType<typeof detectPlatform>, cores: number | null, mem: number | null) {
  const raw = [p.os, p.browser, p.screen, cores ?? '-', mem ?? '-'].join('|');
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `dev_${(h >>> 0).toString(36)}`;
}

function readKnown(): string[] {
  try { return JSON.parse(localStorage.getItem(KNOWN_DEVICES_KEY) || '[]'); } catch { return []; }
}

export function getLastDeviceScan(): DeviceScanResult | null {
  try { return JSON.parse(localStorage.getItem(LAST_SCAN_KEY) || 'null'); } catch { return null; }
}

/** Read the device. Never prompts, never simulates. */
export async function scanDevice(): Promise<DeviceScanResult> {
  const unavailable: Record<string, string> = {};
  const platform = detectPlatform();

  const [micPerm, camPerm] = await Promise.all([queryPermission('microphone'), queryPermission('camera')]);
  if (micPerm === null) unavailable.microphonePermission = 'This browser does not report microphone permission';
  if (camPerm === null) unavailable.cameraPermission = 'This browser does not report camera permission';

  let inputsA: number | null = null;
  let inputsV: number | null = null;
  let outputs: number | null = null;
  try {
    if (!navigator.mediaDevices?.enumerateDevices) throw new Error('no enumerateDevices');
    const list = await navigator.mediaDevices.enumerateDevices();
    inputsA = list.filter((d) => d.kind === 'audioinput').length;
    inputsV = list.filter((d) => d.kind === 'videoinput').length;
    const outs = list.filter((d) => d.kind === 'audiooutput').length;
    // Safari/Firefox hide output devices; 0 there means "not reported", not "none".
    outputs = outs > 0 ? outs : null;
    if (outputs === null) unavailable.speaker = 'This browser does not list speakers';
  } catch {
    unavailable.devices = 'This browser does not list media devices';
  }

  const canChooseOutput = typeof (HTMLMediaElement.prototype as unknown as { setSinkId?: unknown }).setSinkId === 'function';
  const deviceGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null;
  if (deviceGb === null) unavailable.memory = 'This browser does not report device memory';
  const heap = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  const cores = navigator.hardwareConcurrency || null;
  if (cores === null) unavailable.cpu = 'This browser does not report CPU cores';

  const deviceKey = deviceKeyFor(platform, cores, deviceGb);
  const known = readKnown();

  return {
    scannedAt: new Date().toISOString(),
    deviceKey,
    isNewDevice: !known.includes(deviceKey),
    microphone: { permission: micPerm, inputs: inputsA },
    camera: { permission: camPerm, inputs: inputsV },
    speaker: { outputs, canChooseOutput },
    memory: {
      deviceGb,
      jsHeapUsedMb: heap ? Math.round(heap.usedJSHeapSize / 1048576) : null,
      jsHeapLimitMb: heap ? Math.round(heap.jsHeapSizeLimit / 1048576) : null,
    },
    cpu: { cores },
    platform,
    unavailable,
  };
}

export interface DeviceScanSaveResult { ok: boolean; scan: DeviceScanResult; reason?: string }

/** Scan and save into the DHF (behavioral event + lineage). */
export async function scanAndSaveDevice(trigger: 'sign-in' | 'voice' | 'manual'): Promise<DeviceScanSaveResult> {
  const scan = await scanDevice();
  try {
    localStorage.setItem(LAST_SCAN_KEY, JSON.stringify(scan));
    const known = readKnown();
    if (!known.includes(scan.deviceKey)) localStorage.setItem(KNOWN_DEVICES_KEY, JSON.stringify([...known, scan.deviceKey].slice(-20)));
  } catch { /* storage unavailable */ }

  const uid = await resolveAuthUid();
  if (!uid) return { ok: false, scan, reason: 'signed-out' };

  const res = await logBehavioralEvent({
    event_type: 'device_scan',
    event_category: 'device',
    session_id: getLineageSessionId(),
    context_snippet: `${scan.platform.os}/${scan.platform.browser} cpu=${dash(scan.cpu.cores)} mem=${dash(scan.memory.deviceGb)} mic=${dash(scan.microphone.permission)} cam=${dash(scan.camera.permission)} new=${scan.isNewDevice} via=${trigger}`,
    metadata: { ...scan, trigger } as unknown as Record<string, unknown>,
    dhf_logged: true,
  });
  try {
    await recordDhfLineage({
      entityType: 'dhf_device_scan',
      entityId: scan.scannedAt,
      action: 'device:scan',
      content: JSON.stringify(scan),
      intent: 'dhf_write',
      metadata: { deviceKey: scan.deviceKey, isNewDevice: scan.isNewDevice, trigger },
    });
  } catch { /* lineage is best-effort */ }
  try { window.dispatchEvent(new CustomEvent('zoe-device-scan-complete', { detail: scan })); } catch { /* noop */ }
  return { ok: res.ok, scan, reason: res.ok ? undefined : 'save-failed' };
}

/** After sign-in: scan when this device is new or the last scan is stale. */
export async function autoScanAfterSignIn(): Promise<DeviceScanSaveResult | null> {
  const last = getLastDeviceScan();
  const probe = await scanDevice();
  const stale = !last || Date.now() - new Date(last.scannedAt).getTime() > RESCAN_MS;
  if (!probe.isNewDevice && !stale) return null;
  return scanAndSaveDevice('sign-in');
}

/** Plain sentence Zoe speaks after a scan. */
export function spokenDeviceSummary(s: DeviceScanResult, saved: boolean): string {
  const perm = (p: PermissionStateLite) => (p === 'granted' ? 'allowed' : p === 'denied' ? 'blocked' : p === 'prompt' ? 'not yet allowed' : 'not reported');
  const parts = [
    `${s.isNewDevice ? 'New device' : 'This device'}: ${s.platform.browser} on ${s.platform.os}.`,
    `Microphone ${perm(s.microphone.permission)}${s.microphone.inputs ? `, ${s.microphone.inputs} found` : ''}.`,
    `Camera ${perm(s.camera.permission)}${s.camera.inputs ? `, ${s.camera.inputs} found` : ''}.`,
    s.speaker.outputs ? `${s.speaker.outputs} speaker outputs.` : 'Speakers not reported by this browser.',
    s.memory.deviceGb ? `About ${s.memory.deviceGb} gigabytes of memory.` : 'Memory not reported.',
    s.cpu.cores ? `${s.cpu.cores} processor cores.` : 'Processor not reported.',
  ];
  parts.push(saved ? 'Saved to your DHF.' : 'I could not save it right now.');
  return parts.join(' ');
}
