/**
 * ZOE COMMAND CATALOGUE
 * =====================
 * Every platform feature stated as something you can simply say out loud, with
 * one plain example each. This is the reference the Voice Commands page shows.
 *
 * All of these run through the same hands-free path: browser speech recognition
 * in, canonical `askZoe()` or the deterministic intent router for the action,
 * and Deepgram for the reply. Browser speech synthesis is never used unless the
 * member has explicitly opted in.
 */

export interface ZoeCommand {
  /** What to say. */
  example: string;
  /** What happens. */
  does: string;
  /** 'action' = deterministic route/UI action, 'answer' = Zoe answers naturally. */
  kind: 'action' | 'answer';
}

export interface ZoeCommandGroup {
  area: string;
  commands: ZoeCommand[];
}

export const ZOE_COMMAND_CATALOG: ZoeCommandGroup[] = [
  {
    area: 'Wake & control',
    commands: [
      { example: 'Hey Zoe', does: 'Wakes her; she tells you which page you are on and listens', kind: 'action' },
      { example: 'Zoe, are you there?', does: 'Same as Hey Zoe', kind: 'action' },
      { example: 'Zoe stop', does: 'Stops her mid-sentence', kind: 'action' },
      { example: 'Zoe pause', does: 'Pauses the reply', kind: 'action' },
      { example: 'Zoe continue', does: 'Resumes where she stopped', kind: 'action' },
    ],
  },
  {
    area: 'Getting around',
    commands: [
      { example: 'Zoe home', does: 'Opens the Home feed', kind: 'action' },
      { example: 'Zoe open chat', does: 'Opens Messages', kind: 'action' },
      { example: 'Zoe open Mosaic', does: 'Opens the Mosaic feed', kind: 'action' },
      { example: 'Zoe open my profile', does: 'Opens your profile', kind: 'action' },
      { example: 'Zoe open settings', does: 'Opens Settings', kind: 'action' },
      { example: 'Zoe open the site map', does: 'Opens the map of every page', kind: 'action' },
      { example: 'Zoe open help', does: 'Opens the plain-language help page', kind: 'action' },
    ],
  },
  {
    area: 'People & messages',
    commands: [
      { example: 'Zoe, notifications', does: 'Opens your notifications', kind: 'action' },
      { example: 'Zoe, send a message to Asha', does: 'Opens Messages ready for Asha — never sends without you', kind: 'action' },
      { example: 'Zoe, who has been active today?', does: 'Answers from live platform activity', kind: 'answer' },
    ],
  },
  {
    area: 'Astrology',
    commands: [
      { example: 'Zoe, open astrology', does: 'Opens your chart page', kind: 'action' },
      { example: 'Zoe, what is my astrology for today?', does: 'Reads your chart for today', kind: 'answer' },
      { example: 'Zoe, read my week ahead', does: 'Weekly reading from your birth details', kind: 'answer' },
      { example: 'My birthday is 3rd of May 1990', does: 'She collects date, time and city one at a time and saves them', kind: 'answer' },
    ],
  },
  {
    area: 'Growth & coaching',
    commands: [
      { example: 'Zoe, open growth', does: 'Opens Growth Insights', kind: 'action' },
      { example: 'Zoe, what should I focus on this week?', does: 'Coaching from your own history', kind: 'answer' },
      { example: 'Zoe, how am I doing on my habits?', does: 'Reads your live growth data', kind: 'answer' },
    ],
  },
  {
    area: 'Vault, legacy & memories',
    commands: [
      { example: 'Zoe, open my vault', does: 'Opens the Digital Vault', kind: 'action' },
      { example: 'Zoe, open legacy', does: 'Opens legacy messages', kind: 'action' },
      { example: 'Zoe, remember that my anniversary is in June', does: 'Saves it to your memory', kind: 'answer' },
      { example: 'Zoe, what did I tell you last week?', does: 'Recalls your past conversations', kind: 'answer' },
    ],
  },
  {
    area: 'Creating & posting',
    commands: [
      { example: 'Zoe, open create', does: 'Opens the post composer', kind: 'action' },
      { example: 'Zoe, help me write a post about my trip', does: 'Drafts it with you, step by step', kind: 'answer' },
      { example: 'Zoe, open the camera', does: 'Opens the camera', kind: 'action' },
    ],
  },
  {
    area: 'Search & the wider world',
    commands: [
      { example: 'Zoe, tell me about the new iPhone', does: 'Answers from current articles and names the outlets', kind: 'answer' },
      { example: "Zoe, what's happening in the world today?", does: 'Live headlines with sources', kind: 'answer' },
      { example: 'Zoe, search for hiking posts', does: 'Searches the platform', kind: 'answer' },
      { example: 'Zoe, what is Kronos and Anima?', does: 'Explains the platform in her own words', kind: 'answer' },
    ],
  },
  {
    area: 'Sound & headsets',
    commands: [
      { example: 'Zoe, open Zoe audio', does: 'Opens the headset and microphone page', kind: 'action' },
      { example: 'Zoe, open headset settings', does: 'Same page, for pairing and testing', kind: 'action' },
    ],
  },
  {
    area: 'Admin only',
    commands: [
      { example: 'Zoe, run god mode scan', does: 'Full platform scan — checked on the server, admins only', kind: 'answer' },
      { example: 'Zoe, open Agasthya Vision', does: 'Opens the vision console', kind: 'action' },
    ],
  },
];

/** Total number of documented spoken commands. */
export const ZOE_COMMAND_COUNT = ZOE_COMMAND_CATALOG.reduce((n, g) => n + g.commands.length, 0);
