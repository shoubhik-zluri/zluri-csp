# Local Setup — Step by Step

Run through this during the handover call. If you can't reach a running app by the end, the handover isn't complete.

---

## Prerequisites

- **Node.js 18+** — check with `node -v`
- **npm** — comes with Node
- **Git** — check with `git --version`
- **A GitHub account** with access to the repo (see `01_PLATFORM_ACCESS.md`)
- **The actual `.env` values** from Shrikant (see `02_ENV_AND_CREDENTIALS.md`)

---

## Step 1 — Clone the repo

```bash
git clone https://github.com/shrikaant-zluri/zluri-csm.git
cd zluri-csm
```

> If you get "Repository not found", you haven't been added as a collaborator yet. Ask Shrikant.

---

## Step 2 — Install dependencies

```bash
npm install
```

Takes ~30 seconds. You should see no errors (warnings are fine).

---

## Step 3 — Set up environment variables

```bash
cp .env.local.example .env.local
```

Now open `.env.local` in any editor and fill in the values (get them from Shrikant):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...
GRANOLA_REFRESH_TOKEN=...
```

---

## Step 4 — Run the development server

```bash
npm run dev
```

Open http://localhost:3000 — you should see the login page.

---

## Step 5 — Log in

The app uses **Google OAuth** configured through Supabase. Log in with your `@zluri.com` Google account.

> If login fails with "Email domain not allowed", your account hasn't been created yet. Ask Shrikant to add you via the app's admin panel or directly in Supabase → Authentication → Users.

---

## Step 6 — Verify it's working

After login you should see:
- The **Accounts** list with real Zluri customer data
- The **Tasks** section
- The **Call Logs** / Notes section

If accounts show as empty, the CSV data hasn't been imported yet — see `06_ACCOUNT_DATA_IMPORT.md`.

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.2 |
| UI library | React | 19 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Database | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth (Google OAuth) | — |
| Background jobs | Inngest | — |
| AI | Anthropic Claude API | — |
| Hosting | Vercel | — |

### Key architectural notes (important for Claude Code sessions):

- **`CLAUDE.md`** in the repo root is what Claude Code reads at the start of every session. Always keep it updated.
- **`src/proxy.ts`** is the Next.js middleware (not `middleware.ts` — this is a Next.js 16 breaking change).
- **`params` in route handlers are Promises** — always `await params` before reading `taskId`, `accountId`, etc.
- **All API routes use `getAuthenticatedClient()`** from `src/lib/api-auth.ts` — this handles both cookie sessions (browser) and Bearer tokens (MCP/API).

---

## Common Setup Problems

| Problem | Fix |
|---------|-----|
| `Module not found` errors | Run `npm install` again |
| Login redirects to `/auth/callback?error=...` | Check `NEXT_PUBLIC_APP_URL` matches exactly (no trailing slash) |
| Supabase errors in console | Check `NEXT_PUBLIC_SUPABASE_URL` and anon key are correct |
| Blank accounts list | Data not imported yet — see `06_ACCOUNT_DATA_IMPORT.md` |
| `OAUTH_SIGNING_SECRET` error in logs | This var is only needed in production (Vercel), not local dev |

---

## Database Migrations

The database schema lives in `supabase/migrations/`. Migrations are already applied to the live Supabase project — you don't need to run them for local dev (you're connecting to the shared cloud DB).

If you ever set up a local Supabase instance:
```bash
npx supabase db push
```
