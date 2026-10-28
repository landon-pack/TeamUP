# TeamUP

Group project workspace for coordinating tasks, milestones, availability, files, and AI-assisted planning.

## Shared live app (Cloudflare)

TeamUP deploys to **Cloudflare Workers** (D1 + R2). Pushing to `main` on GitHub runs `.github/workflows/deploy.yml` and updates the live Worker.

Live URL: [https://teamup.landonpack7-teamup.workers.dev](https://teamup.landonpack7-teamup.workers.dev)  
(Cloudflare dashboard → Workers → **teamup**, or the GitHub Actions deploy log.)

### Classmate workflow

1. Clone the GitHub repo and create a branch for your work.
2. Open a PR / merge to `main`.
3. Wait for the **Deploy to Cloudflare** GitHub Action to finish.
4. Open the live URL and **Sign in** with your name + school email (no ChatGPT/Codex account required).
5. Create or join projects with invite links as usual.

Demo mode (no account): open `/demo` on the live site.

### Sign-in

Accounts are email + display name sessions (signed cookies). Use the same email your teammates invite. This is intentionally simple for a class project—not a production identity provider.

---

## One-time Cloudflare setup (project owner)

You need a Cloudflare account (free tier is enough).

### 1. Create an API token

Cloudflare dashboard → **My Profile** → **API Tokens** → **Create Token**.

Use a token that can edit Workers, D1, and R2 (Workers Scripts Edit + D1 Edit + Account Settings Read is a typical combo), or start from the “Edit Cloudflare Workers” template and add D1/R2.

Also copy your **Account ID** from the dashboard overview.

### 2. Log in locally and create resources

```bash
npm ci
npx wrangler login
# or: export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...

npm run cf:setup
```

This creates the `teamup` D1 database and `teamup-files` R2 bucket, then writes the D1 `database_id` into `wrangler.toml`. **Commit that file.**

### 3. Set Worker secrets

```bash
# required
openssl rand -base64 32 | npx wrangler secret put AUTH_SECRET

# optional: your email can configure Gemini in the UI
printf 'you@school.edu' | npx wrangler secret put SITE_OWNER_EMAIL

# optional AI features
printf 'your-gemini-key' | npx wrangler secret put GEMINI_API_KEY
openssl rand -base64 32 | npx wrangler secret put AI_CONFIG_ENCRYPTION_KEY
```

`AI_CONFIG_ENCRYPTION_KEY` must be raw base64 that decodes to 16/24/32 bytes (the app uses AES-GCM).

### 4. First deploy

```bash
npm run cf:deploy
```

Note the `*.workers.dev` URL from the output.

### 5. GitHub Actions secrets

GitHub repo → **Settings** → **Secrets and variables** → **Actions** → add:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID |
| `CLOUDFLARE_D1_DATABASE_ID` | Same id as in `wrangler.toml` |
| `AUTH_SECRET` | Same secret used above |
| `SITE_OWNER_EMAIL` | Optional |
| `GEMINI_API_KEY` | Optional |
| `AI_CONFIG_ENCRYPTION_KEY` | Optional |

After that, every push to `main` deploys.

---

## Local development

```bash
npm ci
npm run dev
```

Open the printed local URL. Sign in at `/signin`. Local D1/R2 come from Miniflare via the Vite Cloudflare plugin.

Useful scripts:

- `npm run build` — production build into `dist/`
- `npm run cf:migrate` — apply Drizzle SQL to remote D1
- `npm run cf:deploy` — build + migrate + deploy
- `npm run test:database` — relational store smoke test

Environment template: `.env.example` (copy to `.env.local` for local secrets; never commit real values).

---

## Tech stack

- Frontend: React / TypeScript (Vinext + Vite)
- Backend: Cloudflare Workers API routes
- Database: Cloudflare D1 (SQLite) + Drizzle migrations in `drizzle/`
- Files: Cloudflare R2

---

## App summary

TeamUP helps busy groups manage deadlines, task ownership, availability, and reminders with optional AI help. Projects stay private to their members.

### Quick verification

1. Sign in with name + email.
2. Create a project and add a task with a due date.
3. Reload — the task should still be there.
4. Create an invite link from Project settings and open it in another browser/profile to join.
