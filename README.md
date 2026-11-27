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
Tag: [`step-3-put-the-cowl-on`](https://github.com/sazuyakun/cowl/tree/step-3-put-the-cowl-on)

The cowl goes inside the same `pose` group, so it takes the same turn as your head, every frame.

```js
const steady = smoother.filter(matrix.data, performance.now() / 1000)
pose.matrix.fromArray(show.smooth ? steady : matrix.data)
fitFace(points, matrix.data)
```

Three things make it look worn, not pasted on:
- **An invisible head.** It writes depth but no colour, so the cowl's inside, lining and back are hidden behind it. Its face is rebuilt from your 478 points every frame (each point placed on its camera ray at the depth the matrix gives it), so it has your face's shape and moves with your jaw. A skull and a neck fill in the rest. Press `O` to see it.
- **A fit.** Any `.glb` is scaled and placed on the standard face from its bounding box (`FIT` in `src/cowl.js`): 19 cm wide, bottom at the chin line, front just ahead of the nose bridge.
- **Your light.** Each frame the middle of your face is shrunk to 24×24 pixels and measured: how bright, what colour, which side is brighter. The cowl's lights follow (`src/light.js`).

## Step 3½: smooth it
Tag: [`step-3.5-smooth-it`](https://github.com/sazuyakun/cowl/tree/step-3.5-smooth-it)

Every frame the points are guessed fresh, and every guess is a tiny bit off, so the raw cowl shakes. The fix is the [1 Euro filter](https://gery.casiez.net/1euro/) (Casiez, Roussel & Vogel, 2012): a low-pass filter whose cutoff rises with speed. Moving slowly, it smooths a lot (no jitter); moving fast, it smooths a little (no lag). It runs on the head's position and rotation (`src/smooth.js`). Press `M` to switch between raw and smooth.

```js
const steady = smoother.filter(matrix.data, performance.now() / 1000)
```

## Run it
```bash
npm install
npm run dev
```
Open the local link and allow the camera. The camera only works on `localhost` or HTTPS.

Keys on the camera page: `1` points · `2` standard face · `3` axes · `4` cowl · `M` raw/smooth · `O` show the invisible head · `S` save the frame as a PNG · `Shift+S` save only the overlay, on a transparent background · `C` save every layer at once.
Keys in the viewer (`/viewer.html`): drag to spin · `V` next view · `F` standard face · `S` save a transparent PNG, 2000 px tall. Drop any `.glb` on it to try another cowl.

**Recorded clips** (`/offline.html`): pick an H.264 clip and its frame rate. It steps through the clip one frame at a time and saves `<clip>.json` (per frame: the 478 points and the raw and smooth matrices) plus transparent PNG sequences of the cowl, raw and smooth, ready to lay over the clip. In `npm run dev`, saves go straight to `captures/`.

**A new cowl:** `npm run shrink -- big.glb public/cowl.glb 60000` cuts it to 60k faces for phones.

## Credits and licence
Code: MIT.
The cowl: ["Batman Cowl (The Dark Knight)"](https://sketchfab.com/3d-models/batman-cowl-the-dark-knight-1fb9c5d3f4604ba19e4684459bd38a9d) by [Fr3akShow](https://sketchfab.com/Fr3akShow), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Changes: simplified from 708k to 60k faces and repainted (`public/cowl.glb`).
Batman is a DC character; this is a fan-made demo, not affiliated with DC.
`public/canonical_face_model.obj` is from [Google's MediaPipe](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model.obj) (Apache 2.0).
