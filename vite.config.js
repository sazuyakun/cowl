import { mkdir, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { defineConfig } from 'vite'

const root = import.meta.dirname

// Dev only: POST /__save?name=x.png&dir=clip writes the body to captures/clip/x.png,
// so saving frames needs no download prompts (and works for long sequences).
function saveCaptures() {
  const captures = resolve(root, 'captures')
  return {
    name: 'save-captures',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__save', async (req, res) => {
        const params = new URL(req.url, 'http://localhost').searchParams
        const name = basename(params.get('name') || '')
        const dir = resolve(captures, basename(params.get('dir') || ''))
        if (req.method !== 'POST' || !/\.(png|json)$/.test(name)) {
          res.statusCode = 400
          return res.end('POST a .png or .json')
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

// three pages: the live camera (index), the 3D viewer, and offline (recorded clips)
export default defineConfig({
  plugins: [saveCaptures()],
  // `npm run preview` behind a temporary Cloudflare tunnel, to try it on a phone
  preview: { allowedHosts: ['.trycloudflare.com'] },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        viewer: resolve(root, 'viewer.html'),
        offline: resolve(root, 'offline.html'),
      },
    },
  },
})
