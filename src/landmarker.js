import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'

// pinned: the wasm on the CDN must match the npm version in package.json
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

// step 1: a detector finds the face, a second model puts 478 points on it
export async function loadLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM)
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFacialTransformationMatrixes: true, // the head's pose, for step 2
  })
}

// each point has x, y from 0 to 1 (and z, depth); scale to canvas pixels
export function drawPoints(ctx, points) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  if (!points) return
  const size = Math.max(3, Math.round(width / 430))
  ctx.fillStyle = '#00ff88'
  for (const p of points) {
    ctx.fillRect(p.x * width - size / 2, p.y * height - size / 2, size, size)
  }
}
