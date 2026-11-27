// Reads the light on your face from the video, so the cowl can be lit the same way.
// Each frame the face's box is shrunk to 24×24 pixels and measured:
// how bright it is, what colour the light is, and which side is brighter.
const SIZE = 24
const SKIN = 0.42 // a face's usual brightness under normal light (0..1)

export function createLightProbe() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  let light = null

  return function measure(video, points) {
    if (!points) return light
    let minX = 1, minY = 1, maxX = 0, maxY = 0
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
    }
    const w = video.videoWidth, h = video.videoHeight
    // the middle of the face (cheeks, nose, forehead), not hair or background
    const x = (minX + (maxX - minX) * 0.15) * w
    const y = (minY + (maxY - minY) * 0.1) * h
    const bw = (maxX - minX) * 0.7 * w
    const bh = (maxY - minY) * 0.8 * h
    if (bw < 4 || bh < 4) return light
    ctx.drawImage(video, x, y, bw, bh, 0, 0, SIZE, SIZE)
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE)

    let r = 0, g = 0, b = 0, left = 0, right = 0, top = 0, bottom = 0
    for (let j = 0; j < SIZE; j++) {
      for (let i = 0; i < SIZE; i++) {
        const k = (j * SIZE + i) * 4
        const lum = (0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2]) / 255
        r += data[k]; g += data[k + 1]; b += data[k + 2]
        if (i < SIZE / 2) left += lum; else right += lum
        if (j < SIZE / 2) top += lum; else bottom += lum
      }
    }
    const n = SIZE * SIZE
    const brightness = (left + right) / n
    const next = {
      // how much brighter or darker than a normally lit face
      level: Math.min(2, Math.max(0.25, brightness / SKIN)),
      // the light's colour: the face's average colour, with its brightness taken out
      color: [r, g, b].map((c) => c / n / 255 / Math.max(brightness, 0.05)),
      // which way the light comes from, in image x (right +) and y (up +), -1..1
      side: (right - left) / Math.max(right + left, 1e-3),
      up: (top - bottom) / Math.max(top + bottom, 1e-3),
    }
    // ease towards the new reading so the cowl's light doesn't flicker
    light = light ? ease(light, next, 0.15) : next
    return light
  }
}

function ease(a, b, t) {
  return {
    level: a.level + (b.level - a.level) * t,
    color: a.color.map((c, i) => c + (b.color[i] - c) * t),
    side: a.side + (b.side - a.side) * t,
    up: a.up + (b.up - a.up) * t,
  }
}
