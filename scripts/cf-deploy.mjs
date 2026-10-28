#!/usr/bin/env node
/**
 * Build the vinext app, sync binding IDs into dist wrangler config, and deploy.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const wranglerBin = path.join(root, 'node_modules/wrangler/bin/wrangler.js');

function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!process.argv.includes('--skip-build')) {
  console.log('Building…');
  run([path.join(root, 'scripts/run-framework.mjs'), 'build']);
}

run([path.join(root, 'scripts/patch-dist-wrangler.mjs')]);

if (!process.argv.includes('--skip-migrations')) {
  run([path.join(root, 'scripts/cf-migrate.mjs')]);
}

console.log('Deploying Worker…');
run([wranglerBin, 'deploy', '--config', 'dist/server/wrangler.json']);
console.log('Deploy finished.');
