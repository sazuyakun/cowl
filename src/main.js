import './style.css'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import { createHeadScene } from './head.js'
import { saveFrame } from './save.js'

// pinned: the wasm on the CDN must match the npm version in package.json
const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm'
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const video = document.querySelector('#cam')
const canvas = document.querySelector('#overlay')
const threeCanvas = document.querySelector('#three')
const ctx = canvas.getContext('2d')

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  })
  video.srcObject = stream
  await video.play()

  // canvas pixels = video pixels, so a point at (x, y) in the frame
  // is the same (x, y) on the canvas
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
}

// step 1: a detector finds the face, a second model puts 478 points on it
async function loadLandmarker() {
  const vision = await FilesetResolver.forVisionTasks(WASM)
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFacialTransformationMatrixes: true, // the head's pose, for step 2
  })
}

// each point has x, y from 0 to 1 (and z, depth); scale to canvas pixels
function drawPoints(points) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!points) return
  ctx.fillStyle = '#00ff88'
  for (const p of points) {
    ctx.fillRect(p.x * canvas.width - 1.5, p.y * canvas.height - 1.5, 3, 3)
  }
}

const [, landmarker] = await Promise.all([startCamera(), loadLandmarker()])
const { pose, face, axes, render } = await createHeadScene(threeCanvas, video.videoWidth, video.videoHeight)

// keys: 1 points · 2 standard face · 3 axes · s save frame · shift+s save overlay only
const show = { points: true, face: true, axes: true }
face.visible = show.face
addEventListener('keydown', (e) => {
  if (e.key === '1') show.points = !show.points
  if (e.key === '2') face.visible = show.face = !show.face
  if (e.key === '3') axes.visible = show.axes = !show.axes
  if (e.key.toLowerCase() === 's') saveFrame(video, [canvas, threeCanvas], { withVideo: !e.shiftKey })
})

let lastTime = -1

function loop() {
  // only run the model when the camera has a new frame
  if (video.currentTime !== lastTime) {
    lastTime = video.currentTime
    const result = landmarker.detectForVideo(video, performance.now())
    const points = result.faceLandmarks[0] // 478 points
    drawPoints(show.points ? points : null)

    // step 2: the matrix turns a standard 3D face until it lines up with mine
    const matrix = result.facialTransformationMatrixes[0]
    if (matrix) pose.matrix.fromArray(matrix.data)
    pose.visible = Boolean(matrix)
    render()
  }
  requestAnimationFrame(loop)
}

loop()
