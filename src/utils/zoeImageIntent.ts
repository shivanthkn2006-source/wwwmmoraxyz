export type ZoeImageIntent = {
  isImageRequest: boolean;
  isUserIdentityRequest: boolean;
  isZoeIdentityRequest: boolean;
};

export type PendingIdentityImageRequest = {
  prompt: string;
  requestedAt: number;
};

export type ZoeImageContextMessage = {
  role: 'user' | 'zoe';
  content: string;
};

const IMAGE_NOUN = /\b(image|images|picture|pictures|pic|photo|photos|portrait|selfie|artwork|drawing|painting|illustration|cartoon|sketch|avatar|wallpaper|logo|poster|diagram|graph|chart|infographic|schematic|circuit(?:\s+board)?|mockup|visuali[sz]ation|map)\b/i;
const CREATE_ACTION = /\b(draw|sketch|paint|illustrate|generate|create|make|render|design|show|turn|transform|visuali[sz]e|plot|depict)\b/i;
const USER_IDENTITY = /\b(my|mine|me|myself|i am|i'm|i’m)\b/i;
const ZOE_IDENTITY = /\b(you|your|yourself|zoe(?:'s|’s)?)\b/i;
const IDENTITY_STYLE = /\b(cartoon|sketch|portrait|selfie|avatar|painting|drawing|anime|comic|caricature|photo|picture|image)\b/i;
const CONTEXTUAL_PROMPT_REFERENCE = /\b(?:use|turn|render|create|generate|make)\s+(?:this|that|the)?\s*(?:above|earlier|previous|last)?\s*(?:description|prompt|idea|concept|reply|response|text)\b|\buse\s+(?:this|that|the)\s+above\b/i;
const ZOE_APPEARANCE_CHANGE = /\b(?:wear|wearing|dress|dressed|outfit|saree|sari|costume|hairstyle|look like|appearance)\b/i;

export const detectZoeImageIntent = (input: string): ZoeImageIntent => {
  const text = input.trim();
  const explicitImageRequest =
    (CREATE_ACTION.test(text) && IMAGE_NOUN.test(text)) ||
    /^\s*(image|imagine|draw|sketch|generate image|create image)\s*:/i.test(text);
  const directIdentityScene = /\b(draw|sketch|paint|illustrate|render|show)\s+(?:a\s+)?(?:picture\s+of\s+)?(?:me|myself)\b/i.test(text);
  const styledIdentityRequest = CREATE_ACTION.test(text) && (IDENTITY_STYLE.test(text) || directIdentityScene);
  const isUserIdentityRequest = USER_IDENTITY.test(text) && (explicitImageRequest || styledIdentityRequest);
  const zoeAppearanceRequest = ZOE_IDENTITY.test(text) && ZOE_APPEARANCE_CHANGE.test(text);
  const isZoeIdentityRequest = ZOE_IDENTITY.test(text) && (explicitImageRequest || zoeAppearanceRequest) && !isUserIdentityRequest;

  return {
    isImageRequest: explicitImageRequest || isUserIdentityRequest || zoeAppearanceRequest,
    isUserIdentityRequest,
    isZoeIdentityRequest,
  };
};

/** Resume the original likeness request when the next turn only supplies a photo. */
export const resolveZoeImageTurn = (
  input: string,
  pending: PendingIdentityImageRequest | null,
  context: ZoeImageContextMessage[] = [],
): { prompt: string; intent: ZoeImageIntent; resumed: boolean } => {
  if (pending?.prompt.trim()) {
    return {
      prompt: pending.prompt.trim(),
      intent: { isImageRequest: true, isUserIdentityRequest: true, isZoeIdentityRequest: false },
      resumed: true,
    };
  }

  const intent = detectZoeImageIntent(input);
  if (intent.isImageRequest && CONTEXTUAL_PROMPT_REFERENCE.test(input)) {
    const referenced = [...context]
      .reverse()
      .find((message) => message.role === 'zoe' && message.content.trim().length > 20);
    if (referenced) {
      return {
        prompt: referenced.content.trim().slice(0, 5000),
        intent,
        resumed: true,
      };
    }
  }

  return { prompt: input, intent, resumed: false };
};

export const buildZoeIdentityPrompt = (input: string): string =>
  [
    input.replace(/^\s*(please\s+)?(zoe[, ]+)?/i, '').trim(),
    'The subject is Zoe, a warm futuristic AI companion woman with a consistent recognizable appearance.',
    'She has natural expressive features and subtle teal-violet accents.',
    'Follow every requested garment, setting, pose, object, art style, diagram detail, and composition exactly.',
    'Create the actual finished visual; do not output a written image description, prompt, ASCII art, or disclaimer.',
  ].join(' ');

export const buildUserIdentityPrompt = (input: string): string =>
  [
    input.replace(/^\s*(please\s+)?(zoe[, ]+)?/i, '').trim(),
    'Use the supplied photograph as the identity reference for the account holder.',
    'Preserve their recognizable facial identity, face shape, skin tone, hair, and defining features.',
    'Do not replace them with a random person, celebrity, fictional character, or generic face.',
  ].join(' ');