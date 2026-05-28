# Platform Access — Transfer Guide

Transfer each platform below before the handover call ends.

---

## 1. GitHub

**Repo:** https://github.com/shrikaant-zluri/zluri-csm  
**Current owner account:** `shrikaant-zluri`  
**Visibility:** Private

### Option A — Transfer repository ownership (recommended)
Best if the CSOPS team has an org or personal account to own it.

1. Go to the repo → **Settings** → **General** → scroll to the bottom → **Transfer**
2. Type the repo name to confirm
3. Enter the new owner's GitHub username or org name
4. The new owner gets an email to accept the transfer

> ⚠️ After transfer, Shrikant loses admin access unless re-added as a collaborator.

### Option B — Add as collaborators (keep ownership, share access)
Better if you want Shrikant to stay involved.

1. Go to repo → **Settings** → **Collaborators and teams**
2. Click **Add people** → enter each team member's GitHub username
3. Set role to **Maintain** (can push, manage issues, but not delete repo) or **Admin**

### Recommended collaborators to add:
- Each CSOPS team member who will deploy or review PRs → **Maintain**
- CS Ops lead who manages the project → **Admin**

---

## 2. Supabase

**Project:** Zluri CSM  
**Dashboard:** https://supabase.com/dashboard  
**Current owner:** Shrikant's personal Supabase account

### Transferring access:

1. Log in to https://supabase.com/dashboard
2. Select the **Zluri CSM** project
3. Go to **Project Settings** → **Team**
4. Click **Invite member**
5. Enter team member email, set role to **Owner** or **Developer**

### What to hand over:
- [ ] Add all CSOPS team members as **Developers** minimum
- [ ] Add CS Ops lead as **Owner**
- [ ] Share these keys via 1Password (do NOT put in Slack unencrypted):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` ← treat this like a database root password

### Plan:
The project should be on **Supabase Pro** for:
- Daily automated backups (point-in-time recovery)
- No pausing after inactivity

If it's on Free tier, upgrade before handover.

---

## 3. Vercel

**Project:** `zluri-csm`  
**Current owner:** Shrikant's personal Vercel account  
**Live URL:** https://zluri-csm.vercel.app

### Transferring access:

**Option A — Move to a Vercel Team (recommended):**
1. Create or use an existing Vercel Team for Zluri
2. In Vercel dashboard → project settings → **Transfer Project** to the team
3. Add team members: https://vercel.com/teams → Invite Members

**Option B — Add as collaborators:**
1. Vercel dashboard → project → **Settings** → **Members** → Invite

### Environment variables (set in Vercel, not in code):
After gaining access, check **Settings → Environment Variables**. The following should be set for Production:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL          = https://zluri-csm.vercel.app
ANTHROPIC_API_KEY
GRANOLA_REFRESH_TOKEN
INNGEST_EVENT_KEY
INNGEST_SIGNING_KEY
OAUTH_SIGNING_SECRET
ENFORCE_EMAIL_DOMAIN         = zluri.com  (restricts login to Zluri email)
```

### How to deploy a new version:
Just push to `main` branch — Vercel auto-deploys. No manual step needed.

---

## 4. Inngest

**What it is:** Background job platform. Runs the Granola call sync (daily at 2am) and the AI task extraction pipeline.  
**Dashboard:** https://app.inngest.com  
**Current owner:** Shrikant's account

### Transferring access:
1. Log in to https://app.inngest.com
2. Go to the **Zluri** app → **Settings** → **Team**
3. Invite team members by email

### Keys to hand over:
- `INNGEST_EVENT_KEY` — used by the Next.js app to trigger events
- `INNGEST_SIGNING_KEY` — used to verify Inngest can call your `/api/inngest` endpoint

Both are in Inngest dashboard → **Settings** → **Event Keys** / **Signing Keys**.

### Background jobs running:
| Job | Trigger | What it does |
|-----|---------|-------------|
| `sync-calls` | Daily 2am UTC + manual | Fetches Granola docs, matches to accounts, creates call logs |
| `extractNoteInsights` | On new note saved | Runs Claude to extract action items from transcript |

---

## 5. Anthropic (Claude API)

**What it's used for:** Extracting action items and risk signals from Granola call transcripts.  
**Dashboard:** https://console.anthropic.com  
**Key name:** `ANTHROPIC_API_KEY`

### Transferring:
1. Decide whether to use Shrikant's personal API key or create a new one under a Zluri account
2. If creating new: https://console.anthropic.com → **API Keys** → **Create Key**
3. Update `ANTHROPIC_API_KEY` in Vercel env vars

> Recommendation: Create a dedicated Zluri Anthropic account so the key isn't tied to one person.

---

## 6. Granola

**What it is:** Meeting notes tool. The platform pulls call transcripts from Granola to create call logs and AI-suggested tasks.  
**Key:** `GRANOLA_REFRESH_TOKEN` — a long-lived refresh token from Granola's auth

### Important caveat:
The refresh token is tied to **the Granola account of the person running the sync**. Currently it's Shrikant's Granola account. If the CSOPS team will run syncs, they need to:

1. Install Granola app on a Mac (it uses local app storage)
2. Sign in with the relevant Granola account
3. Run `bash scripts/get-granola-token.sh` — this extracts the token
4. Update `GRANOLA_REFRESH_TOKEN` in Vercel env vars

> See `04_GRANOLA_CALL_SYNC.md` for full details.

---

## Summary Table

| Platform | URL | Action needed |
|----------|-----|---------------|
| GitHub | https://github.com/shrikaant-zluri/zluri-csm | Transfer or add collaborators |
| Supabase | https://supabase.com/dashboard | Add team members, share keys via 1Password |
| Vercel | https://vercel.com | Transfer to team or add members |
| Inngest | https://app.inngest.com | Invite team members, share keys |
| Anthropic | https://console.anthropic.com | Create org key or transfer |
| Granola | — | New token needed per account (see doc) |
