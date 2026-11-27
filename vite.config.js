import { mkdir, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = import.meta.dirname

// Dev only: POST /__save?name=x.png writes the body to captures/x.png,
// so saving frames needs no download prompts (and works for long sequences).
function saveCaptures() {
  const dir = resolve(root, 'captures')
  return {
    name: 'save-captures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', async (req, res) => {
        const name = basename(new URL(req.url, 'http://localhost').searchParams.get('name') || '')
        if (req.method !== 'POST' || !name.endsWith('.png')) {
          res.statusCode = 400
          return res.end('POST a .png')
        }
        const chunks = []
        for await (const chunk of req) chunks.push(chunk)
        await mkdir(dir, { recursive: true })
        await writeFile(resolve(dir, name), Buffer.concat(chunks))
        res.end('saved')
      })
    },
  }
}

// two pages: the live camera (index) and the 3D viewer
export default defineConfig({
  plugins: [saveCaptures()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        viewer: resolve(root, 'viewer.html'),
      },
    },
  },
})
