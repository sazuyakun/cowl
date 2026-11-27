import * as THREE from 'three'
import { loadDefaultCowl } from './cowl.js'

// The matrix is computed for a virtual camera (from MediaPipe's source):
// at the origin, looking down -z, 63° vertical field of view, units in cm.
// Render with the same camera and the 3D lands on the face.
const FOV = 63

// the standard face's nose tip (landmark 1), in cm
const NOSE_TIP = new THREE.Vector3(0, -1.126865, 7.475604)

export async function createHeadScene(canvas, width, height) {
  const renderer = new THREE.WebGLRenderer({
    canvas, alpha: true, antialias: true,
    preserveDrawingBuffer: true, // so a frame can be saved as a PNG
  })
  renderer.setSize(width, height, false)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 1, 10000)

  // the head's pose: everything inside moves and turns with the head
  const pose = new THREE.Group()
  pose.matrixAutoUpdate = false
  scene.add(pose)

  // light for the cowl: soft from above, a key from the front-left
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.4))
  const key = new THREE.DirectionalLight(0xffffff, 2)
  key.position.set(-30, 40, 60)
  scene.add(key)

  const canonical = await loadCanonical()
  const face = makeStandardFace(canonical)
  const axes = makeAxes(6)
  axes.position.copy(NOSE_TIP)
  const head = makeInvisibleHead(canonical)
  const slot = new THREE.Group() // holds the cowl, so it can be swapped
  slot.add(await loadDefaultCowl())
  pose.add(head.group, face, axes, slot)

  // step 3: a real cowl replaces the stand-in, fitted to the standard face
  function setCowl(object) {
    slot.clear()
    slot.add(object)
  }

  // Every frame, rebuild the invisible face from your real points, so it has
  // your face's shape (and your jaw when you talk), not the standard one.
  // Each point is put on its camera ray, at the depth the matrix gives that
  // point on the standard face, then moved into the head's own space.
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  const aspect = width / height
  const matrix = new THREE.Matrix4()
  const toHead = new THREE.Matrix4()
  const v = new THREE.Vector3()
  const inward = new THREE.Vector3()
  function fitFace(points, matrixData) {
    if (!points || !matrixData) return
    matrix.fromArray(matrixData)
    toHead.copy(pose.matrix).invert()
    const position = head.face.geometry.attributes.position
    for (let i = 0; i < position.count; i++) {
      v.fromArray(canonical.positions, i * 3).applyMatrix4(matrix)
      const depth = -v.z
      const p = points[i]
      v.set((2 * p.x - 1) * tanHalf * aspect * depth, (1 - 2 * p.y) * tanHalf * depth, -depth)
      v.applyMatrix4(toHead)
      // 4 mm under the skin, so cowl parts resting on the face still show
      inward.copy(v).sub(HEAD_CENTER).normalize()
      v.addScaledVector(inward, -0.4)
      position.setXYZ(i, v.x, v.y, v.z)
    }
    position.needsUpdate = true
  }

  // debug: tint the invisible head so you can see it hug your face
  function showHead(on) {
    head.material.colorWrite = on
    head.material.transparent = on
  }

  return {
    pose, face, axes, cowl: slot, setCowl, fitFace, showHead,
    render: () => renderer.render(scene, camera),
  }
}

const HEAD_CENTER = new THREE.Vector3(0, 1.5, -3.5)

// An invisible head: it writes depth but no colour, so every part of the cowl
// behind your head (its inside, its lining, its back) is hidden, and only the
// outside shows, around your real face, as if you were wearing it.
function makeInvisibleHead(canonical) {
  const material = new THREE.MeshBasicMaterial({
    colorWrite: false, side: THREE.DoubleSide, color: 0xff2bd6, opacity: 0.45,
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(canonical.positions.slice(), 3))
  geometry.setIndex(canonical.index)
  const face = new THREE.Mesh(geometry, material) // your face, updated every frame
  face.frustumCulled = false
  const skull = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), material)
  skull.scale.set(7.4, 9.5, 8.5)
  skull.position.copy(HEAD_CENTER)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6, 16, 32), material)
  neck.position.set(0, -12, -4.5)
  const group = new THREE.Group()
  group.add(face, skull, neck)
  group.traverse((child) => { child.renderOrder = -1 }) // depth first, then the cowl
  return { group, face, material }
}

// Google's canonical face, read straight from its .obj: vertex i is landmark i
export async function loadCanonical() {
  const text = await (await fetch('/canonical_face_model.obj')).text()
  const positions = []
  const index = []
  for (const line of text.split('\n')) {
    const [kind, ...rest] = line.trim().split(/\s+/)
    if (kind === 'v') positions.push(...rest.slice(0, 3).map(Number))
    if (kind === 'f') index.push(...rest.map((corner) => parseInt(corner, 10) - 1))
  }
  return { positions: new Float32Array(positions), index }
}

// the standard 3D face the matrix turns onto yours, as a wireframe
function makeStandardFace(canonical) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(canonical.positions, 3))
  geometry.setIndex(canonical.index)
  return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35,
  }))
}

export async function loadStandardFace() {
  return makeStandardFace(await loadCanonical())
}

// red = x (sideways), green = y (up), blue = z (out of the face)
function makeAxes(length) {
  const axes = new THREE.Group()
  const up = new THREE.Vector3(0, 1, 0)
  const directions = [
    [new THREE.Vector3(1, 0, 0), 0xff3b30],
    [new THREE.Vector3(0, 1, 0), 0x34c759],
    [new THREE.Vector3(0, 0, 1), 0x0a84ff],
  ]
  for (const [direction, color] of directions) {
    const material = new THREE.MeshBasicMaterial({ color })
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, length, 12), material)
    shaft.position.y = length / 2
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.5, 16), material)
    tip.position.y = length + 0.75
    const arrow = new THREE.Group()
    arrow.add(shaft, tip)
    arrow.quaternion.setFromUnitVectors(up, direction)
    axes.add(arrow)
  }
  return axes
}
