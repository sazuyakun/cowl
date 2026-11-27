import * as THREE from 'three'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'

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

  const face = await loadStandardFace()
  const axes = makeAxes(6)
  axes.position.copy(NOSE_TIP)
  pose.add(face, axes)

  return { pose, face, axes, render: () => renderer.render(scene, camera) }
}

// Google's canonical face: the standard 3D face the matrix turns onto yours
export async function loadStandardFace() {
  const obj = await new OBJLoader().loadAsync('/canonical_face_model.obj')
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35,
  })
  obj.traverse((child) => { if (child.isMesh) child.material = material })
  return obj
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
