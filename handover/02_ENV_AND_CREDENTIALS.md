# Environment Variables & Credentials

**Rule:** Key names live in the repo (`.env.local.example`). Actual values are NEVER committed. Get them from Shrikant over Slack DM or 1Password — never email.

---

## Complete Variable Reference

### Local Development (`.env.local`)

| Variable | Required | Where to get it | Notes |
|----------|----------|----------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Supabase dashboard → Project Settings → API | Starts with `https://` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | Supabase dashboard → Project Settings → API | Safe to use in browser |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase dashboard → Project Settings → API | **Never expose client-side** |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | `http://localhost:3000` for local | Vercel URL in production |
| `ANTHROPIC_API_KEY` | ✅ Yes | console.anthropic.com → API Keys | For AI task extraction |
| `GRANOLA_REFRESH_TOKEN` | ✅ Yes | Run `bash scripts/get-granola-token.sh` | See `04_GRANOLA_CALL_SYNC.md` |
| `NEXT_PUBLIC_MOCK_MODE` | No | Set `false` for real data | Set `true` to skip Granola in local dev |
| `NEXT_PUBLIC_AI_PROVIDER` | No | `anthropic` | Default, leave as-is |

### Production Only (Vercel env vars — not in `.env.local`)

| Variable | Where to get it | Notes |
|----------|----------------|-------|
| `INNGEST_EVENT_KEY` | Inngest dashboard → Settings → Event Keys | App uses this to fire events |
| `INNGEST_SIGNING_KEY` | Inngest dashboard → Settings → Signing Keys | Verifies Inngest → app webhooks |
| `OAUTH_SIGNING_SECRET` | Generate once: `openssl rand -hex 32` | Signs MCP OAuth tokens. Must be a long random string. |
| `ENFORCE_EMAIL_DOMAIN` | Set to `zluri.com` | Restricts login to @zluri.com Google accounts |

---

## How to Create Your `.env.local`

```bash
# 1. Copy the example file
cp .env.local.example .env.local

# 2. Fill in the values — ask Shrikant for the actual values
# (see table above for where each value comes from)
```

The `.env.local.example` already in the repo covers the core local vars.  
Add the production-only vars to Vercel, not to `.env.local`.

---

## Security Rules

1. **Never commit `.env.local`** — it's in `.gitignore`, but double-check before any `git add .`
2. **`SUPABASE_SERVICE_ROLE_KEY` is a database root password** — treat it accordingly. Don't paste it in Slack, docs, or anywhere that logs messages.
3. **`OAUTH_SIGNING_SECRET`** — if this rotates, all existing MCP API keys stop working until re-issued. Only change if you suspect it's compromised.
4. **`GRANOLA_REFRESH_TOKEN`** — tied to a person's Granola account. Rotate when that person's Granola access changes.

---

## Generating OAUTH_SIGNING_SECRET (if you need to create a new one)

```bash
openssl rand -hex 32
# Copy the output and set it as OAUTH_SIGNING_SECRET in Vercel
```

After changing it, all existing API keys in the app's `api_keys` table become invalid. Users will need to regenerate their keys in Settings → API Keys.
