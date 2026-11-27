// Offline: run the tracker on a recorded clip, one frame at a time (seeking,
// not playing), so frame N of every export is frame N of the clip.
// Exports to captures/<clip>/: <clip>.json, and transparent PNG sequences.
import { loadLandmarker, drawPoints } from './landmarker.js'
import { createHeadScene } from './head.js'
import { PoseSmoother } from './smooth.js'
import { saveFile, saveFrame } from './save.js'

const $ = (id) => document.getElementById(id)
const video = $('clip')
const canvas = $('overlay')
const ctx = canvas.getContext('2d')
const status = (text) => { $('status').textContent = text }

const params = new URLSearchParams(location.search)
if (params.get('fps')) $('fps').value = params.get('fps')

$('form').addEventListener('submit', (e) => {
  e.preventDefault()
  const file = $('file').files[0]
  if (file) run(URL.createObjectURL(file), file.name).catch(fail)
})
// ?clip=/captures/x.mp4 runs a clip served by the dev server
if (params.get('clip')) run(params.get('clip'), params.get('clip')).catch(fail)

function fail(error) {
  console.error(error)
  status(`Failed: ${error.message}`)
}

function seek(time) {
  return new Promise((resolve) => {
    video.addEventListener('seeked', resolve, { once: true })
    video.currentTime = time
  })
}

const pad = (i) => String(i).padStart(5, '0')
const round = (v) => Math.round(v * 1e5) / 1e5

async function run(url, fileName) {
  const name = fileName.split('/').pop().replace(/\.[^.]+$/, '')
  const fps = Number($('fps').value)
  const want = { json: $('json').checked, raw: $('raw').checked, smooth: $('smooth').checked, points: $('points').checked }

  video.src = url
  await new Promise((resolve, reject) => {
    video.onloadeddata = resolve
    video.onerror = () => reject(new Error('this browser cannot decode the clip (use an H.264 proxy)'))
  })
  const { videoWidth: width, videoHeight: height, duration } = video
  canvas.width = width
  canvas.height = height
  const frames = Math.round(duration * fps)
  status(`${name}: ${width}×${height}, ${frames} frames at ${fps} fps. Loading the model…`)

  // a fresh tracker and filter per clip: timestamps start again at 0
  const landmarker = await loadLandmarker()
  const { pose, face, axes, fitFace, showHead, render } = await createHeadScene($('three'), width, height)
  face.visible = axes.visible = false
  showHead(params.get('head') === '1') // debug: tint the invisible head
  const smoother = new PoseSmoother()
  const data = { clip: name, fps, width, height, frames: [] }
  const started = performance.now()

  for (let i = 0; i < frames; i++) {
    await seek((i + 0.5) / fps) // the middle of frame i
    const result = landmarker.detectForVideo(video, (i * 1000) / fps)
    const points = result.faceLandmarks[0]
    const raw = result.facialTransformationMatrixes[0]?.data ?? null
    const smooth = raw ? smoother.filter(raw, i / fps) : null

    data.frames.push({
      i,
      t: round(i / fps),
      points: points ? points.map((p) => [round(p.x), round(p.y), round(p.z)]) : null,
      raw: raw && raw.map(round),
      smooth: smooth && smooth.map(round),
    })

    const exports = []
    drawPoints(ctx, want.points ? points : null)
    if (want.points) exports.push(saveFrame(video, [canvas], { withVideo: false, mirror: false, name: `${name}-points-${pad(i)}`, dir: name }))
    ctx.clearRect(0, 0, width, height)
    for (const mode of ['raw', 'smooth']) {
      if (!want[mode]) continue
      pose.visible = Boolean(raw)
      if (raw) {
        pose.matrix.fromArray(mode === 'raw' ? raw : smooth)
        fitFace(points, raw)
      }
      render()
      exports.push(saveFrame(video, [$('three')], { withVideo: false, mirror: false, name: `${name}-cowl-${mode}-${pad(i)}`, dir: name }))
    }
    await Promise.all(exports)

    const perFrame = (performance.now() - started) / (i + 1) / 1000
    status(`${name}: frame ${i + 1}/${frames} · ${data.frames.filter((f) => f.raw).length} with a face · ~${Math.round(perFrame * (frames - i - 1))} s left`)
  }

  if (want.json) await saveFile(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${name}.json`, name)
  landmarker.close()
  const found = data.frames.filter((f) => f.raw).length
  status(`Done: ${name}, ${frames} frames, a face in ${found}. Saved to captures/${name}/`)
  console.log('offline done', { name, frames, found })
}
