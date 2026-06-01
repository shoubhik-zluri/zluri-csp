# CONTEXT.md — Zluri CSP Build State
> Updated: 2026-06-01 | Read this at the start of every Claude Code session alongside CLAUDE.md.

---

## Current Position

| Field | Value |
|-------|-------|
| **Active Bet** | Bet 1 — Project Tracker + Task Dashboard |
| **Current Week** | W1 — UAT Sprint (June 1–7) |
| **JTBD** | CSM can track projects internally and share a live view with customers |
| **Rule** | No new features this week. Document before fixing. |
| **Live URL** | https://zluri-csp-v1.vercel.app/ |
| **Repo** | https://github.com/shoubhik-zluri/zluri-csp |

---

## W1 Tasks Status

| # | Task | Status |
|---|------|--------|
| 1.1 | Install @sentry/nextjs | Skipped (deprioritised) |
| 1.2 | Task dashboard full UAT — write bug doc | Not started |
| 1.3 | Project tracker full UAT — write bug doc | Not started |
| 1.4 | E2E workflow UAT (Granola → pending tasks → accept → account) | Not started |
| 1.5 | Verify /p/ external link in incognito | Not started |
| 1.6 | Write bug triage doc (P1/P2/P3) | Not started |
| 1.7 | Fix P1 + P2 bugs only | Not started |

**W1 Gate (must pass before W2):** External link verified. Task visibility P1 fixed. Task dashboard P1+P2 clear. E2E workflow runs on 5+ accounts.

---

## Pre-Week Blockers — Status

| # | Item | Status |
|---|------|--------|
| P1 | .env values from Shrikant | ✅ Completed |
| P2 | Rotate GRANOLA_REFRESH_TOKEN | ⏸ On Hold — focusing on Clari instead of Granola |
| P3 | Clone repo, npm install, app loads at localhost:3000 | ✅ Completed |
| P4 | Transfer GitHub repo | ✅ Completed — now at shoubhik-zluri/zluri-csp |
| P5 | Transfer Supabase | ✅ Completed |
| P6 | Transfer Vercel + Inngest | ✅ Completed — new Vercel instance created |
| P7 | Create Zluri Anthropic org API key | 🔄 Ongoing — checking with Shrikant/Chaith |
| P8 | Get Shrikant's sprint plan file | Not started |

---

## Known Bugs (Confirmed Pre-UAT)

| Bug | Area | Severity | Source |
|-----|------|----------|--------|
| Internal tasks appear in external project options | Project Tracker | P1 | Shrikant call notes |
| /p/ external link — untested, likely broken | External view | P1 | Shrikant: "least confident about this" |
| client_visible toggle behaviour | Project Tracker | P2 | Build plan |
| E2E workflow only tested on 2 accounts (AWN + Santos) | Granola sync | P2 | Shrikant call notes |

---

## Open ADRs / Decisions

| Decision | Status | Notes |
|----------|--------|-------|
| MCP vs direct API rebuild | Deferred to W3 cooldown | Write ADR first, don't build |
| Granola token — per-CSM vs shared | Bet 2 W4 | P2 on hold; focusing on Clari |
| Buy vs build (vendor evaluation) | Deferred to W3 | Vendor calls in June |

---

## Architecture Reminders (critical for Claude Code)

- Middleware is `src/proxy.ts` — NOT `middleware.ts` (Next.js 16 breaking change)
- `params` in route handlers are Promises — always `await params`
- All API routes use `getAuthenticatedClient()` from `src/lib/api-auth.ts`
- `createAdminClient()` for Inngest/background jobs (no cookie store)
- `api_keys` table has NO `expires_at` column — don't select it
- Task sort order uses `sort_order FLOAT` with fractional indexing `(a+b)/2`
- Drag-and-drop: `@dnd-kit/core` + `@dnd-kit/sortable` (already installed)

---

## Key File Locations

| What | Where |
|------|-------|
| Auth middleware | `src/proxy.ts` |
| Auth helper | `src/lib/api-auth.ts` |
| Granola sync | `src/lib/agents/granola.ts` |
| Account matching | `src/lib/agents/matching.ts` |
| AI extraction | `src/inngest/functions/extractNoteInsights.ts` |
| MCP server | `zluri-mcp/` |
| DB migrations | `supabase/` |
| Scripts | `scripts/` (incl. `get-granola-token.sh`) |

---

## What Was Last Done

Handover completed from Shrikant Iyer. Repo cloned, infra transferred, app running on Vercel. No code changes made yet. W1 UAT sprint starts today (June 1).

---

## What To Do Next (Session Start Prompt)

