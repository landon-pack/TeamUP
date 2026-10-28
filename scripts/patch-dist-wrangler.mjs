#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const toml = readFileSync(path.join(root, 'wrangler.toml'), 'utf8');
const databaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ||
  toml.match(/database_id\s*=\s*"([^"]+)"/)?.[1];
const databaseName = toml.match(/database_name\s*=\s*"([^"]+)"/)?.[1] || 'teamup';
const bucketName = toml.match(/bucket_name\s*=\s*"([^"]+)"/)?.[1] || 'teamup-files';

if (!databaseId || databaseId.startsWith('00000000')) {
  throw new Error(
    'Set CLOUDFLARE_D1_DATABASE_ID or run `npm run cf:setup` and commit wrangler.toml with a real database_id.',
  );
}

const configPath = path.join(root, 'dist/server/wrangler.json');
if (!existsSync(configPath)) {
  throw new Error('Missing dist/server/wrangler.json — run the build first.');
}

const config = JSON.parse(readFileSync(configPath, 'utf8'));
config.name = 'teamup';
config.compatibility_flags = [
  ...new Set([...(config.compatibility_flags || []), 'nodejs_compat']),
];
config.d1_databases = [
  { binding: 'DB', database_name: databaseName, database_id: databaseId },
];
config.r2_buckets = [{ binding: 'BUCKET', bucket_name: bucketName }];
writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log('Patched', configPath);
