// Fast production build: transpiles src/**/*.ts -> dist/**/*.js with esbuild,
// one-to-one (no bundling), matching what `tsc` used to produce. This is a
// real transpile-only step - no cross-file type graph is ever built, which
// is what made `tsc` (even with --noCheck) OOM on this project: the `ai`,
// langchain, and openai packages ship enormous .d.ts files, and just
// resolving that type graph for emit was the expensive part, not checking.
//
// Safety net: `npx tsc --noEmit` (a separate, non-blocking step - see
// package.json's "typecheck" script) is what actually verifies types; this
// build step only strips them.
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as esbuild from 'esbuild';

const SRC_DIR = new URL('../src', import.meta.url).pathname;
const OUT_DIR = new URL('../dist', import.meta.url).pathname;

function findTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const entryPoints = findTsFiles(SRC_DIR);
console.log(`Transpiling ${entryPoints.length} files...`);

await esbuild.build({
  entryPoints,
  outdir: OUT_DIR,
  outbase: SRC_DIR,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: true,
  logLevel: 'info',
});

console.log(`Done - output in ${relative(process.cwd(), OUT_DIR)}/`);
