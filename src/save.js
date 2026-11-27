// Save a frame as a PNG at the camera's full resolution, mirrored like the screen.
// withVideo: false keeps only the drawn layers, on a transparent background.
export function saveFrame(video, layers, { withVideo = true } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')
  ctx.translate(canvas.width, 0)
  ctx.scale(-1, 1)
  if (withVideo) ctx.drawImage(video, 0, 0)
  for (const layer of layers) {
    if (layer.style.display !== 'none') ctx.drawImage(layer, 0, 0)
  }
  canvas.toBlob((blob) => {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cowl-${withVideo ? 'frame' : 'overlay'}-${Date.now()}.png`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }, 'image/png')
}
