import './style.css'
import { loadLandmarker, drawPoints } from './landmarker.js'
import { createHeadScene } from './head.js'
import { PoseSmoother } from './smooth.js'
import { createLightProbe } from './light.js'
import { saveFrame } from './save.js'

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

const status = document.querySelector('#status')
const [, landmarker] = await Promise.all([startCamera(), loadLandmarker()]).catch((error) => {
  status.textContent = error.name === 'NotAllowedError'
    ? 'The camera is blocked. Allow camera access for this page, then reload.'
    : `Couldn't start: ${error.message}`
  throw error
})
const { pose, face, axes, cowl, fitFace, showHead, matchLight, render } = await createHeadScene(threeCanvas, video.videoWidth, video.videoHeight)
const smoother = new PoseSmoother()
const measureLight = createLightProbe()

// what's shown: the finished filter by default; the steps can be switched on
const show = { points: false, face: false, axes: false, cowl: true, smooth: true }
let points = null

function applyShow() {
  face.visible = show.face
  axes.visible = show.axes
  cowl.visible = show.cowl
  showHead(Boolean(show.head))
}
applyShow()

// keys: 1 points · 2 standard face · 3 axes · 4 cowl · m raw/smooth · o show the invisible head
//       s save frame · shift+s save overlay only · c save the capture set
addEventListener('keydown', (e) => {
  const toggles = { 1: 'points', 2: 'face', 3: 'axes', 4: 'cowl', m: 'smooth', o: 'head' }
  if (toggles[e.key]) {
    show[toggles[e.key]] = !show[toggles[e.key]]
    if (e.key === 'm') console.log(show.smooth ? 'smooth' : 'raw')
    applyShow()
  }
  if (e.key.toLowerCase() === 's') saveFrame(video, [canvas, threeCanvas], { withVideo: !e.shiftKey })
  if (e.key === 'c') saveCaptureSet()
})

// One key saves every still the reel needs from this pose: each layer on the
// video and on a transparent background (dev: straight into captures/build).
let shot = 0
function saveCaptureSet() {
  shot++
  const saved = { ...show }
  const sets = [
    ['C1-points', { points: true }],
    ['C2-axes', { face: true, axes: true }],
    ['C2-axes-only', { axes: true }],
    ['C3-cowl', { cowl: true }],
  ]
  for (const [name, layers] of sets) {
    Object.assign(show, { points: false, face: false, axes: false, cowl: false }, layers)
    applyShow()
    drawPoints(ctx, show.points ? points : null)
    render()
    saveFrame(video, [canvas, threeCanvas], { name: `${name}-${shot}`, dir: 'build' })
    saveFrame(video, [canvas, threeCanvas], { name: `${name}-alpha-${shot}`, dir: 'build', withVideo: false })
  }
  Object.assign(show, saved)
  applyShow()
  console.log(`saved capture set ${shot}`)
}

let lastTime = -1

function loop() {
  // only run the model when the camera has a new frame
  if (video.currentTime !== lastTime) {
    lastTime = video.currentTime
    const result = landmarker.detectForVideo(video, performance.now())
    points = result.faceLandmarks[0] // 478 points
    drawPoints(ctx, show.points ? points : null)

    // step 2: the matrix turns a standard 3D face until it lines up with mine
    const matrix = result.facialTransformationMatrixes[0]
    if (matrix) {
      // step 3½: smooth it (step 3, the cowl, sits inside pose)
      const steady = smoother.filter(matrix.data, performance.now() / 1000)
      pose.matrix.fromArray(show.smooth ? steady : matrix.data)
      fitFace(points, matrix.data) // the invisible face takes your real face's shape
      matchLight(measureLight(video, points)) // the cowl takes the light on your face
    }
    pose.visible = Boolean(matrix)
    render()
  }
  requestAnimationFrame(loop)
}

status.hidden = true
loop()
