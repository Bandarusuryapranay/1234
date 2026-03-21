/** 
 * src/utils/detectionService.ts
 * ── Proctoring Detection Service (Stable TF.js + Face-api) ───────────
 * Uses:
 *   • @vladmandic/face-api  — TinyFaceDetector for face presence / identity
 *   • @tensorflow-models/coco-ssd — phone / extra-person detection
 */

import * as faceapi from '@vladmandic/face-api';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

// ── Thresholds ────────────────────────────────────────────────────────
const FACE_MODEL_URL = 'https://vladmandic.github.io/face-api/model';
export const FACE_MATCH_THRESHOLD = 0.50;  // euclidean distance — lower = stricter
export const PHONE_CONFIDENCE     = 0.60;
export const PERSON_CONFIDENCE    = 0.70;

export type ViolationType =
  | 'NO_FACE'
  | 'MULTIPLE_FACES'
  | 'FACE_MISMATCH'
  | 'PHONE_DETECTED'
  | 'EXTRA_PERSON';

export interface DetectionResult {
  violations:      ViolationType[];
  faceCount:       number;
  personCount:     number;
  phoneDetected:   boolean;
  matchConfidence: number | null;
}

// ── Load All Models ───────────────────────────────────────────────────
export async function loadAllModels(): Promise<cocoSsd.ObjectDetection> {
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL),
  ]);

  return await cocoSsd.load({ base: 'lite_mobilenet_v2' });
}

// ── Enroll: Extract biometric descriptor ─────────────────────────────
export async function enrollFace(video: HTMLVideoElement) {
  const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 });
  const det = await faceapi.detectSingleFace(video, opts).withFaceLandmarks().withFaceDescriptor();

  if (!det) return null;

  // Capture photo snapshot
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  
  return {
    descriptor: det.descriptor,
    photo: canvas.toDataURL('image/jpeg', 0.8)
  };
}

// ── Run Frame ───────────────────────────────────────────────────────
export async function runDetectionFrame(
  video:               HTMLVideoElement,
  displayCanvas:       HTMLCanvasElement,
  cocoModel:           cocoSsd.ObjectDetection,
  referenceDescriptor: Float32Array | null,
  runObjects:          boolean
): Promise<DetectionResult> {
  const violations: ViolationType[] = [];
  let matchConfidence: number | null = null;
  let phoneDetected  = false;
  let personCount    = 0;

  // Build high-res display for visual feedback
  displayCanvas.width = video.videoWidth;
  displayCanvas.height = video.videoHeight;
  const ctx = displayCanvas.getContext('2d')!;
  ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

  // 1. Face Detect (using resized for speed if needed, but keeping it direct for MVP)
  const faceOpts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.4 });
  const faceDets = await faceapi.detectAllFaces(video, faceOpts).withFaceLandmarks().withFaceDescriptors();
  const faceCount = faceDets.length;

  faceDets.forEach((det, i) => {
     const { x, y, width, height } = det.detection.box;
     let isMatch = false;
     if (i === 0 && referenceDescriptor) {
        const dist = faceapi.euclideanDistance(det.descriptor, referenceDescriptor);
        matchConfidence = Math.max(0, +(1 - dist).toFixed(2));
        isMatch = dist <= FACE_MATCH_THRESHOLD;
     }

     const color = (i === 0 && isMatch) ? '#00ff94' : '#ff3d71';
     drawBox(ctx, x, y, width, height, color, i === 0 ? (isMatch ? `✓ MATCHED` : '⚠ UNKNOWN') : '⚠ EXTRA FACE');
  });

  // 2. Object Detect (Phone/Person)
  if (runObjects) {
    const predictions = await cocoModel.detect(video);
    for (const obj of predictions) {
        const [bx, by, bw, bh] = obj.bbox;
        if ((obj.class === 'cell phone' || obj.class === 'phone') && obj.score >= PHONE_CONFIDENCE) {
           phoneDetected = true;
           drawBox(ctx, bx, by, bw, bh, '#ffaa00', '📱 PHONE');
        }
        if (obj.class === 'person' && obj.score >= PERSON_CONFIDENCE) {
           personCount++;
           if (personCount > 1) drawBox(ctx, bx, by, bw, bh, '#ff6b35', '👤 EXTRA PERSON');
        }
    }
  }

  // 3. Build Results
  if (faceCount === 0)      violations.push('NO_FACE');
  else if (faceCount > 1)   violations.push('MULTIPLE_FACES');
  else if (referenceDescriptor && matchConfidence !== null && matchConfidence < 0.45) violations.push('FACE_MISMATCH');

  if (phoneDetected) violations.push('PHONE_DETECTED');
  if (personCount > 1) violations.push('EXTRA_PERSON');

  return { violations, faceCount, personCount, phoneDetected, matchConfidence };
}

function drawBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, label: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y - 20, w, 20);
  ctx.fillStyle = '#111';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(label, x + 5, y - 6);
}
