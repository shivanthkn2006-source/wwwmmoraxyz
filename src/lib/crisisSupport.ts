// English-only phrase list for now. Detection is never stored.
const CRISIS_PHRASES = [
  'suicide', 'suicidal', 'kill myself', 'killing myself', 'end my life', 'take my own life',
  'want to die', 'wanna die', 'wish i was dead', 'wish i were dead', 'better off dead',
  "don't want to live", 'dont want to live', 'no reason to live',
  'self-harm', 'self harm', 'selfharm', 'cut myself', 'cutting myself',
  'hurt myself', 'hurting myself', 'harm myself', 'harming myself',
];

export function detectCrisis(text: string): boolean {
  const t = (text || '').toLowerCase();
  return CRISIS_PHRASES.some(p => t.includes(p));
}

export function getCrisisResources(countryCode?: string | null): string {
  switch ((countryCode || '').toUpperCase()) {
    case 'US': return 'Call or text 988';
    case 'IN': return 'Tele-MANAS 14416';
    case 'SG': return 'Samaritans of Singapore 1767';
    default: return 'Contact your local emergency number or visit findahelpline.com';
  }
}
