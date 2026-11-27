import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// two pages: the live camera (index) and the 3D viewer
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        viewer: resolve(import.meta.dirname, 'viewer.html'),
      },
    },
  },
})
