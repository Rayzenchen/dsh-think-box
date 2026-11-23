import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

/**
 * Test configuration for the standalone fork.
 *
 * Two classes of host packages cannot be imported directly under Vitest:
 *
 * 1. Browser bundles shipped as `window.__ModuleLoader__.load({...})` scripts
 *    (`@deepseek-ai/dsh-client-runtime`, `@deepseek-ai/dsh-client-locale`).
 *    They are aliased to the minimal mirrors in `tests/shims/`; the mirrors
 *    keep the pinned runtime API (cordis service names, `slots/changed`,
 *    locale lookup chain) but carry no browser-bundle machinery.
 * 2. Prebuilt plain-ESM packages that import `.module.css`
 *    (`@deepseek-ai/dsh-client-ui-primitives`, `...-attachment`). They are
 *    inlined so Vite, not Node's native ESM loader, processes them; Vitest's
 *    `css: false` path then serves a stable class-name proxy for the CSS
 *    modules instead of throwing "Unknown file extension .css".
 *
 * The upstream config's `harnessPathsPlugin` (which remapped `@deepseek-ai/*`
 * onto a sibling `deepseek-harness` source checkout) is gone: that checkout is
 * not part of this fork, so the plugin always resolved to null and only hid
 * which resolution path the tests actually used.
 */
export default defineConfig({
  root,
  resolve: {
    alias: {
      react: resolve(root, 'node_modules/react'),
      'react/jsx-runtime': resolve(root, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': resolve(root, 'node_modules/react/jsx-dev-runtime.js'),
      'react-dom': resolve(root, 'node_modules/react-dom'),
      'react-dom/client': resolve(root, 'node_modules/react-dom/client.js'),
      '@deepseek-ai/dsh-client-runtime/client': resolve(root, 'tests/shims/client-runtime.ts'),
      '@deepseek-ai/dsh-client-runtime': resolve(root, 'tests/shims/client-runtime.ts'),
      '@deepseek-ai/dsh-client-locale/client': resolve(root, 'tests/shims/client-locale.ts'),
      '@deepseek-ai/dsh-client-locale': resolve(root, 'tests/shims/client-locale.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.spec.tsx'],
    server: {
      deps: {
        inline: [/@deepseek-ai\/dsh-client-ui-(?:primitives|attachment)/],
      },
    },
  },
})
