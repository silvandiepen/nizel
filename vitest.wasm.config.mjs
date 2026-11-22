// Gate 3 of NIZEL-001: every suite again, with the WebAssembly entry points
// standing in for the JavaScript ones. `node scripts/test-wasm-entry-points.mjs`.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dist = (pkg, file) => fileURLToPath(new URL(`packages/${pkg}/dist/${file}`, import.meta.url));
// The package under test: its own `../dist/index.js` becomes its Wasm entry when it has one.
const pkg = process.env.NIZEL_WASM_PACKAGE ?? '';
const ownWasm = pkg && existsSync(dist(pkg, 'wasm.js'));
const ownBrowserWasm = pkg && existsSync(dist(pkg, 'browser-wasm.js'));

export default defineConfig({
  test: { include: ['test/*.mjs'] },
  resolve: {
    alias: [
      ...(ownWasm ? [{ find: /^\.\.\/dist\/index\.js$/, replacement: dist(pkg, 'wasm.js') }] : []),
      ...(ownBrowserWasm ? [{ find: /^\.\.\/dist\/browser\.js$/, replacement: dist(pkg, 'browser-wasm.js') }] : []),
      { find: /^nizel$/, replacement: dist('nizel', 'wasm.js') },
      { find: /^nizel\/browser$/, replacement: dist('nizel', 'browser-wasm.js') },
      { find: /^nizel-kit$/, replacement: dist('nizel-kit', 'wasm.js') },
    ],
  },
});
