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

// a real cowl: any .glb, from a URL or from a dropped file
export async function loadCowl(source) {
  const loader = new GLTFLoader()
  const gltf = typeof source === 'string'
    ? await loader.loadAsync(source)
    : await loader.parseAsync(await source.arrayBuffer(), '')
  return gltf.scene
}
