// ═══════════════════════════════════════════════════════════════════════════════
// ZOE DECORATOR — Intent Detection (self-contained)
// Detects natural-language requests to redesign a space.
// Lives 100% inside src/features/zoe-decorator/ — no other Zoe code touched.
// ═══════════════════════════════════════════════════════════════════════════════

export type DecoratorSpace =
  | 'home'
  | 'living-room'
  | 'bedroom'
  | 'kitchen'
  | 'bathroom'
  | 'garden'
  | 'landscape'
  | 'office'
  | 'space';

export type DecoratorTheme =
  | 'modern'
  | 'minimalist'
  | 'scandinavian'
  | 'industrial'
  | 'bohemian'
  | 'luxury'
  | 'rustic'
  | 'japandi'
  | 'tropical'
  | 'mediterranean'
  | 'futuristic'
  | 'cozy';

export interface DecoratorIntent {
  matched: boolean;
  space?: DecoratorSpace;
  theme?: DecoratorTheme;
  raw: string;
}

const SPACE_PATTERNS: Array<[RegExp, DecoratorSpace]> = [
  [/\bliving\s*room|lounge|family\s*room\b/i, 'living-room'],
  [/\bbed\s*room|master\s*bedroom\b/i, 'bedroom'],
  [/\bkitchen|cook(ing)?\s*area\b/i, 'kitchen'],
  [/\bbath(room)?|washroom|toilet\b/i, 'bathroom'],
  [/\bgarden|backyard|front\s*yard|patio|terrace|balcony\b/i, 'garden'],
  [/\blandscap(e|ing)|outdoor\s*space|lawn\b/i, 'landscape'],
  [/\boffice|workspace|study|cabin\b/i, 'office'],
  [/\bhome|house|interior|room\b/i, 'home'],
];

const THEME_PATTERNS: Array<[RegExp, DecoratorTheme]> = [
  [/\bmodern|contemporary\b/i, 'modern'],
  [/\bminimal(ist)?\b/i, 'minimalist'],
  [/\bscandinav|nordic\b/i, 'scandinavian'],
  [/\bindustrial|loft\b/i, 'industrial'],
  [/\bbohem|boho\b/i, 'bohemian'],
  [/\bluxur|premium|elegant\b/i, 'luxury'],
  [/\brustic|farmhouse|country\b/i, 'rustic'],
  [/\bjapandi|japanese|zen\b/i, 'japandi'],
  [/\btropical|jungle|palm\b/i, 'tropical'],
  [/\bmediterran|tuscan|santorini\b/i, 'mediterranean'],
  [/\bfutur(istic)?|sci\s*-?\s*fi|space\s*age\b/i, 'futuristic'],
  [/\bcozy|warm|comfy\b/i, 'cozy'],
];

const TRIGGER = /\b(decorat|redecorat|redesign|makeover|re-?style|stage|interior\s*design|landscape|transform\s+(my|the)\s+(home|room|office|garden|space)|how\s+would\s+(my|this).*look|reimagine\s+(my|this))/i;

export function detectDecoratorIntent(text: string): DecoratorIntent {
  if (!text || typeof text !== 'string') return { matched: false, raw: text };
  if (!TRIGGER.test(text)) return { matched: false, raw: text };

  let space: DecoratorSpace | undefined;
  for (const [re, s] of SPACE_PATTERNS) { if (re.test(text)) { space = s; break; } }

  let theme: DecoratorTheme | undefined;
  for (const [re, t] of THEME_PATTERNS) { if (re.test(text)) { theme = t; break; } }

  return { matched: true, space: space ?? 'space', theme, raw: text };
}

/** Event name used to open the decorator from anywhere without coupling. */
export const ZOE_DECORATOR_OPEN_EVENT = 'zoe-decorator:open';

export interface ZoeDecoratorOpenDetail {
  space?: DecoratorSpace;
  theme?: DecoratorTheme;
  prompt?: string;
}

export function emitOpenDecorator(detail: ZoeDecoratorOpenDetail = {}) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ZOE_DECORATOR_OPEN_EVENT, { detail }));
}
