# Zluri CS Platform — Handover Overview
**From:** Shrikant Iyer  
**To:** CSOPS Team  
**Repo:** https://github.com/shrikaant-zluri/zluri-csm  
**Handover checklist reference:** CS_Platform_Handover_Checklist.pdf (root folder)

---

## Checklist Status at Handover

| # | Item | Status |
|---|------|--------|
| 1 | GitHub repo — version history included | ✅ Done — see `01_PLATFORM_ACCESS.md` |
| 2 | CLAUDE.md in repo root | ✅ Exists — see `CLAUDE.md` and `AGENTS.md` |
| 3 | `.env.local.example` with all key names | ✅ Done — see `02_ENV_AND_CREDENTIALS.md` |
| 3 | Actual `.env` values via secure channel | ⚠️ Shrikant to send over Slack DM / 1Password |
| 4 | Local setup steps | ✅ Done — see `03_LOCAL_SETUP.md` |
| 4 | Deployment info | ✅ Done — see `01_PLATFORM_ACCESS.md` |
| 5 | Granola/call-sync integration | ✅ Done — see `04_GRANOLA_CALL_SYNC.md` |
| 5 | Zluri MCP (Claude ↔ platform) | ✅ Done — see `05_ZLURI_MCP.md` |
| 6 | Account CSV import | ✅ Done — see `06_ACCOUNT_DATA_IMPORT.md` |
| 7 | Things Shrikant knows not written down | ✅ Done — see `07_KNOWN_ISSUES_AND_DECISIONS.md` |

---

## Platform at a Glance

**What it is:** An internal CS operations platform for Zluri's Customer Success team. It sits alongside ChurnZero — not replacing it. It handles things ChurnZero can't: reading Granola meeting transcripts and turning them into tasks, tracking projects per account, and giving CSMs a unified daily work queue.

**Who uses it:** CSMs, CSEs, CS Lead/Ops, Admins. 8–15 users total.

**What's live today:**
- Accounts list with full data (ARR, renewal, health, CSM assignment)
- Tasks system with table/board views, dependencies, custom fields, saved views
- Notes/call logs synced from Granola (daily auto-sync at 2am + manual trigger)
- Projects per account with timeline view
- AI-suggested tasks from call transcripts (pending review queue)
- Zluri MCP server — lets CSMs use Claude Desktop to query/write platform data

**What's NOT live yet (deferred):**
- Salesforce sync (credentials exist, pipeline not built)
- Email drafting / document generation
- ChurnZero data pull
- Health score auto-computation (manual entry only today)

---

## The Handover is Complete When

- [ ] You can clone the repo fresh and it runs (`npm run dev`)
- [ ] CLAUDE.md is confirmed in the repo (it is — check it)
- [ ] You have all credentials in 1Password or equivalent
- [ ] You triggered the Granola sync manually and saw a call log appear
- [ ] You asked Shrikant all 5 questions in Section 7 of the checklist and wrote down the answers
- [ ] You know what Shrikant would do first if he were continuing the build

---

## Documents in This Folder

| File | Purpose |
|------|---------|
| `00_HANDOVER_OVERVIEW.md` | This file — master index |
| `01_PLATFORM_ACCESS.md` | GitHub, Supabase, Vercel, Inngest access transfer steps |
| `02_ENV_AND_CREDENTIALS.md` | All env vars, where to get each one |
| `03_LOCAL_SETUP.md` | Step-by-step: clone → running app |
| `04_GRANOLA_CALL_SYNC.md` | How the call sync pipeline works |
| `05_ZLURI_MCP.md` | How to set up the Zluri MCP for Claude Desktop |
| `06_ACCOUNT_DATA_IMPORT.md` | CSV format, column mapping, how to re-import |
| `07_KNOWN_ISSUES_AND_DECISIONS.md` | What's fragile, what was decided not to build |
