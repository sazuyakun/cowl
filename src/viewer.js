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

// drag to spin, scroll to zoom, right-drag to move
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, 3, -2)
controls.enableDamping = true

// camera presets: V cycles them; ?view=front|three-quarter|side picks one
const views = {
  'three-quarter': [40, 12, 62],
  front: [0, 3, 75],
  side: [75, 3, -2],
}
function setView(name) {
  camera.position.set(...views[name])
  controls.update()
}
const params = new URLSearchParams(location.search)
let view = views[params.get('view')] ? params.get('view') : 'three-quarter'
setView(view)

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
const url = params.get('model')
if (url) swapCowl(url).catch(console.error)
addEventListener('dragover', (e) => e.preventDefault())
addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (file) swapCowl(file).catch(console.error)
})

// ?face=0 hides the standard face (for clean stills)
if (params.get('face') === '0') face.visible = false

// keys: f standard face · v next view · s save a transparent PNG, 2160 px tall
addEventListener('keydown', (e) => {
  if (e.key === 'f') face.visible = !face.visible
  if (e.key === 'v') {
    const names = Object.keys(views)
    view = names[(names.indexOf(view) + 1) % names.length]
    setView(view)
  }
  if (e.key === 's') saveStill(2160)
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
