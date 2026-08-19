export interface ZoeActivePostContext {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
}

const PLATFORM_PAGES = [
  ['Home feed', '/home'], ['Chat', '/chat'], ['Profile', '/profile'], ['Camera', '/camera'],
  ['Quantum Camera', '/quantum-camera'], ['Huddle', '/huddle'], ['Webdrop', '/webdrop'],
  ['AI Companion', '/ai-companion'], ['Notifications', '/notification-history'],
  ['Notification preferences', '/notification-preferences'], ['Activity export', '/activity-export'],
  ['Zoe AI', '/zoe-ai'], ['Voice commands', '/voice-commands'],
  ['Voice command history', '/voice-command-history'], ['Voice command test', '/voice-command-test'],
  ['Universal timeline', '/universal-timeline'], ['Kronos Anima', '/kronos-anima'],
  ['Zoe Infinity', '/zoe-infinity'], ['Zoe mail', '/zoe-infinity/mail'],
  ['Genesis Imprint', '/genesis-imprint'], ['About', '/about'], ['Analytics', '/analytics-dashboard'],
  ['DHF dashboard', '/dhf-dashboard'], ['Integration test', '/integration-test'],
  ['Zoe Omega', '/zoe-omega'], ['Omega evolution', '/omega-evolution'], ['God mode', '/god-mode'],
  ['God mode evolution', '/god-mode/evolution'], ['Zoe Nexus', '/zoe-nexus'],
  ['Phoenix Core', '/phoenix-core'], ['Vitruvian', '/vitruvian'], ['Orbital Command', '/orbital-command'],
  ['Exodus', '/exodus'], ['Exodus Map', '/exodus-map'], ['Legal Nexus', '/legal-nexus'],
  ['Contract Scanner', '/contract-scanner'], ['Anka Shastra', '/anka-shastra'],
  ['Vastu Scan', '/vastu-scan'], ['Agasthya Vision', '/agasthya-vision'],
  ['Blueprint download', '/blueprint-download'], ['Zoe Nexus Control', '/zoe-nexus-control'],
  ['ASI test', '/asi-test'], ["M'Mora", '/mmora'], ['Selfie City', '/selfie-city'],
  ['Merchant center', '/merchant'], ['Career Divinity', '/career-divinity'], ['ReSleeve', '/resleeve'],
  ['Zoe Architecture', '/zoe-architecture'], ['Sentinel', '/sentinel'], ['Security', '/security'],
  ['Agent memory', '/agent-memory'], ['Platform audit', '/platform-audit'], ['Root scan', '/root-scan'],
  ['VR audit', '/vr-audit'], ['Install app', '/install'], ['Ear-Link blueprint', '/ear-link-blueprint'],
] as const;

let activePost: ZoeActivePostContext | null = null;

export function setZoeActivePostContext(post: ZoeActivePostContext | null): void {
  activePost = post;
}

export function getZoeActivePostContext(): ZoeActivePostContext | null {
  return activePost;
}

export function getZoePlatformPageContext(): string {
  return PLATFORM_PAGES.map(([name, route]) => `${name}: ${route}`).join('\n');
}