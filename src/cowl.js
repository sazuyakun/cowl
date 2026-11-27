import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

// A stand-in cowl made in code, until the real model is picked.
// Units are cm, in the standard face's space (nose tip at z ≈ 7.5).
export function makeStandInCowl() {
  const material = new THREE.MeshStandardMaterial({
    color: 0x1b1b21, roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide,
  })
  const cowl = new THREE.Group()

  // the hood: the top of a sphere, down to about the nose
  const hood = new THREE.Mesh(
    new THREE.SphereGeometry(10.5, 64, 32, 0, Math.PI * 2, 0, Math.PI * 0.6),
    material,
  )
  hood.scale.set(0.95, 1.1, 1.05)
  hood.position.set(0, 1.5, -3)
  cowl.add(hood)

  // the ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(1.3, 6, 24), material)
    ear.position.set(side * 4.6, 13.5, -3)
    ear.rotation.z = -side * 0.12
    cowl.add(ear)
  }
  return cowl
}

// Where a real cowl sits on the standard face, in cm. Set once by eye in the viewer.
export const FIT = {
  turn: 0,      // degrees around the vertical axis, if the model doesn't face +z
  width: 19,    // the cowl's full width (the face is 15.5 cm wide)
  bottom: -9,   // its lowest point, at the chin line (chin is at -9.4)
  front: 8.6,   // its most forward point, just in front of the nose bridge
}

// Scale and place any cowl on the standard face, from its bounding box.
export function fitToHead(model, fit = FIT) {
  const holder = new THREE.Group()
  model.rotation.y = THREE.MathUtils.degToRad(fit.turn)
  holder.add(model)
  holder.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(model)
  model.scale.multiplyScalar(fit.width / (box.max.x - box.min.x))
  holder.updateMatrixWorld(true)
  box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.x -= center.x
  model.position.y += fit.bottom - box.min.y
  model.position.z += fit.front - box.max.z
  return holder
}

// matte black with a little sheen, for an untextured model
const paint = new THREE.MeshStandardMaterial({ color: 0x15161b, roughness: 0.5, metalness: 0.15 })

// a real cowl: any .glb, from a URL or from a dropped file
export async function loadCowl(source) {
  const loader = new GLTFLoader()
  const gltf = typeof source === 'string'
    ? await loader.loadAsync(source)
    : await loader.parseAsync(await source.arrayBuffer(), '')
  gltf.scene.traverse((child) => {
    if (child.isMesh && !child.material.map) child.material = paint
  })
  return fitToHead(gltf.scene)
}

// the picked cowl if it's on the site, else the stand-in
export async function loadDefaultCowl() {
  try {
    return await loadCowl('/cowl.glb')
  } catch {
    return makeStandInCowl()
  }
}
