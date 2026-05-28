# What Shrikant Knows That Isn't Written Down

These are the answers to the 5 critical questions from Section 7 of the handover checklist. Shrikant should verify and expand on each of these during the handover call.

---

## 1. What's Broken or Fragile?

| Area | Issue | Severity |
|------|-------|---------|
| **Granola token** | `GRANOLA_REFRESH_TOKEN` is tied to Shrikant's personal Granola account. If he logs out of Granola, the nightly sync breaks silently. | High |
| **OAUTH_SIGNING_SECRET** | If this ever rotates, all CSM API keys (for Claude Desktop MCP) become invalid. No automated rotation or warning. | Medium |
| **Granola ROW accounts** | The call sync was built and tested on US accounts only. Non-US Granola accounts have not been tested. | Medium |
| **Account matching** | Meeting-to-account matching uses email domain and name fuzzy match. Accounts without `email_domain` set won't match — you get unlinked calls that need manual assignment. | Medium |
| **Inngest in local dev** | Background jobs (call sync, AI extraction) don't run locally unless you also run Inngest Dev Server. In practice, test these in production. | Low |
| **Sentry** | Sentry is stubbed (`sentry.*.config.ts` files exist but `@sentry/nextjs` is not installed). Error monitoring is not set up. | Low |
| **No CSM-level data isolation (RLS)** | The database has Row Level Security policies but they're primarily user-scoped, not team-scoped. One CSM can technically see another's private tasks if they know the API. | Low (internal tool) |

**Ask Shrikant:** "Are there any other things you know break under specific conditions that we haven't written down here?"

---

## 2. What Did You Decide Not to Build and Why?

| Feature | Decision | Reason |
|---------|---------|--------|
| **Salesforce sync** | Deferred to Phase 2 | Credentials exist (see Section 3 of checklist), pipeline not built. Re-opening this = significant scope. |
| **ChurnZero API sync** | Deferred to Phase 2 | ChurnZero API is complex, rate-limited, and the CSV import covers 90% of the need for now. |
| **Email drafting** | Deferred to Phase 3 | Needs Phase 1 (account data) and Phase 2 (health scores) to be trusted first. |
| **Client-facing portal** | Deferred to Phase 3 | External visibility = different auth model and data controls. Too early. |
| **Health score auto-compute** | Not built | Would require reliable product usage API. Manual entry is the interim. |
| **Project members junction table** | Deferred | Projects have an owner but no `project_members` table yet. Multi-member projects need a migration. |
| **Clari integration** | Not built | Clari Copilot is available as a Claude MCP in-session tool, but no persistent Clari→platform sync exists. |

---

## 3. What Are You Least Confident About?

- **The AI task extraction quality** — Claude extracts action items from transcripts, but the quality depends on transcript clarity. For short calls or calls with vague language, the suggestions can be off. The Pending Review queue is there specifically because auto-accept is risky.
- **Scale beyond 15 CSMs** — Everything works at the current team size. If the CS team grows significantly, the `tasks/all` endpoint (used for dependency search) loads all tasks into memory. That won't scale.
- **Granola reliability** — Granola is a relatively new tool. Its API (via the refresh token) is not officially documented. If Granola changes their auth model, the sync breaks.
- **CSM role assignment at import** — If someone's email in the CSV doesn't exactly match their platform profile, their accounts get imported as unassigned with no visible warning unless you look at the error report.

---

## 4. What Would You Do Differently If Starting Again?

*Ask Shrikant this directly on the call — his answer is more valuable than anything written here. The most common answers from builders in this position:*

- Whether to use Inngest vs Vercel Cron (simpler for simple jobs)
- Whether to use App Router vs Pages Router (the App Router async patterns have sharp edges in Next.js 16)
- Whether to build a proper design system earlier vs using inline Tailwind throughout

**Leave space for Shrikant to answer this one himself.**

---

## 5. If You Were Continuing Next Week, What Would You Do First?

*Ask Shrikant this last — his answer tells you the real state of the codebase.*

Probable answer (to verify):
1. **Test ROW accounts** — confirm Granola sync works for non-US calls before rolling out to the full team
2. **Set up Sentry** — add `@sentry/nextjs` properly so you have error visibility before Week 1
3. **Verify CSM-to-account mapping** — run the import with the full account CSV and confirm every CSM has their accounts correctly assigned
4. **MCP rollout** — help each CSM run `bash zluri-mcp/setup.sh` and confirm Claude Desktop is working

---

## Additional Context

### The codebase was built solo
One person (Shrikant) built the entire platform. This means:
- There's no code review history to learn from
- Some patterns were established early and repeated consistently — but may not be the "standard" approach
- Documentation in CLAUDE.md reflects hard-won lessons, not obvious best practices

### Claude Code was used heavily
The development process used Claude Code (AI-assisted coding) for most of the implementation. The `CLAUDE.md` and `AGENTS.md` files are specifically written for Claude Code to read at session start. When continuing development, always start a new Claude Code session from the repo root and Claude will pick up the context.

### Sprint structure
Development was done in sprints (1A through 5G). The current state is end of Sprint 5G. The plan file at `/Users/shrikaantiyer/.claude-team/plans/lucky-greeting-rocket.md` (on Shrikant's machine) contains the full feature plan — ask him to share it.
