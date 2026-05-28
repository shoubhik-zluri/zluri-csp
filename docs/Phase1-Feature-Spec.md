# Zluri CSP — Phase 1 Feature Specification
**Document type:** Feature Specification for CTO Approval
**Version:** 1.0
**Date:** 2026-03-26
**Status:** Submitted for approval
**Author:** CS Platform Team
**Companion documents:** PRD-v1.md, TAD-v1.md

---

## EXECUTIVE SUMMARY

Phase 1 delivers the features that close the gap between the current working MVP (account management, basic task tracking, CSV import, Granola sync) and a platform the CS team can rely on as their primary tool. It is scoped to seven feature areas, each derived from the PRD Must Have list, and sequenced to address technical debt first, then build features in a dependency-respecting order.

**Scope:** Internal tool. 8–10 CSMs, 8–10 CSEs, 2–3 CS Leads, 5–10 AE viewers.
**Stack:** Next.js 14+ (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Vercel · Anthropic Claude API
**Total estimated build effort:** 10–13 engineering weeks (1 senior full-stack engineer)
**Target completion:** End of Q2 2026

---

## PHASE 1 FEATURES AT A GLANCE

| # | Feature | Effort | Priority driver |
| --- | --- | --- | --- |
| 0 | Pre-build: Technical debt clearance | 1 week | Unblocks all other features |
| 1 | Account Management — MVP gap closure | 1 week | Daily usability blocker |
| 2 | Dashboard Redesign — Work Queue Model | 1 week | Primary daily-use screen |
| 3 | AI Output Pipeline — Close the Loop | 1.5 weeks | Core differentiator, already half-built |
| 4 | Per-CSM Integration Settings | 1 week | Required for AI pipeline + email triggers |
| 5 | Project Tracker (Implementation Module) | 3 weeks | Highest complexity; new data model |
| 6 | Document Templates and Generation | 2 weeks | AI-heavy, requires Claude integration |
| 7 | Email Triggers — Gmail Draft Creation | 1 week | Requires Gmail OAuth, depends on Feature 4 |

**Total: 10.5 weeks core. Recommended buffer: 2 weeks. Timeline to production: 13 weeks.**

---

## FEATURE 0: PRE-BUILD TECHNICAL DEBT CLEARANCE

### Why this comes first
The current codebase has six known technical issues that will compound build complexity for every subsequent feature. These must be resolved before new code is written on top of them.

### Specification

**TD-01 — Input validation (all write routes)**
- Add Zod validation schemas to every API route handler that accepts a request body (`POST`, `PATCH`, `PUT`, `DELETE` where applicable)
- Schema includes: explicit field allowlists (no pass-through of unvalidated keys), type coercion, required vs optional field declarations
- Applies to: accounts, contacts, tasks, notes, success plans, import
- On validation failure: return structured `400` with per-field error detail
- Test: write one integration test per schema that confirms rejection of invalid payloads

**TD-02 — ****`lifecycle_stage`**** column type migration**
- Current: `TEXT CHECK (IN ('adoption', ...))` — single value, wrong constraint type
- Target: `TEXT[]` — array column, supports multi-stage accounts
- Migration steps: (1) add new column `lifecycle_stage_v2 TEXT[]`, (2) backfill from existing column, (3) rename, (4) drop old column, (5) update all query paths and TypeScript types
- Risk: this is a live Supabase project. Migration must run in a transaction with a rollback plan.

**TD-03 — JWT role claim (remove per-request DB lookup)**
- Current: role is fetched from `profiles` table on every request (N DB calls per session)
- Target: role stored as a custom claim in the Supabase JWT token, populated by a `auth.users` trigger
- Implementation: Supabase DB hook function on `auth.users` that sets `raw_app_meta_data.role` on login; Supabase JWT configuration to include this claim
- Middleware reads `session.user.app_metadata.role` — no DB call required
- Impact: ~30–60ms latency reduction per request, eliminates single point of failure on role enforcement

**TD-04 — async Granola sync pattern**
- Current: Granola sync is a synchronous operation that can time out on large datasets
- Target: sync writes to a `sync_jobs` table, a Vercel Cron function processes the queue
- New table: `sync_jobs (id, type, user_id, status, created_at, started_at, completed_at, error)`
- Cron runs every 15 minutes, picks up pending jobs, updates status
- UI: "Sync Now" button triggers a job creation, shows job status (pending/running/done/error) in the Integrations settings page

**TD-05 — CSV import server-side hardening**
- Add 5,000-row hard cap server-side (current validation is client-side only)
- Chunk processing: 500 rows per batch with a progress counter returned as chunked response
- Import timeout: set explicit 30-second Vercel function timeout; surface partial completion on timeout
- Row-level error detail in `import_logs.errors JSONB` — currently only counts, not content

**TD-06 — Rate limiting on sensitive routes**
- Apply Vercel Edge middleware rate limiting to: `/api/import`, `/api/integrations/sync`, `/api/ai/*`
- Limits: import 10 requests/minute/user, sync 20/hour/user, AI 60/minute/user
- Return `429` with `Retry-After` header; surface friendly message in UI

### Build plan
1. Open a dedicated `tech-debt` branch
2. Implement TD-03 first (JWT) — affects auth middleware used by all subsequent features
3. Run TD-02 migration (lifecycle_stage) on staging, confirm, run on production
4. Implement TD-01 (Zod schemas) — creates a reusable validation library that Phase 1 routes extend
5. Implement TD-04 (async sync) in parallel with TD-05/TD-06
6. All six items covered by tests before merge to main

**Acceptance criteria:** All write routes return `400` with field-level errors on invalid input. Role claim is in JWT. `lifecycle_stage` is `TEXT[]` in production. Granola sync does not block the HTTP thread.

---

## FEATURE 1: ACCOUNT MANAGEMENT — MVP GAP CLOSURE

### Problem being solved
The accounts list has no search. Filter controls are placed in the page header (spatially disconnected from the table). The account overview panel has usability issues: health score save-on-blur loses precision, lifecycle stage uses a broken Select component, renewal stage has no progression history. Notes cannot be edited. The success plan creation UX is hidden behind an empty state with no clear affordance.

### Specification

#### 1a — Accounts list: text search
- Search input placed above the top-left edge of the accounts table, visually adjacent to the table (not in the page topbar)
- Client-side filtering: filters by account name (case-insensitive prefix and substring match) and CSM full name
- Live filter: updates as user types, no submit required
- Count indicator: "12 of 37 accounts" updates in real-time as filters change
- Search state is URL-persisted (`?q=arctic`) so the URL is shareable and browser back works

#### 1b — Accounts list: inline filter bar
- Move all filter controls from the page topbar into an inline filter bar directly above the table
- Filters available:
  - **CSM** — multi-select dropdown, shows all CSMs in the system
  - **Sentiment / Pulse** — multi-select: Good, Some Risk, High Risk
  - **Health band** — range filter: 0–40, 41–70, 71–100
  - **Renewal window** — select: 30 days, 60 days, 90 days, Overdue
  - **Lifecycle Stage** — multi-select: Pre-Kickoff, Implementation, Go-Live, Adoption, Steady State, At Risk
  - **Implementation Status** — select: Not Started, In Progress, On Track, At Risk, Delayed, Completed
- Filter bar shows active filter count badge: "3 filters active"
- Clear all filters button appears when any filter is active
- Filter state is URL-persisted

#### 1c — Account overview panel: health score inline edit
- Current save-on-blur behavior removed. Replace with:
  - Value displayed as static text with a pencil icon appearing on hover
  - Click pencil → transforms to a number input, with explicit checkmark (save) and X (cancel) buttons
  - Keyboard: Enter to save, Escape to cancel
  - Optimistic update on save; revert with error toast if API call fails

#### 1d — Account overview panel: lifecycle stage chip component
- Replace the current Select-based lifecycle stage with a dedicated multi-chip component
- Chips: each active stage shown as a removable chip (× to remove)
- "+ Add stage" opens a popover with the full list of available stages; selecting one adds a chip
- Multiple chips allowed simultaneously (e.g., "Adoption + At Risk")
- Saves immediately on chip add/remove (individual PATCH calls, not a form)

#### 1e — Account overview panel: renewal stage progression
- Replace static dropdown with a visual stage-progression component (horizontal step track)
- Stages in order: Discovery → Intent Confirmed → Commercial Agreed → Renewal Sent → Renewed / Churned
- Current stage is highlighted; clicking any stage advances (or reverts) to that stage
- Stage change is timestamped and appended to an `account_stage_history` array stored in `accounts.metadata JSONB` (no new table required)
- History tooltip: hover over current stage badge → shows "Set to X on [date] by [CSM]"

#### 1f — Notes: edit and delete
- "Edit" button on each note card opens the existing `AddNoteDialog` pre-filled with note content
- On save: PATCH `/api/accounts/[id]/notes/[noteId]`
- Delete: clicking delete does not show a `confirm()` dialog. Instead:
  - Note is removed from UI immediately (optimistic)
  - Sonner toast appears: "Note deleted — Undo" with 5-second window
  - On undo: re-inserts note at original position; PATCH `/api/accounts/[id]/notes/[noteId]` with `deleted: false`
  - On timeout: DELETE `/api/accounts/[id]/notes/[noteId]` executes server-side

#### 1g — Success plan: creation UX
- Empty state in the Tasks tab redesigned to explain the two-level structure: "Success Plans group related tasks. Create a plan first, then add tasks to it."
- "Create your first Success Plan" CTA button visible in the empty state
- "New Success Plan" button always visible in the Tasks tab header (not hidden when plans exist)
- Create plan form fields: name (required), description (optional), owner (defaults to current CSM), due date
- Plan created → immediately visible in the tab; user prompted to add first task inline

### Technical approach
- All account overview panel changes are React client components with optimistic updates via SWR `mutate`
- Inline filter bar state managed in a single `useAccountFilters` hook; serialized to URL query params via `nuqs` (already used in the stack)
- Chip component is new; built with shadcn/ui Popover as the base — no new library dependency
- Renewal stage history stored in `accounts.metadata JSONB` to avoid a migration — reviewed at Phase 2 for promotion to a dedicated table

### API routes affected
- `PATCH /api/accounts/[id]` — update health score, lifecycle stage, renewal stage (all existing)
- `PATCH /api/accounts/[id]/notes/[noteId]` — new: update note content, or set deleted flag
- `DELETE /api/accounts/[id]/notes/[noteId]` — existing; soft-delete pattern
- `POST /api/accounts/[id]/success-plans` — new: create a success plan

### Acceptance criteria
- Search filters accounts list in real-time with no page reload
- Filter state survives a browser refresh (URL persistence)
- Health score cannot be accidentally saved by clicking away
- Lifecycle stage supports multiple simultaneous values
- Renewal stage shows progression history on hover
- Deleting a note shows an undo toast; no `confirm()` dialog appears anywhere in the application
- Success plan CTA is visible even when no plans exist

**Estimated effort: 4–5 days**

---

## FEATURE 2: DASHBOARD REDESIGN — WORK QUEUE MODEL

### Problem being solved
The current dashboard is a status report. CSMs opening the app in the morning must scan multiple widgets to understand what they need to act on. The redesign makes the dashboard answer a single question: "What needs my attention right now?"

### Specification

#### 2a — Layout restructuring by role
**CSM/Member view (default):**
- Primary area: "Today's Focus" — three columns: Overdue & Urgent | Due This Week | Upcoming in 14 Days
- Secondary strip (below): AI-surfaced signals (see 2e)
- Tertiary (collapsed by default, expandable): Renewals, High Risk, Recent activity
- Portfolio stat cards (My Accounts, My ARR, Avg Health) moved to a collapsible header strip — visible but not dominant

**CS Lead/Admin view:**
- Portfolio stat cards remain as primary content (team-wide metrics)
- "Today's Focus" becomes "Team Focus" — shows overdue tasks across all CSMs
- Addition: portfolio health chart (health score distribution across all accounts)

#### 2b — MyTasksWidget redesign
- Hard cap of 5 items visible by default; "View all X tasks →" link to `/accounts?filter=my-tasks`
- Visual treatment by urgency:
  - **Overdue**: red `#ef4444` left border, red due date text, grouped at top under "Overdue" heading
  - **Due today**: amber `#f59e0b` left border, "Today" label
  - **Due this week**: standard card, date shown as "Thu Apr 2"
- "+ New Task" button inline on the widget. On click: modal opens — title input, then "Which account?" dropdown. Task created, added to list immediately.
- Task cards show: title, account name (clickable → navigates to account), due date, owner avatar

#### 2c — RenewalsWidget updates
- Each renewal row now shows: account name, sentiment badge (Good/Some Risk/High Risk), days remaining (e.g., "In 12 days"), ARR
- Days remaining shown in colour: red if ≤ 14 days, amber if ≤ 30 days, default if > 30 days
- Click on any row → navigate to account Overview tab (not the account list)

#### 2d — HighRiskWidget updates
- Each at-risk row now shows: account name, sentiment badge, ARR, "Last activity X days ago" (computed from `meeting_notes.meeting_date` MAX per account)
- "Last activity" shown in red if > 14 days
- "View all X at-risk accounts →" link visible whenever the list is truncated (cap: 5)

#### 2e — AI-surfaced signals strip (new)
- Horizontal strip of signal cards above the main widgets
- Shows 3–5 auto-generated signals, each a short plain-English sentence with a click-through to the relevant account
- Example signals:
  - "Arctic Wolf: 2 action items from yesterday's Granola sync not yet converted to tasks"
  - "Santos Brasil: Renewal in 28 days — no outreach logged in 3 weeks"
  - "Biote Medical: High risk signal added 6 days ago — no follow-up task created"
- Signals are computed server-side by a daily background job (cron) that runs a set of parameterized queries against the DB
- Signals stored in a new `dashboard_signals` table: `(id, user_id, account_id, signal_text, signal_type, account_url, computed_at, dismissed_at)`
- "Dismiss" button on each card → sets `dismissed_at`, card disappears
- No Claude API call required for signal generation — signals are template strings populated with DB-queried values (Claude is reserved for the Phase 2 global command interface)

### Technical approach
- Layout uses CSS Grid; role-based column configuration comes from a `useRole()` hook
- Widget data fetched via server-side data in the layout's RSC (`page.tsx`), passed to client widgets as props — no client-side fetching for dashboard initial load
- Signal computation: Vercel Cron job at 06:00 UTC daily, running 6 parameterized signal queries, writing results to `dashboard_signals`; `user_id` is the signal target (signals are per-CSM, not global)
- `dashboard_signals` is cleared and recomputed nightly; dismissed signals are excluded from the next day's computation

### New table
```sql
dashboard_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  account_id UUID REFERENCES accounts(id),
  signal_type TEXT, -- e.g. 'unprocessed_action_items', 'stale_outreach', 'unresolved_risk'
  signal_text TEXT,
  account_url TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  dismissed_at TIMESTAMPTZ
)
```

### API routes
- `GET /api/dashboard/signals` — returns signals for current user (filters dismissed)
- `PATCH /api/dashboard/signals/[id]/dismiss` — sets dismissed_at

### Acceptance criteria
- Dashboard loads in < 500ms (initial page paint via RSC)
- CSM opening the app at 09:00 sees their overdue tasks, due-this-week tasks, and at least one AI signal without any filter action
- CS Lead view shows team-wide metrics, not just their own tasks
- Signals compute overnight and are present when the user arrives in the morning
- Dismissing a signal removes it without page reload

**Estimated effort: 4–5 days**

---

## FEATURE 3: AI OUTPUT PIPELINE — CLOSE THE LOOP

### Problem being solved
The Granola sync pipeline exists and pulls meeting notes. However, the AI extraction output (action items, risk signals, sentiment) is stored in JSONB blobs and never surfaced in a way that drives action. CSMs must re-read notes and manually create tasks from action items. This feature routes AI extraction output into structured database rows and surfaces them as confirmable suggestions.

### Specification

#### 3a — Extraction pipeline (triggered on Granola sync)
When a Granola meeting note is synced (or a manual note is saved with content), a background job runs the following extraction pass using Claude (`claude-haiku-4-5` for speed):

1. **Action items extraction** → structured list of `{text, owner_hint, due_date_hint}` objects
2. **Risk signal extraction** → list of `{signal_text, severity_hint}` objects
3. **Sentiment classification** → one of: `positive`, `neutral`, `negative`
4. **Summary generation** → 2–3 sentence plain-language summary of the meeting

The extraction prompt is a structured JSON-output prompt, not a free-form generation. Output is parsed and validated with Zod before any writes occur.

#### 3b — Proposed tasks
- Each extracted action item is written to the `tasks` table with:
  - `source = 'ai'`
  - `status = 'proposed'` (a new status value — does not appear in main task views without explicit filter)
  - `account_id` from the note
  - `due_date` if the date hint was parseable (ISO format)
  - `title` = the action item text
  - `owner_id` = current CSM (best effort — AI hint is used to surface the right owner in the UI, but not to auto-assign)
- Proposed tasks are NOT visible in the main Tasks tab task list until accepted
- They appear in a dedicated "AI Suggestions" tray within the Tasks tab (collapsible, shows count badge)

#### 3c — Proposed risk signals
- Each extracted risk signal is written to a new `proposed_risk_signals` table:
```sql
  proposed_risk_signals (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    note_id UUID REFERENCES meeting_notes(id),
    signal_text TEXT,
    severity_hint TEXT, -- 'high_risk', 'some_risk'
    status TEXT DEFAULT 'pending', -- pending / accepted / dismissed
    created_at TIMESTAMPTZ DEFAULT now()
  )
```
- Proposed signals appear on the Account Overview tab, below the existing risk signals section, with a dashed purple border and "AI Suggested" label
- Accept → appends to `accounts.risk_signals TEXT[]`; marks `status = 'accepted'` in proposed table
- Dismiss → marks `status = 'dismissed'`; card disappears

#### 3d — Sentiment suggestions
- After extraction, `meeting_notes.sentiment_hint` is updated to one of `positive`, `neutral`, `negative`
- `meeting_notes.sentiment_confirmed = false` until CSM explicitly accepts or overrides
- On the Account Overview tab, next to the CSM Pulse buttons, a small inline suggestion appears: "AI suggested: [Positive] from Mar 24 meeting — [Accept] [Dismiss]"
- Accept → creates an entry in `sentiment_history (account_id, date, value, source, confirmed_by)` — a new table
- This history powers the sentiment trend sparkline (Feature 3f)

#### 3e — AI summary on note cards
- Each note card in the Notes tab shows an "AI Summary" section at the top (collapsible, collapsed by default)
- Summary text comes from `meeting_notes.ai_summary` (new column)
- Action items extracted from this note are listed below the summary: "Action items: Book Q2 QBR · Follow up on SSO IT approval"
- Granola-sourced notes show summary; manually-added notes without content do not

#### 3f — Sentiment trend sparkline
- Sentiment history (once populated by 3d) displayed as a mini bar chart on Account Overview
- 6–10 most recent meetings shown as bars; bar height and colour encode sentiment (green = positive, amber = neutral, red = negative)
- No external charting library — rendered as inline CSS flexbox bars (consistent with mockup approach)
- Data fetched from `sentiment_history` table, ordered by `date DESC`, limit 10

#### 3g — No silent writes policy
- No AI suggestion is written to a user-visible field without going through the proposed → accepted flow
- Exception: `meeting_notes.ai_summary` and `meeting_notes.sentiment_hint` are set silently on sync (they are informational, not action-driving)
- All task creations, risk signal additions, and sentiment confirmations require explicit CSM action

### Technical approach
- Extraction is triggered as a background job (sync_jobs queue from TD-04) — not synchronous with the Granola API call
- Claude call: server-side only, via Anthropic SDK in a Vercel Cron/Edge Function
- Model: `claude-haiku-4-5-20251001` (low latency, low cost; extraction is structured, not creative)
- Token budget: 4K input (meeting transcript) + 1K output (JSON extraction result)
- Extraction prompt: outputs strict JSON validated by Zod schema before any DB write
- If extraction fails: note is still saved; `action_items_processed = false` remains; job retries once after 10 minutes; on second failure, CSM sees "AI extraction failed — [Retry]" on the note card

### New/modified DB objects
- New table: `proposed_risk_signals` (above)
- New table: `sentiment_history (id, account_id, note_id, date, value, source, confirmed_by, created_at)`
- New columns on `meeting_notes`: `ai_summary TEXT`, `sentiment_hint TEXT`, `sentiment_confirmed BOOLEAN`, `action_items_processed BOOLEAN`
- New status value on `tasks.status`: `'proposed'` (add to CHECK constraint or move to unconstrained TEXT)

### API routes
- `POST /api/integrations/granola/process-note/[noteId]` — internal; triggers extraction job
- `PATCH /api/accounts/[id]/proposed-tasks/[taskId]/accept` — creates real task from proposed
- `PATCH /api/accounts/[id]/proposed-tasks/[taskId]/dismiss` — marks proposed task dismissed
- `PATCH /api/accounts/[id]/proposed-risk-signals/[id]/accept` — accepts, adds to risk_signals
- `PATCH /api/accounts/[id]/proposed-risk-signals/[id]/dismiss`
- `PATCH /api/accounts/[id]/sentiment-suggestion/[noteId]/accept` — confirms sentiment hint

### Acceptance criteria
- After a Granola sync, any meeting note with 3+ sentences produces an AI summary, action items, and sentiment hint within 60 seconds
- Proposed tasks do not appear in the standard task list — only in the "AI Suggestions" tray
- Accepting a proposed task creates a real task with correct account and due date
- Dismissing a proposed signal removes it from the UI permanently
- Sentiment sparkline renders correctly after 3+ accepted sentiment entries
- No Claude API call is made synchronously on page load

**Estimated effort: 7–8 days**

---

## FEATURE 4: PER-CSM INTEGRATION SETTINGS

### Problem being solved
Currently, integrations (Granola) are managed at the system level by an admin. The CSM has no self-service integration management. Gmail integration does not exist. Phase 1 requires each CSM to connect their own Granola and Gmail accounts. Slack connection is included in the UI but backend activation is Phase 2.

### Specification

#### 4a — New route: `/settings/integrations`
Accessible to all authenticated users (not admin-only). The page shows each integration the CSM can manage independently.

#### 4b — Granola integration
- **Connect**: "Connect Granola" button → prompts for API key (if Granola does not support OAuth, a documentation link is shown on how to find the key; if Granola OAuth is confirmed available, OAuth flow is used instead — see PRD Open Question #6)
- API key stored encrypted in `csm_integrations.granola_credentials` via Supabase Vault (`pgsodium.create_key()`)
- **Connected state**: shows green dot, "Last synced: [timestamp]", "Sync Now" button, auto-sync toggle, sync frequency selector (Daily / Twice daily / Manual only)
- **Disconnect**: confirmation modal → clears credentials from Vault, sets `granola_connected = false`
- **Connection test**: "Test Connection" button → calls Granola API with the key, shows success or error message inline

#### 4c — Gmail integration
- **Connect**: "Connect Gmail" button → initiates Google OAuth 2.0 flow
  - Scopes requested: `gmail.compose` only (create drafts — no inbox read access)
  - Redirect URI: `/auth/google/callback?integration=gmail`
  - Callback handler: exchanges code for tokens, stores refresh token encrypted in `csm_integrations.gmail_credentials` via Supabase Vault
- **Connected state**: shows green dot, connected email address, "Compose scope only" badge, "Disconnect" option
- **Disconnect**: revokes Google OAuth token via Google API, clears from Vault, sets `gmail_connected = false`
- **Scope disclaimer**: on the connect dialog, explicit text: "We will only be able to create drafts in your Gmail. We cannot read your emails or send on your behalf."

#### 4d — Slack integration (UI only, Phase 1)
- Slack integration card shown in the UI with "Connect Slack" button
- On click: explains what the integration will do (monitor channels for signals) and shows "Coming soon — notify me" option
- No OAuth flow implemented in Phase 1; card is non-functional but educates CSMs about the upcoming feature
- Backend implementation is Phase 2

#### 4e — Admin oversight at `/admin/integrations`
- Admin can see a table of all CSMs and their integration status (connected / not connected / error) per integration type
- "Force disconnect" action: admin can revoke any CSM's integration (calls same disconnect flow as CSM self-service)
- "Required integration" toggle: admin can mark an integration as required for a role — CSMs with that role see an alert banner if not connected

### Technical approach
- `csm_integrations` table (already in TAD schema) stores per-user integration state
- Credential encryption: all OAuth tokens and API keys stored via Supabase Vault (`pgsodium`) — never stored in plaintext in the DB
- Gmail OAuth: standard Authorization Code flow + PKCE; handled entirely server-side in Next.js route handlers
- Token refresh: Gmail access tokens expire in 1 hour; refresh token stored in Vault; route handler checks expiry before each Gmail API call and refreshes transparently
- Granola API key: does not expire; test-on-connect pattern to validate before storing

### DB objects
- `csm_integrations` table as specified in TAD (one row per user, created on first settings page visit)
- `integration_status` computed view for admin dashboard (joins `profiles` + `csm_integrations`)

### API routes
- `GET /api/settings/integrations` — returns current user's integration status
- `POST /api/settings/integrations/granola/connect` — stores API key, tests connection
- `DELETE /api/settings/integrations/granola/disconnect` — clears credentials
- `POST /api/settings/integrations/granola/sync-now` — enqueues a sync job (TD-04)
- `PATCH /api/settings/integrations/granola/preferences` — update sync frequency, auto-sync toggle
- `GET /api/auth/google/callback` — OAuth callback handler (creates/updates Gmail credentials)
- `DELETE /api/settings/integrations/gmail/disconnect` — revokes token, clears credentials
- `GET /api/admin/integrations` — admin: all users' integration status (admin-only)
- `DELETE /api/admin/integrations/[userId]/[type]` — admin force disconnect

### Acceptance criteria
- A CSM can connect their Granola API key without admin involvement
- A CSM can connect their Gmail account via OAuth with `gmail.compose` scope
- The connected Gmail account shows the user's email address to confirm it is the right account
- A CSM can disconnect either integration at any time
- Admin can see the integration status of every CSM in one view
- No credentials are stored in plaintext in any table
- A CSM whose Gmail is disconnected cannot trigger email drafts (Feature 7) — they see a "Connect Gmail first" prompt

**Estimated effort: 5 days**

---

## FEATURE 5: PROJECT TRACKER — IMPLEMENTATION MODULE

### Problem being solved
Implementation projects are currently managed via a combination of email threads, ad-hoc spreadsheets, and tasks in the CSP that have no phase/milestone structure. There is no client-facing view of project progress. CSMs and CSEs have no shared structured workspace for managing a go-live.

### Specification

#### 5a — Data model
Four new tables:

**`projects`** — top-level project linked to one account
```
id, account_id, name, description, status, csm_id, cse_id,
ae_name, ae_email, start_date, target_go_live_date,
actual_go_live_date, public_token (UUID), public_sharing_enabled,
created_at, updated_at
```

**`project_phases`** — ordered phases within a project (e.g., Discovery, Configuration, UAT, Go-Live)
```
id, project_id, name, order_index, status, start_date,
end_date, actual_end_date
```

**`project_milestones`** — deliverables within a phase
```
id, phase_id, name, description, owner_id, owner_type
(internal/customer/partner), due_date, completed_date,
status, client_visible
```

**`tasks`** (existing table, extended) — task is linked to a milestone
```
+ project_milestone_id (nullable FK to project_milestones)
+ client_visible BOOLEAN
```

#### 5b — Project creation wizard
Two entry points: "+ New Project" on the Account's Projects tab, or from the global `/projects` page.

**Step 1 — Basics:** Project name, account (pre-selected if entering from account page), description (optional)
**Step 2 — Team:** Assign CSM (defaults to current user), CSE (dropdown from users with CSE role), AE name + email (free text — AE may not have a CSP account)
**Step 3 — Timeline:** Start date, target go-live date
**Step 4 — Template:** Choose from:
  - **Standard Implementation** — 4 phases pre-populated (Discovery, Configuration & Integration, UAT & Testing, Go-Live), with standard milestones from the Sales-to-CS process
  - **Enterprise Fast-Track** — compressed 6-week timeline variant
  - **Blank** — no phases pre-populated; user builds from scratch
**Step 5 — Review + Create**

On create: project is created with all phases/milestones from the selected template. Client-facing URL is auto-generated (`/p/{public_token}`). User is navigated to the project detail view.

#### 5c — Project detail view (`/projects/[id]`)

**Info strip:** Start date, target go-live, elapsed days, remaining days, overall % complete, AE, progress bar

**Gantt chart**
- Horizontal timeline (scrollable if needed), one row per phase or milestone
- Two bars per row: planned (lighter) and actual/current (solid) — visually shows schedule variance
- Bar colours:
  - Green: on track or completed
  - Amber: at risk (actual end date > planned end date by ≤ 2 weeks)
  - Red: delayed (actual end date > planned end date by > 2 weeks)
- "Today" marker: vertical line at current date
- Click on a bar → opens milestone detail panel (side drawer)
- Drag bar right edge to extend due date — PATCH to `project_milestones.due_date` on drag end

**Phase / milestone panel (side drawer)**
- Shows: milestone name, description, owner, due date (editable), status (editable dropdown), completion date, notes (free text)
- Status options: Not Started, In Progress, Completed, Blocked, Cancelled
- "Client visible" toggle — controls whether this milestone appears in the public client view
- "+ Add task" creates a task linked to this milestone

**Phase management**
- "+ Add Phase" button adds a new phase at the end
- "+ Add Milestone" within a phase
- Phases can be reordered (drag handle)

**Project status**
- Overall project status is computed from milestone statuses:
  - Any milestone Delayed → project is Delayed
  - Any milestone Blocked → project is At Risk
  - All milestones Completed → project is Completed
  - Otherwise → On Track
- CSM can override the computed status manually

#### 5d — Global projects list (`/projects`)
- Shows all projects visible to the current user (member: their CSM/CSE projects; admin: all)
- Card view (2 columns): project name, account name, progress bar, status badge, go-live date
- Filters: status (On Track, At Risk, Delayed, Completed), go-live window (this month, next month, overdue)
- Sort: go-live date (default), progress, account name

#### 5e — Account Projects tab
- Lists all projects for this account (typically 1–2)
- Project card shows: name, status badge, % progress, phase milestones as chip row (Done/Active/Upcoming), go-live date, client URL
- "Open Gantt →" button navigates to project detail
- "+ New Project" button opens creation wizard with account pre-filled

#### 5f — Client-shareable view (`/p/{public_token}`)
- No authentication required
- No Zluri branding beyond a minimal logo strip in the header
- Page shows:
  - Project name and account name (account data beyond name is not shown)
  - Overall status and % progress
  - Phase milestones where `client_visible = true` only — each shows name, status, planned date
  - "Last updated: [timestamp]" at the bottom
  - CSM contact name and email
- Cannot be edited from this URL
- Token is a UUID — not guessable; rate-limited (10 requests/minute from any single IP)
- Admin can disable public sharing globally (`/admin/settings` toggle)
- CSM can regenerate the token from project settings (invalidates old URL immediately)

#### 5g — AE access to project data
- AEs with `role = 'ae'` can view the projects page and project detail for accounts they are linked to (via `projects.ae_email` matching their login email)
- AEs cannot edit any project data
- AEs see the same internal view as CSMs (not the public client view) — this gives them milestone detail, task names, and status without external access

### Technical approach
- Gantt chart: built with CSS Grid + inline styles — no external charting library (keeps bundle size down; sufficient for the milestone density of CS implementation projects)
- Drag to adjust dates: browser native drag events + a `mouseup` PATCH call — no drag library dependency
- Public project route (`/p/[token]`) is a Next.js route in `src/app/p/[token]/page.tsx` — no `middleware.ts` auth enforcement for this route (it is explicitly opted out)
- Token lookup: `SELECT * FROM projects WHERE public_token = $1 AND public_sharing_enabled = true` — no auth context required
- Project progress %: computed server-side as `completed_milestones / total_milestones` per project; cached in `projects.progress_pct` (updated on milestone status change)

### RLS policies (new)
- `projects`: member sees rows where `csm_id = auth.uid()` OR `cse_id = auth.uid()`; admin sees all
- `project_phases`, `project_milestones`: inherit via project RLS (use security definer function for simplicity)
- Public route bypasses RLS using a service role client with a hardcoded project lookup

### API routes
```
POST   /api/projects                           Create project
GET    /api/projects                           List projects (role-scoped)
GET    /api/projects/[id]                      Project detail
PATCH  /api/projects/[id]                      Update project (status, dates, token regeneration)
POST   /api/projects/[id]/phases               Add phase
PATCH  /api/projects/[id]/phases/[phaseId]     Update phase
POST   /api/projects/[id]/phases/[phaseId]/milestones       Add milestone
PATCH  /api/projects/[id]/phases/[phaseId]/milestones/[id]  Update milestone
GET    /api/public/projects/[token]            Public project data (no auth)
GET    /api/accounts/[id]/projects             Account's project list
```

### Acceptance criteria
- A CSM can create a new project from scratch or from a template in under 3 minutes
- Gantt view renders correctly for a project with 4 phases and 12 milestones
- Dragging a milestone bar updates the due date and persists on refresh
- Client-facing URL shows only `client_visible = true` milestones
- An AE logging in can see project detail for their linked accounts but cannot edit anything
- Public URL is accessible without login
- Regenerating the public token invalidates the previous URL immediately (old URL returns 404)

**Estimated effort: 12–15 days**

---

## FEATURE 6: DOCUMENT TEMPLATES AND GENERATION

### Problem being solved
Document creation (Handover Docs, SOWs, MoMs, Weekly Updates) is done in Google Docs from scratch or from static Drive templates that require manual field-by-field completion. There is no connection between the account data in the CSP and the documents sent to customers. CSMs spend significant time per document on mechanical population.

### Specification

#### 6a — Document types supported (Phase 1)

| Document | Primary data source | Generation method |
| --- | --- | --- |
| Handover Document | Granola pre-sales transcripts + account data | Claude — full generation |
| Customer Intake Form | Account data + Granola notes + CSM input | Claude — partial pre-fill + form completion |
| Statement of Work (SOW) | Account data + project phases | Template engine + Claude draft |
| Implementation Plan | Project phases and milestones | Auto-generated from project tracker |
| Meeting Minutes (MoM) | Meeting notes content | Claude — structured extraction |
| Weekly Executive Update | Project status + Granola notes | Template + Claude draft |
| Phase Completion Report | Project phase + completed milestones | Claude — structured summary |
| Monthly Adoption Report | Account data + manual metrics | Template with manual fields |
| Go-Live Announcement | Account data | Fixed template |

#### 6b — "Generate Document" flow

**Entry points:** "Generate Document" button in the account topbar, in the account Documents tab, or in a project detail page.

**Step 1 — Select type:** Grid of document type cards (as in mockup). One selected (highlighted).

**Step 2 — Configure sources:** Checkbox list of AI data sources Claude will use:
- Last N Granola meeting notes (default: 3; configurable per document type)
- Project tracker phases and milestones (if project exists for account)
- Account health, risk signals, and contact list
- Previously generated documents of the same type (for continuity)

**Step 3 — Generation:** A loading state ("Claude is drafting your document — usually under 10 seconds"). Claude is called server-side with a structured prompt that includes:
- A document-type-specific system prompt (stored in `document_templates` table as a prompt template)
- The account context: name, ARR, CSM, contacts, health score, risk signals
- The Granola note content (truncated to fit token budget)
- The project milestone state (if applicable)

Claude returns the document as structured Markdown.

**Step 4 — Editor:** Document opens in a full-screen rich text editor (Tiptap, already in the stack — used for meeting notes). CSM can:
- Edit any part of the AI-generated content
- The editor toolbar: Bold, Italic, H1/H2, lists, tables (sufficient for CS documents)
- Highlighted sections where Claude has flagged uncertainty: "⚠ Review: [field] could not be auto-filled — complete manually"

**Step 5 — Save and export:**
- "Save to Account" → stores in `documents` table, linked to account (and project if applicable); status = 'draft'
- "Mark as Final" → status = 'final'
- "Export PDF" → server-side Puppeteer render of the document HTML, returns a downloadable PDF
- "Send via Email" → opens the email trigger modal (Feature 7) pre-populated with this document referenced in the body

#### 6c — Document storage and access

**`documents`**** table:**
```
id, account_id, project_id (nullable), type, title, content (Markdown),
status (draft/final/sent), generated_by, created_at, updated_at
```

**Account Documents tab (new tab on account detail):**
Two sections:
1. **Platform Documents** — documents generated in or saved to the CSP. Filterable by type and status. Actions: View (opens editor), Export PDF, Send, Delete.
2. **Google Drive Links** — manually pasted Drive links organised by category (Sales Materials, Technical Docs, Implementation Docs, Customer-shared, Other). No Drive API — paste link, add title, select category.

#### 6d — Document template management (admin)
- Each document type has a system prompt stored in a `document_prompt_templates` table (editable by admin)
- Admin can also set a Markdown "wrapper template" per document type — a skeleton structure Claude fills into
- CSMs cannot edit prompt templates; they can edit the generated output

#### 6e — Token budget and quality controls
Per document type:
| Document | Input token budget | Output token budget | Model |
| --- | --- | --- | --- |
| Handover Doc | 8K | 4K | claude-opus-4-6 |
| SOW | 4K | 6K | claude-opus-4-6 |
| MoM | 4K | 2K | claude-haiku-4-5 |
| Weekly Update | 4K | 2K | claude-haiku-4-5 |
| Phase Completion | 4K | 2K | claude-haiku-4-5 |
| Others | 3K | 2K | claude-haiku-4-5 |

Haiku is used for templated documents (lower creative requirement, higher frequency). Opus is used for documents that require synthesis across multiple source materials.

### Technical approach
- Tiptap editor: already in the stack for meeting notes; extend with additional toolbar options for document editing
- PDF export: Puppeteer running as a Vercel serverless function. The document HTML is rendered via a `@media print` stylesheet and captured. Puppeteer is packaged as a separate function to keep the main bundle size down.
- Prompt templates stored in DB, not in code — allows admin to tune prompts without a deployment
- Document content stored as Markdown in `documents.content` — rendered by Tiptap; Markdown is a stable format that is portable if the editor changes

### API routes
```
POST   /api/documents/generate              Trigger Claude generation
POST   /api/documents                       Save document
GET    /api/accounts/[id]/documents         List documents for account
GET    /api/documents/[id]                  Fetch document content
PATCH  /api/documents/[id]                  Update content, title, status
DELETE /api/documents/[id]                  Delete
GET    /api/documents/[id]/export-pdf       Generate and return PDF
POST   /api/accounts/[id]/drive-links       Add Drive link
DELETE /api/accounts/[id]/drive-links/[id]  Remove Drive link
GET    /api/admin/document-templates        List prompt templates (admin)
PATCH  /api/admin/document-templates/[id]   Update prompt template (admin)
```

### Acceptance criteria
- CSM can generate a Meeting Minutes document from a note in under 15 seconds
- Generated document contains meeting date, attendees, decisions, and action items extracted from the note
- CSM can edit the generated document before saving
- Saving a document stores it in the Documents tab of the linked account
- Exporting a document as PDF returns a downloadable PDF within 10 seconds
- "Handover Document" generation correctly uses pre-sales Granola notes (filtered by note tag or date range pre-deal-close)
- Drive links can be added without any Google OAuth

**Estimated effort: 8–10 days**

---

## FEATURE 7: EMAIL TRIGGERS — GMAIL DRAFT CREATION

### Problem being solved
Standard CS emails (weekly updates, meeting minutes, phase completions, go-live announcements) are written from scratch in Gmail each time. There is no connection between the information in the CSP (project status, meeting notes, account data) and the emails CSMs send. This feature creates a one-click path from CSP context to a Gmail draft pre-filled with AI-drafted content.

### Specification

#### 7a — Triggerable email types and entry points

| Email type | Entry point in CSP | Key auto-populated fields |
| --- | --- | --- |
| Deal Closure Notification | Account overview → actions menu | AE name, account name, ARR, go-live date |
| Exec Introduction | Account overview → actions menu | Customer exec contact, CS Lead, AE contact |
| Welcome Email | Project → Kickoff milestone → "Send" | Customer name, CSM name, project tracker URL |
| Weekly Executive Update | Project detail → "Send Weekly Update" | AI-drafted progress summary, blockers, next steps |
| Meeting Minutes (MoM) | Note card → "Send MoM" | Meeting date, attendees (from note), AI-extracted decisions and actions |
| Phase Completion | Project → phase complete → "Send Phase Update" | Phase name, completed milestones, timeline variance, next phase start |
| Go-Live Announcement | Project → Go-Live milestone → "Announce" | Account name, go-live date, KT materials links from Drive links |
| Monthly Adoption Report | Account overview → actions menu | Month/year, manual metric placeholders |

#### 7b — Compose modal
When an email trigger is clicked, a compose modal opens:

- **To**: pre-populated from account contacts (primary contact first) — editable
- **CC**: pre-populated from template defaults (e.g., CSM's CS Lead, AE) — editable. Admin-locked CC addresses are shown greyed out and cannot be removed.
- **Subject**: template subject with merged fields (e.g., "[Arctic Wolf] Weekly Update — Mar 26, 2026") — editable
- **Body**: AI-drafted using Claude (`claude-haiku-4-5`) based on the trigger type and data context — fully editable rich text area
- **Template selector**: dropdown to switch between email types if the user wants to change
- **"Regenerate"**: button to re-call Claude with the same context (for a different draft)

#### 7c — Draft creation
1. CSM clicks "Save as Draft"
2. Platform calls Gmail API via the CSM's stored OAuth credentials (from Feature 4)
3. Creates a draft in the CSM's Gmail using the `users.drafts.create` endpoint — `gmail.compose` scope
4. Returns the draft's Gmail ID
5. Platform stores the draft in `email_log` table:
  - `type`, `account_id`, `project_id` (if triggered from project context), `recipients JSONB`, `subject`, `gmail_draft_id`, `status = 'draft_created'`, `triggered_by`
6. Toast notification: "Draft saved to Gmail ✓ — [Open in Gmail →]" (the "Open in Gmail" link uses the draft's Gmail URL: `https://mail.google.com/mail/#drafts/{gmail_draft_id}`)

#### 7d — Auto-check lifecycle checklist
When certain email triggers are used, the corresponding lifecycle checklist item is auto-checked:
- Deal Closure email sent → `deal_closure_email_sent = true`
- Exec Introduction sent → `exec_intro_email_sent = true`
- Go-Live Announcement sent → `go_live_email_sent = true`
- Weekly Update sent → `weekly_updates_cadence_set = true` (on first use)

This reduces manual checklist maintenance.

#### 7e — Email template settings (`/settings/email-templates`)
- Each email type has an editable template (subject + body with merge field placeholders like `{{account_name}}`, `{{exec_name}}`, `{{current_date}}`)
- CSMs can edit subject and body within the constraints set by admin
- Admin-locked fields (e.g., required CC recipients, required footer) are shown with a lock icon and cannot be modified by CSMs
- Admin manages locked fields at `/admin/email-templates`

#### 7f — Error handling
- If Gmail API call fails (token expired, quota, etc.): toast error "Gmail draft failed — [Retry]"; try token refresh automatically before surfacing error to user
- If Gmail is not connected: "Connect Gmail first" prompt with a link to `/settings/integrations`
- Draft creation failure does not prevent the compose modal from being shown — the modal is always available; draft creation is the final step

### Technical approach
- Gmail API call: server-side in a Next.js route handler, never from the client
- OAuth token refresh: handled transparently by checking `access_token` expiry before the API call; refresh via the stored `refresh_token` in Supabase Vault; update the stored access token on success
- AI body generation: triggered when the modal opens; `claude-haiku-4-5` called server-side, result streamed into the compose modal textarea (streaming keeps the modal feeling responsive)
- Streaming: Next.js route handler using `ReadableStream`; client receives tokens as they arrive and appends to the textarea

### DB objects
- `email_log` table as specified in PRD/TAD
- `email_templates` table:
```sql
  id UUID PRIMARY KEY,
  type TEXT UNIQUE,  -- enum of email types
  subject_template TEXT,
  body_template TEXT,
  locked_cc JSONB,  -- admin-set required CC recipients
  locked_fields TEXT[],  -- field names CSMs cannot edit
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
```

### API routes
```
POST   /api/email/compose               Generate AI draft for compose modal
POST   /api/email/create-draft          Create Gmail draft via API
GET    /api/accounts/[id]/email-log     Email activity log for account
GET    /api/settings/email-templates    CSM's templates
PATCH  /api/settings/email-templates/[type]  Update template (CSM)
GET    /api/admin/email-templates       All templates with locked fields (admin)
PATCH  /api/admin/email-templates/[type]  Update locked fields (admin)
```

### Acceptance criteria
- CSM can trigger a "Weekly Executive Update" email draft from a project page in under 5 clicks
- The compose modal opens pre-filled with correct recipients, subject, and AI-drafted body within 3 seconds
- "Save as Draft" creates a real draft in the CSM's Gmail inbox (verified by opening Gmail)
- The draft is logged in the account's email activity
- The corresponding lifecycle checklist item is auto-checked on draft creation
- If Gmail is not connected, the CSM sees a clear prompt — not a broken modal
- Admin-locked CC addresses cannot be removed from the compose modal

**Estimated effort: 5 days**

---

## DELIVERY PLAN

### Build sequence and rationale
The sequence is dependency-ordered: technical debt first, then the features that unblock subsequent features.

```
Week 1      Feature 0 — Technical debt clearance
            (TD-03 JWT → TD-02 lifecycle_stage → TD-01 Zod → TD-04/05/06)

Week 2      Feature 1 — Account management gaps
            Feature 2 — Dashboard redesign (can run in parallel with Feature 1)

Week 3      Feature 4 — Per-CSM integration settings
            (required before Feature 7; Gmail OAuth can begin testing here)

Week 4–5    Feature 3 — AI output pipeline
            (requires Granola integration from Feature 4)

Week 6–8    Feature 5 — Project tracker
            (largest feature; 3 weeks)

Week 9–10   Feature 6 — Document generation
            (requires Feature 3 context data; requires Tiptap already in use)

Week 11     Feature 7 — Email triggers
            (requires Feature 4 Gmail OAuth; benefits from Feature 6 document context)

Week 12–13  QA, hardening, CSM onboarding, production deployment
```

### Milestones for CTO review

| Gate | Week | Criteria |
| --- | --- | --- |
| **Gate 1: Foundation** | End of Week 1 | All technical debt items merged. Zod validation live. lifecycle_stage migrated. JWT role claim active. |
| **Gate 2: Core UX** | End of Week 3 | Account list search + filters live. Dashboard work queue live. Integration settings page live with Granola connect. |
| **Gate 3: AI Loop** | End of Week 5 | Granola sync → proposed tasks + risk signals on account overview. Sentiment sparkline populated for at least 2 accounts. |
| **Gate 4: Project Tracker** | End of Week 8 | Create project, view Gantt, update milestones, public client URL working. 2 pilot CSMs using for real accounts. |
| **Gate 5: Documents + Email** | End of Week 11 | Generate 3 document types (MoM, Weekly Update, Handover). Email draft to Gmail working for all 8 trigger types. |
| **Gate 6: Production** | End of Week 13 | All CSMs onboarded. Import run from ChurnZero. Monitoring live. Phase 2 scope confirmed. |

---

## RESOURCE REQUIREMENTS

### Engineering
- **1 senior full-stack engineer** (Next.js, TypeScript, Supabase, Claude API) — 13 weeks
- No new hires required. If a second engineer is added, Features 5 and 6 can be parallelised in Weeks 6–10, compressing the timeline by 2–3 weeks.

### External APIs and services
| Service | Purpose | Cost model |
| --- | --- | --- |
| Anthropic Claude API | Document generation, AI extraction, email drafting | Pay-per-token. Estimated Phase 1 usage: ~$50–150/month at team scale (8–10 CSMs, daily use) |
| Google Gmail API | OAuth + draft creation | Free tier sufficient. Requires Google Cloud project and OAuth consent screen approval. |
| Granola API | Meeting transcript sync | Existing. Confirm API key vs OAuth support before Feature 4 build starts. |
| Vercel | Hosting, Cron | Existing. Cron functions available on Pro plan (already in use). |
| Supabase | DB, Auth, Vault | Existing. Vault (pgsodium) is available on Pro plan. |

### Pre-build blockers (must resolve before Week 1 starts)
1. **Granola API access model confirmed** — OAuth or API key? (PRD Open Question #6). Affects Feature 4 architecture.
2. **Google Cloud project created** — OAuth consent screen submitted for Gmail `gmail.compose` scope (Google review can take 3–7 days for unverified apps; plan accordingly).
3. **CS Lead sign-off on project template phases** — the standard implementation template (Discovery → Configuration → UAT → Go-Live) needs validation with 2–3 CSMs before building (PRD Open Question #4).
4. **Admin confirms locked email template fields** — which CC recipients are mandatory on which email types (PRD Open Question #3).

---

## RISKS AND MITIGATIONS

| Risk | Probability | Impact | Mitigation |
| --- | --- | --- | --- |
| Granola does not support OAuth; API key flow is more complex | Medium | Medium | Feature 4 can fall back to an API key model; design the settings page to handle both flows with a feature flag |
| Google OAuth consent screen review delayed | Medium | High | Submit immediately. Use unverified OAuth (limited to 100 users) for internal launch — sufficient for 8–10 CSMs. Submit verification in parallel. |
| Tiptap rich text editor introduces bundle size regression | Low | Low | Tiptap already in the stack for meeting notes. Document editor is an extension of existing implementation, not a new dependency. |
| Claude API latency spikes during document generation | Low | Medium | Implement streaming (already in plan). Add a 30-second timeout with a "Retry" option. Queue heavy document types as background jobs with completion notification. |
| `lifecycle_stage` migration causes downtime | Low | High | Run migration during off-hours (weekend). Test full rollback procedure on staging before running on production. Notify CS team. |
| Project tracker scope grows during build (Gantt complexity) | High | Medium | Gantt is CSS-only, no library. If drag-to-adjust dates adds > 2 days, ship without it in Phase 1 and add in Phase 2. Drag is a nice-to-have, not a blocker for usability. |

---

## OUT OF SCOPE FOR PHASE 1

The following are explicitly excluded from this specification:
- AI-powered global command interface (Cmd+K) — Phase 2
- Computed health score (formula-based) — Phase 2
- Slack signal monitoring — Phase 2
- Clari integration — Phase 3
- Gamma QBR deck generation — Phase 3
- Mobile layout optimisation
- Gmail inbox read access (Compose scope only, always)
- Automated email sending (drafts only — CSM sends manually)
- Automated Granola sync schedule (manual trigger and async job in Phase 1; scheduled cron in Phase 2)

---

## APPENDIX: OPEN QUESTIONS REQUIRING CTO / STAKEHOLDER INPUT

These questions were identified in the PRD and must be resolved before the relevant features are built. Some are blocking specific gates.

| # | Question | Blocking | Owner |
| --- | --- | --- | --- |
| Q1 | What columns does the Zluri product usage CSV export provide? Needed for the product adoption data import that powers the computed health score. | Phase 2 health score (not Phase 1) | Product team |
| Q2 | Which email template fields must be locked by admin? (e.g., "always CC cshead@zluri.com on deal closure emails") | Feature 7, Week 11 | CSops |
| Q3 | Does the standard 4-phase implementation template (Discovery → Config → UAT → Go-Live) match how CSMs actually run implementations? | Feature 5, Week 6 | CS Lead + 2–3 CSMs |
| Q4 | What information is Zluri comfortable sharing on the client-facing project tracker? (Task names, owner names, milestone dates) | Feature 5, Week 6 | CS Lead + Legal |
| Q5 | Does Granola support per-user OAuth, or is it API key only? | Feature 4, Week 3 | Engineering to confirm with Granola docs/support |
| Q6 | Health score formula weights (40/30/20/10 split) — CS Lead sign-off required before implementation | Phase 2 | CS Lead |
