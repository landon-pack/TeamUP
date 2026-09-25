# Teamup

A student group-project workspace built with React, Vinext, Cloudflare D1 and R2.

## Available

- Private website with dispatch-owned ChatGPT sign-in and editable display names.
- Multiple saved projects with member-email authorization.
- Assigned tasks, status changes, milestones and progress summaries.
- Availability for the next seven days, stored in UTC, with overlap indicators.
- Shared file uploads and downloads (10 MB maximum).
- Optimistic version checks to prevent silently overwriting teammate edits.
- AI planner endpoint and review flow, powered by Gemini, with encrypted owner-only key setup.

## Connections and remaining PRD work

- AI planning and private assignment chat require a Gemini API key, connected through the owner-only Connect Gemini dialog. The planner accepts pasted requirements or TXT/Markdown import; PDF extraction is not implemented.
- Email reminder preferences are stored, but email delivery and scheduled jobs are not connected. No emails are sent.
- The Site is owner-private. Granting website access is separate from adding project members. Team members must sign in with their listed email.
- Accounts use ChatGPT sign-in rather than email/password registration or usernames.
- In-app messaging, gamification, calendar integration and optional cosmetic rewards are not implemented.

## Development

Use npm run install:ci, npm run db:generate, and npm run build. Apply generated migrations to the local D1 database before npm start; see the Sites starter documentation. Runtime DB and BUCKET bindings are declared in .openai/hosting.json. Production schema changes use generated Drizzle migrations.

Validated locally: TypeScript, production build, authentication rejection, project creation/read-back, Gemini request construction and error handling with mocked responses, version conflicts, cross-user access denial, disconnected-planner errors, file upload/download and WebMCP valid/invalid inputs.

Gemini integration follows https://ai.google.dev/api/generate-content. The model is gemini-2.5-flash-lite, which currently offers a free tier (https://ai.google.dev/gemini-api/docs/pricing). Quotas and Google data terms apply. No fallback to OpenAI or automatic billing upgrade is implemented.

AI_CONFIG_ENCRYPTION_KEY is a 32-byte base64 AES key stored as a Site secret. Do not rotate it without decrypting and re-encrypting ai_config.sealed_key. SITE_OWNER_EMAIL restricts configuration to the Site owner. Keys are tested against Gemini before being saved and never returned to clients.
