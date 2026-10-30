import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";
import { sites } from "./build/sites-vite-plugin";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";
const managedLinux = readExecutionProfile() === "managed-linux";

/** Prefer the committed wrangler.toml D1 id so `npm run dev` and `cf:migrate --local` share one DB. */
function readWranglerD1() {
  try {
    const toml = readFileSync(fileURLToPath(new URL("./wrangler.toml", import.meta.url)), "utf8");
    return {
      databaseId: toml.match(/database_id\s*=\s*"([^"]+)"/)?.[1],
      databaseName: toml.match(/database_name\s*=\s*"([^"]+)"/)?.[1],
      bucketName: toml.match(/bucket_name\s*=\s*"([^"]+)"/)?.[1],
    };
  } catch {
    return {};
  }
}

const wranglerD1 = readWranglerD1();
const d1DatabaseId =
  process.env.CLOUDFLARE_D1_DATABASE_ID ||
  wranglerD1.databaseId ||
  SITE_CREATOR_PLACEHOLDER_DATABASE_ID;
const d1DatabaseName =
  process.env.CLOUDFLARE_D1_DATABASE_NAME || wranglerD1.databaseName || "teamup";
const r2BucketName =
  process.env.CLOUDFLARE_R2_BUCKET_NAME || wranglerD1.bucketName || "teamup-files";

// Keep flags in wrangler.toml only — duplicating nodejs_compat here makes Miniflare crash.
const localBindingConfig = {
  name: "teamup",
  main: "vinext/server/fetch-handler",
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: d1DatabaseName,
          database_id: d1DatabaseId,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: r2BucketName,
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: {
      ...(managedLinux ? { host: "0.0.0.0", allowedHosts: ["terminal.local"] } : {}),
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
    },
    plugins: [
      vinext(),
      // Session auth is handled by the app (`/signin`); keep the plugin for Sites build packaging only.
      sites({ mockAuth: false }),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
