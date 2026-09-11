/**
 * ZOE TOOL REGISTRY
 * =================
 * Client-side tools the realtime agent can call while she is still talking.
 * Each tool is deliberately small: heavy compute is pushed to edge functions
 * so the UI thread never stalls and the platform stays smooth.
 */
import { supabase } from '@/integrations/supabase/client';
import { triggerHeadlessResume, type ResumeData } from '@/utils/headlessResumeBuilder';
import { getAmbientContext } from './ambientContext';

export interface ZoeToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ZoeToolResult {
  ok: boolean;
  [key: string]: unknown;
}

type Executor = (args: Record<string, any>) => Promise<ZoeToolResult>;

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
});

const str = (description: string) => ({ type: 'string', description });

export const ZOE_TOOL_DEFINITIONS: ZoeToolDefinition[] = [
  {
    name: 'queryVRWorldStatus',
    description: 'Report the active VR world location and which friends are currently online.',
    parameters: object({}),
  },
  {
    name: 'generateResume',
    description:
      'Generate a resume PDF in the background and download it silently. Pass whatever the user described.',
    parameters: object(
      {
        name: str('Full name'),
        title: str('Professional title'),
        email: str('Email address'),
        phone: str('Phone number'),
        location: str('City, country'),
        summary: str('Short professional summary'),
        skills: str('Comma-separated skills'),
        experience: str('Experience, one role per line'),
        education: str('Education, one entry per line'),
      },
      ['name'],
    ),
  },
  {
    name: 'calculatePlanetaryPositions',
    description:
      'Get exact planetary positions from the Swiss Ephemeris. Never estimate astrology maths yourself; always call this.',
    parameters: object({
      date: str('ISO date-time in UTC, or empty for now'),
      latitude: { type: 'number', description: 'Birth latitude' },
      longitude: { type: 'number', description: 'Birth longitude' },
    }),
  },
  {
    name: 'navigatePlatform',
    description: 'Open a page of the platform for the user, e.g. /home, /chat, /astrology, /vault.',
    parameters: object({ path: str('Route path starting with /') }, ['path']),
  },
  {
    name: 'getAssetJobStatus',
    description: 'Check progress of a background asset job (image, video or 3D model generation).',
    parameters: object({ jobId: str('Job id returned when the asset was requested') }, ['jobId']),
  },
];

const executors: Record<string, Executor> = {
  async queryVRWorldStatus() {
    const ctx = getAmbientContext();
    const online = ctx.friendsList.filter((f) => f.online).map((f) => f.name);
    return {
      ok: true,
      vrLocation: ctx.activeVRLocation ?? 'none',
      friendsOnline: online,
      friendsOnlineCount: online.length,
    };
  },

  async generateResume(args) {
    const data: ResumeData = {
      ...args,
      skills: typeof args.skills === 'string' ? args.skills.split(/,\s*/) : args.skills,
      experience: args.experience,
      education: args.education,
    };
    const result = await triggerHeadlessResume(data);
    return { ok: result.success, message: result.message, fileName: result.fileName };
  },

  async calculatePlanetaryPositions(args) {
    const { data, error } = await supabase.functions.invoke('swiss-ephemeris', {
      body: {
        date: args.date || new Date().toISOString(),
        latitude: args.latitude,
        longitude: args.longitude,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, ...(data as Record<string, unknown>) };
  },

  async navigatePlatform(args) {
    const path = typeof args.path === 'string' && args.path.startsWith('/') ? args.path : null;
    if (!path) return { ok: false, error: 'A route path starting with / is required.' };
    window.dispatchEvent(new CustomEvent('zoe-agent-navigate', { detail: { path } }));
    return { ok: true, navigatedTo: path };
  },

  async getAssetJobStatus(args) {
    const { data, error } = await supabase.functions.invoke('get-job-status', {
      body: { jobId: args.jobId, job_id: args.jobId },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, ...(data as Record<string, unknown>) };
  },
};

export function hasZoeTool(name: string): boolean {
  return Boolean(executors[name]);
}

/** Runs a tool and never throws — the agent always gets a serialisable answer. */
export async function executeZoeTool(name: string, args: Record<string, any> = {}): Promise<ZoeToolResult> {
  const run = executors[name];
  if (!run) return { ok: false, error: `Unknown tool: ${name}` };
  try {
    return await run(args || {});
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'tool failed' };
  }
}

/** Short line Zoe says out loud before the heavy work starts. */
export function toolAcknowledgement(name: string): string {
  switch (name) {
    case 'queryVRWorldStatus': return 'Checking the VR world now.';
    case 'generateResume': return 'On it — putting your resume together.';
    case 'calculatePlanetaryPositions': return 'Running the exact ephemeris, one moment.';
    case 'navigatePlatform': return 'Opening that up.';
    case 'getAssetJobStatus': return 'Checking that job.';
    default: return 'Checking now.';
  }
}
