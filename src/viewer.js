import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { loadDefaultCowl, loadCowl } from './cowl.js'
import { loadStandardFace } from './head.js'
import { saveCanvas } from './save.js'

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(devicePixelRatio)
renderer.setSize(innerWidth, innerHeight)
document.body.append(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 1, 1000)
camera.position.set(28, 10, 48)

// drag to spin, scroll to zoom, right-drag to move
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 2, -2)
controls.enableDamping = true

scene.add(new THREE.HemisphereLight(0xffffff, 0x222233, 1.2))
const key = new THREE.DirectionalLight(0xffffff, 2.5)
key.position.set(20, 30, 30)
const rim = new THREE.DirectionalLight(0x9db4ff, 1.5)
rim.position.set(-25, 10, -30)
scene.add(key, rim)

// the standard face, for scale: the cowl has to fit around it
const face = await loadStandardFace()
scene.add(face)

let cowl = await loadDefaultCowl()
scene.add(cowl)

async function swapCowl(source) {
  const next = await loadCowl(source)
  scene.remove(cowl)
  cowl = next
  scene.add(cowl)
}

// ?model=/cowl.glb loads a model from the site; or drop a .glb on the page
const url = new URLSearchParams(location.search).get('model')
if (url) swapCowl(url).catch(console.error)
addEventListener('dragover', (e) => e.preventDefault())
addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (file) swapCowl(file).catch(console.error)
})

// keys: f standard face · s save a transparent PNG, 2000 px tall
addEventListener('keydown', (e) => {
  if (e.key === 'f') face.visible = !face.visible
  if (e.key === 's') saveStill(2000)
})

async function saveStill(heightPx) {
  renderer.setPixelRatio(heightPx / innerHeight)
  renderer.render(scene, camera)
  await saveCanvas(renderer.domElement, `cowl-still-${Date.now()}.png`)
  renderer.setPixelRatio(devicePixelRatio)
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(innerWidth, innerHeight)
})

renderer.setAnimationLoop(() => {
  controls.update()
  renderer.render(scene, camera)
})
