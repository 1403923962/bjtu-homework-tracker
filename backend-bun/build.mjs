import { build } from 'esbuild'

await build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/server.bundle.js',
  external: [
    // Native modules that cannot be bundled
    'onnxruntime-node',
    'sharp',
    'playwright',
    'playwright-core',
    'ddddocr-node',
    'ddddocr-core',
    // Keep node built-ins external
    'fsevents'
  ],
  banner: {
    js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
  }
})

console.log('✅ Backend bundled successfully!')
