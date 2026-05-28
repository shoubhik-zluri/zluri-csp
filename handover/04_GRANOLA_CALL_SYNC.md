# Granola Call Sync — How It Works

This is the primary live data integration. It pulls call recordings and transcripts from Granola, matches them to accounts, and creates Call Log entries in the platform. Claude then reads those transcripts to generate AI-suggested tasks.

---

## Data Flow

```
Granola (call recordings)
    ↓  [GRANOLA_REFRESH_TOKEN]
fetchGranolaDocs()  [src/lib/agents/granola.ts]
    ↓
matchMeetingToAccount()  [src/lib/agents/matching.ts]
    ↓
Supabase: notes table  (call logs visible in app)
    ↓  [Inngest event: note saved]
extractNoteInsights()  [src/inngest/functions/extractNoteInsights.ts]
    ↓  [ANTHROPIC_API_KEY]
Claude reads transcript → extracts action items
    ↓
Supabase: pending_tasks table  (appears in Pending Review tab)
```

---

## Triggers

| Trigger | When |
|---------|------|
| Automatic | Daily at 2:00am UTC (Inngest cron) |
| Manual | Admin goes to Settings → Sync → "Sync Now" button |
| API | `POST /api/calls/sync` (admin role required) |

---

## The GRANOLA_REFRESH_TOKEN

**Critical:** This token is tied to a specific Granola account. The sync pulls transcripts from that account's meeting recordings.

### Current state:
- The token is set to Shrikant's Granola account
- All Granola recordings Shrikant is part of get synced

### Rotating the token (when needed):

The token doesn't expire by itself, but if the Granola account is logged out or changes credentials, you need a new one.

```bash
# On a Mac with Granola installed and signed in:
bash scripts/get-granola-token.sh

# Output looks like:
# GRANOLA_REFRESH_TOKEN=eyJ...long_token...
```

Then update `GRANOLA_REFRESH_TOKEN` in:
- Vercel dashboard → Project → Settings → Environment Variables
- Your local `.env.local` (if running locally)

### Does it work for non-US accounts?
The sync was built and tested on US-region Granola accounts. Non-US accounts have not been explicitly tested — this is a Week 1 item to verify for ROW accounts.

---

## What the sync does

1. **Fetches** all recent Granola documents since the last sync
2. **Matches** each meeting to an account by comparing attendee email domains against the account list
3. **Creates** a `note` (call log) record in Supabase if one doesn't already exist for that meeting
4. **Triggers** an Inngest event for each new note — Claude processes it in the background
5. **Creates** `pending_tasks` entries for action items Claude finds

---

## Monitoring syncs

In the app:
- Go to **Settings** (admin only) → **Sync Logs** to see all sync runs, their status, and any errors
- Failed syncs show error details per account

In Inngest dashboard:
- https://app.inngest.com → Functions → `sync-calls`
- See execution history, retries, and error traces

---

## Account Matching Logic

The matching function (`src/lib/agents/matching.ts`) works by:
1. Taking the meeting attendee email domains (e.g. `acme.com`)
2. Looking up accounts in Supabase where `email_domain` matches
3. If no domain match, tries fuzzy matching on company name vs account name

**If a meeting doesn't match any account:**
- It still gets saved as an unmatched note
- Visible in the "Unassigned Calls" section for manual linking

---

## ROW / Non-US Considerations

The checklist specifically flags this as a handover risk. Before Week 1 of the build:
- Test the sync with a non-US Granola account
- Verify timezone handling (cron runs at 2am UTC — check what that means in each region)
- Verify that Granola returns transcripts for non-US meetings
