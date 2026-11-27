# cowl

How to become Batman in three steps. No mask. Just code.

A Batman cowl rendered from code onto your face, live in the browser. Markerless face tracking (MediaPipe Face Landmarker) + three.js, plain JavaScript, no backend: your camera never leaves your device.

Built for the "How to become Batman" reel. Each step below is a git tag, so you can open the code exactly as it was at that step.

## Step 1: find the face
Tag: [`step-1-find-the-face`](https://github.com/sazuyakun/cowl/tree/step-1-find-the-face)

A detector finds the face, then a second model puts **478 points** on it, in 3D (x, y and a relative depth z). It's Google's [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js), running in your browser on every new camera frame.

```js
const result = landmarker.detectForVideo(video, performance.now())
const points = result.faceLandmarks[0] // 478 points
drawPoints(points)
```

Each point's x and y go from 0 to 1, so `x * canvas.width` is its pixel. The video and the canvas are mirrored and cropped the same way, so the points land on your face.

## Step 2: find where it's facing
*Coming next.*

## Step 3: put the cowl on
*Coming.*

## Step 3½: smooth it
*Coming.*

## Run it
```bash
npm install
npm run dev
```
Open the local link and allow the camera. The camera only works on `localhost` or HTTPS.

## Licence
Code: MIT. The 3D model keeps its own licence, credited on the page.
