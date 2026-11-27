import './style.css'

const video = document.querySelector('#cam')
const canvas = document.querySelector('#overlay')
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

  // test: a red square at the centre of the frame
  ctx.fillStyle = 'red'
  ctx.fillRect(canvas.width / 2 - 10, canvas.height / 2 - 10, 20, 20)
}

startCamera().catch(console.error)
