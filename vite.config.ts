import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tanstackStart(),
    // Nitro is the deployment boundary. `node-server` produces a portable
    // Node.js server in .output/server/index.mjs without changing app code.
    nitro({ preset: 'node-server' }),
    // React's plugin must come after TanStack Start's plugin.
    viteReact(),
  ],
})
