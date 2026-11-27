// Save a file. In dev it goes straight to the dev server's captures/ folder
// (no download prompts, works for long frame sequences); on the site it downloads.
export async function saveFile(blob, name, dir = '') {
  if (import.meta.env.DEV) {
    const query = new URLSearchParams({ name, dir })
    const response = await fetch(`/__save?${query}`, { method: 'POST', body: blob })
    if (!response.ok) throw new Error(`save failed: ${name}`)
    return
  }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))

// Save a frame at the video's full resolution.
// withVideo: false keeps only the drawn layers, on a transparent background.
// mirror: true matches the selfie view on screen (live); false for recorded clips.
export async function saveFrame(video, layers, { withVideo = true, mirror = true, name, dir } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  if (mirror) {
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
  }
  // everything is drawn now, before any await, so the caller can change layers right after
  if (withVideo) ctx.drawImage(video, 0, 0)
  for (const layer of layers) ctx.drawImage(layer, 0, 0)
  const fileName = name ? `${name}.png` : `cowl-${withVideo ? 'frame' : 'overlay'}-${Date.now()}.png`
  await saveFile(await toBlob(canvas), fileName, dir)
}

export async function saveCanvas(canvas, name) {
  await saveFile(await toBlob(canvas), name)
}
