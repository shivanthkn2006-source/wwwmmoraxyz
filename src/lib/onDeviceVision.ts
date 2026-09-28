/**
 * On-device camera backup (MediaPipe). Used only when every cloud vision
 * service fails. Runs in the browser — no outside AI service is called.
 */
import type { ObjectDetector } from '@mediapipe/tasks-vision';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

let detectorPromise: Promise<ObjectDetector> | null = null;

function getDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FilesetResolver, ObjectDetector } = await import('@mediapipe/tasks-vision');
      const fileset = await FilesetResolver.forVisionTasks(WASM);
      return ObjectDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL },
        scoreThreshold: 0.35,
        maxResults: 8,
        runningMode: 'IMAGE',
      });
    })().catch((e) => { detectorPromise = null; throw e; });
  }
  return detectorPromise;
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function analyzeFrameOnDevice(dataUrl: string) {
  const [detector, img] = await Promise.all([getDetector(), loadImage(dataUrl)]);
  const result = detector.detect(img);
  const objects = [...new Set(result.detections.map((d) => d.categories[0]?.categoryName).filter(Boolean) as string[])];
  return {
    objects,
    scene: objects.slice(0, 3).join(', ') || 'unclear',
    emotional_sentiment: 'neutral',
    summary: objects.length
      ? `On my own I can make out ${objects.slice(0, 4).join(', ')}, but I can't judge colours or clothing details right now.`
      : "My cloud eyes are down and I can't make out much on my own right now.",
    provider: 'on-device-mediapipe',
  };
}
