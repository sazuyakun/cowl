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
Tag: [`step-2-find-where-its-facing`](https://github.com/sazuyakun/cowl/tree/step-2-find-where-its-facing)

Google keeps a **standard 3D face** (the canonical face, in centimetres). Every frame, the model also returns a 4×4 matrix: the move and turn that lines that standard face up with yours. That turn *is* your head's direction.

```js
outputFacialTransformationMatrixes: true,
const matrix = result.facialTransformationMatrixes[0]
pose.matrix.fromArray(matrix.data)
```

`pose` is a three.js group. Anything inside it (the standard face as a wireframe, red/green/blue axes from the nose tip) moves with your head. It lines up because three.js renders with the same virtual camera MediaPipe assumes: at the origin, looking down −z, with a 63° vertical field of view. The matrix's 16 numbers are column-major, which is what `fromArray` expects.

**The 3D viewer** (`/viewer.html`): spin, zoom and orbit the cowl with the mouse, next to the standard face for scale. Drop any `.glb` on it to load a different model.

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

Keys on the camera page: `1` points · `2` standard face · `3` axes · `S` save the frame as a PNG · `Shift+S` save only the overlay, on a transparent background.
Keys in the viewer: `F` standard face · `S` save a transparent PNG, 2000 px tall.

## Licence
Code: MIT. The 3D model keeps its own licence, credited on the page.
`public/canonical_face_model.obj` is from [Google's MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj) (Apache 2.0).
