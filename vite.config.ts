import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'
import type { Plugin } from 'vite'

// Bundle-root files (vcaguide.md → "Bundle-root files"): config.json sets the app name
// and database.json declares the virtual tables. Both live at the project root and are
// emitted at the root of dist/ so the deploy ZIP carries them.
function bundleRootFiles(names: string[], demo: boolean): Plugin {
  return {
    name: 'valance-bundle-root-files',
    apply: 'build',
    generateBundle() {
      for (const name of names) {
        const source = path.resolve(import.meta.dirname, name)
        if (!fs.existsSync(source)) continue
        const json = JSON.parse(fs.readFileSync(source, 'utf8'))
        // The login-free demo keeps its data in the browser: no tables, separate app name.
        if (demo && name === 'database.json') continue
        if (demo && name === 'config.json') json.name = `${json.name}（デモ）`
        this.emitFile({ type: 'asset', fileName: name, source: `${JSON.stringify(json, null, 2)}\n` })
      }
    },
  }
}

// `npm run dev` proxies the same-origin API path (/v1) to a real environment so
// local development uses live data without any CORS or host configuration in
// app code. Set VITE_API_TARGET in .env.development to the ORIGIN you open the
// portal on (e.g. https://portal.example.com or http://valance-op-e2fd.local).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_TARGET
  if (mode === 'development' && !apiTarget) {
    console.warn(
      '[vite] VITE_API_TARGET is not set — /v1 API calls will 404. ' +
        'Copy .env.development.example to .env.development and set it.',
    )
  }
  return {
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    plugins: [react(), bundleRootFiles(['config.json', 'database.json'], mode === 'demo')],
    define: {
      // 'demo' mode (npm run build:demo) builds the login-free demo; every other build leaves it empty.
      'import.meta.env.VITE_DEMO': JSON.stringify(mode === 'demo' ? '1' : ''),
    },
    build: {
      // Vite 8 drops licence banners when it minifies. Keep them: the MIT / ISC /
      // Apache notices must ship with the bundled code, and the platform's
      // licence scan identifies bundled libraries from them.
      rolldownOptions: { output: { comments: { legal: true } } },
    },
    server: {
      port: 3001,
      proxy: apiTarget
        ? { '/v1': { target: apiTarget, changeOrigin: true, secure: true } }
        : undefined,
    },
  }
})
