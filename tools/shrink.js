// Shrink a .glb for phones: merge duplicate vertices, then simplify the mesh.
// npm run shrink -- <in.glb> <out.glb> [target faces, default 50000]
import { NodeIO } from '@gltf-transform/core'
import { dedup, weld, simplify, prune } from '@gltf-transform/functions'
import { MeshoptSimplifier } from 'meshoptimizer'

const [input, output, target = '50000'] = process.argv.slice(2)
if (!input || !output) {
  console.error('usage: npm run shrink -- <in.glb> <out.glb> [target faces]')
  process.exit(1)
}

const countFaces = (doc) => doc.getRoot().listMeshes()
  .flatMap((mesh) => mesh.listPrimitives())
  .reduce((sum, p) => sum + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3, 0)

const io = new NodeIO()
const doc = await io.read(input)
const before = countFaces(doc)
await MeshoptSimplifier.ready
await doc.transform(
  dedup(),
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, Number(target) / before), error: 0.002 }),
  prune(),
)
await io.write(output, doc)
console.log(`${Math.round(before)} → ${Math.round(countFaces(doc))} faces · ${output}`)
