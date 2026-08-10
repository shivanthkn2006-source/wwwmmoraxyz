export type ZoeImageIntent = {
  isImageRequest: boolean;
  isUserIdentityRequest: boolean;
  isZoeIdentityRequest: boolean;
};

export type PendingIdentityImageRequest = {
  prompt: string;
  requestedAt: number;
};

const IMAGE_NOUN = /\b(image|images|picture|pictures|pic|photo|photos|portrait|selfie|artwork|drawing|painting|illustration|cartoon|sketch|avatar|wallpaper|logo|poster)\b/i;
const CREATE_ACTION = /\b(draw|sketch|paint|illustrate|generate|create|make|render|design|show|turn|transform)\b/i;
const USER_IDENTITY = /\b(my|mine|me|myself|i am|i'm|i’m)\b/i;
const ZOE_IDENTITY = /\b(your|yourself|zoe(?:'s|’s)?)\b/i;
const IDENTITY_STYLE = /\b(cartoon|sketch|portrait|selfie|avatar|painting|drawing|anime|comic|caricature|photo|picture|image)\b/i;

export const detectZoeImageIntent = (input: string): ZoeImageIntent => {
  const text = input.trim();
  const explicitImageRequest =
    (CREATE_ACTION.test(text) && IMAGE_NOUN.test(text)) ||
    /^\s*(image|imagine|draw|sketch|generate image|create image)\s*:/i.test(text);
  const directIdentityScene = /\b(draw|sketch|paint|illustrate|render|show)\s+(?:a\s+)?(?:picture\s+of\s+)?(?:me|myself)\b/i.test(text);
  const styledIdentityRequest = CREATE_ACTION.test(text) && (IDENTITY_STYLE.test(text) || directIdentityScene);
  const isUserIdentityRequest = USER_IDENTITY.test(text) && (explicitImageRequest || styledIdentityRequest);
  const isZoeIdentityRequest = ZOE_IDENTITY.test(text) && explicitImageRequest && !isUserIdentityRequest;

  return {
    isImageRequest: explicitImageRequest || isUserIdentityRequest,
    isUserIdentityRequest,
    isZoeIdentityRequest,
  };
};

/** Resume the original likeness request when the next turn only supplies a photo. */
export const resolveZoeImageTurn = (
  input: string,
  pending: PendingIdentityImageRequest | null,
): { prompt: string; intent: ZoeImageIntent; resumed: boolean } => {
  if (pending?.prompt.trim()) {
    return {
      prompt: pending.prompt.trim(),
      intent: { isImageRequest: true, isUserIdentityRequest: true, isZoeIdentityRequest: false },
      resumed: true,
    };
  }

  return { prompt: input, intent: detectZoeImageIntent(input), resumed: false };
};

export const buildUserIdentityPrompt = (input: string): string =>
  [
    input.replace(/^\s*(please\s+)?(zoe[, ]+)?/i, '').trim(),
    'Use the supplied photograph as the identity reference for the account holder.',
    'Preserve their recognizable facial identity, face shape, skin tone, hair, and defining features.',
    'Do not replace them with a random person, celebrity, fictional character, or generic face.',
  ].join(' ');