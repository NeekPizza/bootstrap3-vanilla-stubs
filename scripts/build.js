import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const banner = `/*! ${pkg.name} v${pkg.version} | ${pkg.license} License */`;

const shared = {
  entryPoints: ['src/index.js'],
  bundle: true,
  target: ['es2020'],
  banner: { js: banner },
  legalComments: 'none',
  logLevel: 'info',
};

await Promise.all([
  build({ ...shared, format: 'esm', outfile: 'dist/bootstrap3-vanilla-stubs.mjs' }),
  build({ ...shared, format: 'cjs', outfile: 'dist/bootstrap3-vanilla-stubs.cjs' }),
  // Classic <script> build: auto-initialises and exposes window.Bootstrap3VanillaStubs.
  build({
    ...shared,
    format: 'iife',
    minify: true,
    sourcemap: true,
    outfile: 'dist/bootstrap3-vanilla-stubs.min.js',
  }),
]);
