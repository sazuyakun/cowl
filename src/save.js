// Save a PNG. In dev it goes straight to the dev server's captures/ folder
// (no download prompts, works for long frame sequences); on the site it downloads.
export async function savePng(blob, name) {
  if (import.meta.env.DEV) {
    await fetch(`/__save?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob })
    console.log('saved captures/' + name)
    return
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))

// Save a frame at the camera's full resolution, mirrored like the screen.
// withVideo: false keeps only the drawn layers, on a transparent background.
export async function saveFrame(video, layers, { withVideo = true } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  if (withVideo) ctx.drawImage(video, 0, 0)
  for (const layer of layers) ctx.drawImage(layer, 0, 0)
  await savePng(await toBlob(canvas), `cowl-${withVideo ? 'frame' : 'overlay'}-${Date.now()}.png`)
}

export async function saveCanvas(canvas, name) {
  await savePng(await toBlob(canvas), name)
}
