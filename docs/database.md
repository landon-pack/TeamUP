# Teamup relational database

The application uses Cloudflare D1 (SQLite), not PostgreSQL or Supabase. Its active business entities now follow the team's ERD:

| ERD entity | SQL table | Key relationships |
|---|---|---|
| User | users | id PK; auth_id maps the hosted login; email is unique |
| Group | groups | id PK |
| Group Members | group_members | (group_id, user_id) composite PK; both FKs; role |
| Settings | settings | user_id is both PK and FK |
| Projects | projects | group_id FK; title, description, course, deadline, reminder_hours |
| Milestone | milestones | project_id FK; title, description, due_date, status |
| Tasks | tasks | project_id, assigned_user_id, milestone_id FKs; title, description, due_date, status |
| Availability | availability | user_id and project_id FKs; start_at and end_at |
| File | files | project_id and uploaded_by FKs; name, storage_key, size, type, created |
| Conversation | conversations | user_id and project_id FKs |
| AI Messaging | ai_messaging | conversation_id FK; role, contents, created_at |

Each group has many memberships and projects. Each user has many memberships, assigned tasks, availability intervals, uploads, and conversations, and at most one settings row. Each project has many tasks, milestones, availability intervals, files, and conversations. Each milestone can have many tasks; each conversation can have many messages. Tasks may be unassigned or have no milestone. A composite foreign key ensures the selected milestone belongs to the same project.

The current create-project flow creates a new group for each project, preserving the previous project-by-project sharing boundaries. The schema supports more than one project per group. Group membership is authoritative for project access; adding a person by their sign-in email creates a user record that is connected to their identity on first login. Only the project owner can change its membership through the current UI.

Availability is project-specific and the grid stores one-hour intervals in UTC. Completed tasks remain saved with status `done`, but disappear from active lists; use the Completed tab to view or reopen them. No sample users or projects are created for new accounts.

## Existing data

Migration `0003_elite_justin_hammer.sql` adds tables and columns without deleting existing records. Existing projects are converted atomically on the first authorized read. New writes use the relational tables, not project JSON. Existing conversation messages are imported idempotently when their owner opens the chat.

The original `profiles`, `memberships`, `chats`, and `projects.data` remain as migration backups. Once a project is converted, old membership rows do not grant access. Do not delete the backups until all existing data is verified. Existing file records have no known uploader because the old schema did not capture one; their `uploaded_by` stays null rather than inventing an uploader. New uploads record the real uploader and R2 storage key.

`ai_config` is a separate server configuration table, not part of the 11 business entities. Credentials remain encrypted; do not seed fake API keys or include secrets in sample datasets.

## Verification

Run `npm run test:database` with Node 22 or later. It applies all migrations to an isolated SQLite database, exercises the actual workspace route and data layer, and checks new empty projects, task completion persistence, version conflicts, membership isolation, revoked access, availability ownership, and legacy project/chat migration. It does not call the live Gemini service or change production records.

After deployment: sign in with a new account, create a project, add and complete a task, refresh, and verify it is absent from Active tasks and present in Completed. Add a teammate by email and confirm they can access the project; an unrelated account must not see it. Remove the teammate and confirm access is lost after refresh.

## Invitation links

`project_invites` stores one active link per project: project_id (PK/FK), token_hash (unique), created_by (user FK), created_at, and expires_at. Only the owner can create, replace, or revoke a link. The raw random token is shown only when generated; only its SHA-256 hash is stored. Links expire after seven days and require sign-in and explicit acceptance. Anyone with a valid link can join, up to the existing 30-person team limit. Revoking a link prevents future joins, not access for members already accepted; remove those members separately if needed. Acceptance increments the project version so stale team edits cannot silently remove a new member.
