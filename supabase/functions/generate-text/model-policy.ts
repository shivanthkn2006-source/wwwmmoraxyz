// Server-owned model policy for generate-text. Pure (no Deno imports) so it can be tested with mocks.
export const TEXT_MODELS = ['google/gemini-2.5-flash'] as const;
export const IMAGE_REQUEST_MODELS = ['google/gemini-2.5-flash-image-preview', 'google/gemini-3-pro-image-preview'] as const;
export const ALLOWED_MODELS = [...TEXT_MODELS, ...IMAGE_REQUEST_MODELS] as const;
// The only model actually sent for image work; chosen by the server, never by the caller.
export const SERVER_IMAGE_MODEL = 'google/gemini-3.1-flash-image-preview';
export const DEFAULT_TEXT_MODEL = TEXT_MODELS[0];

export function selectModel(model: string | undefined, generateImage: boolean) {
  const requested = model ?? DEFAULT_TEXT_MODEL;
  if (!(ALLOWED_MODELS as readonly string[]).includes(requested)) throw new Error('MODEL_NOT_ALLOWED');
  const isImageRequest = generateImage || (IMAGE_REQUEST_MODELS as readonly string[]).includes(requested);
  if (isImageRequest) return { isImageRequest, selectedModel: SERVER_IMAGE_MODEL };
  // Text work can only ever use a text model.
  return { isImageRequest, selectedModel: (TEXT_MODELS as readonly string[]).includes(requested) ? requested : DEFAULT_TEXT_MODEL };
}
