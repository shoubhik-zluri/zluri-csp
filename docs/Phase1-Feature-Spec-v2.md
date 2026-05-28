# Zluri CSP — Phase 1 Feature Specification
**Version:** 1.0
**Date:** 2026-03-26
**Status:** For CTO Review and Approval
**Owner:** Shrikant Iyer, CS Operations
**Phase:** 1 of 3 — ChurnZero Supplement + Account Intelligence
**Timeline:** 3–4 weeks
**Builder:** Shrikaant Iyer (primary), with engineering support on infrastructure setup

---

## How to read this document

Each feature is written in two layers. The first layer is plain language — what the feature is, why it matters to the CS team, and what a CSM will experience when they use it. The second layer is the technical detail — what gets built, how it connects, and what "done" looks like. If you're reviewing for business approval, the plain language sections are the relevant parts. The technical sections are there for engineering handoff and build reference.

---

## Phase 1 in plain language

Phase 1 turns the platform into something the CS team can actually use every day. It adds six things ChurnZero either cannot do or does poorly:

1. **Better account management** — search, filter, and edit account data without friction
2. **A dashboard that shows you what to do** — not what's happening, but what needs action right now
3. **A health score based on real signals** — not a number a CSM typed in last month
4. **AI that reads your Granola notes** — and surfaces the action items and risks so you don't have to re-enter them manually
5. **Self-serve integration settings** — each CSM connects their own Granola and Gmail without needing admin involvement
6. **The Sales-to-CS process as a checklist** — per account, with auto-ticking when actions are taken in the platform

By the end of Phase 1, a CSM can arrive in the morning, see a dashboard showing exactly what needs their attention, log a meeting note from yesterday's call, have action items automatically suggested as tasks, and understand their accounts' true health from real product data — not a guess.

---

## Timeline overview

```
Week 1
  Day 1–2    Foundation — auth, database schema, project scaffolding
  Day 3–4    Account list — search and filters
  Day 5      Account overview panel — inline editing, health score display

Week 2
  Day 6–7    Dashboard redesign — work queue layout and widgets
  Day 8–9    Computed health score — formula, CSV import for product data
  Day 10     Lifecycle checklist — per-account, auto-ticking logic

Week 3
  Day 11–12  Per-CSM integration settings — Granola connect, Gmail OAuth
  Day 13–15  AI meeting analysis pipeline — Granola sync → extraction → proposed tasks and signals

Week 4
  Day 16–17  Polish, edge cases, empty states, error handling
  Day 18–19  Data import from ChurnZero — seed real accounts
  Day 20     Production deployment, CSM onboarding
```

**Buffer:** 2 days built in (Phase 1 is day 1–20 of a 22-day window).

---

## Pre-build checklist

Before writing a single line of code, these need to be confirmed:

- [ ] Google Cloud project created, OAuth consent screen configured for Gmail (compose scope)
- [ ] CS Lead has confirmed the health score formula weights (40/30/20/10)
- [ ] Product team has shared a sample Zluri product usage CSV export (to design the import mapping)
- [ ] Granola access model confirmed: OAuth or API key only?
- [ ] ChurnZero CSV export pulled and mapped to the account schema — ready for data seed in Week 4

---

## Feature 1: Account Management — Core Foundations

### In plain language

Right now, finding an account on the accounts list requires scrolling or knowing exactly where to look. Filters are buried in the page header, not near the table they control. Editing the health score on an account saves the moment you click away — which means a misclick can corrupt data. Lifecycle stage uses a dropdown component that breaks when multiple stages apply.

This feature fixes all of that. It's not glamorous, but it's the foundation CSMs interact with every single day. Getting this right is what makes the platform feel professional vs. cobbled together.

**What a CSM will experience after this is built:**
- Type "arctic" in the search bar — only Arctic Wolf appears instantly, no page reload
- Click a filter, pick "High Risk" — the list updates immediately; the URL updates so you can share the filtered view with a colleague
- Click the pencil icon next to a health score — type a new number, hit the checkmark to save. No accidental saves.
- Click "+ Add stage" on the lifecycle field — pick "At Risk" — it appears as a chip alongside "Adoption"

---

### What it does

**Account list — search:**
- Text input above the left edge of the accounts table (not in the page topbar)
- Filters the visible rows in real time as the CSM types, matching against account name and CSM name (case-insensitive)
- Live count: "12 of 37 accounts" — updates as search/filters change
- Search state stored in the URL (`?q=arctic`) so the page is bookmarkable and shareable

**Account list — filters:**
- Inline filter bar directly above the table, with these filters:
  - **CSM** — multi-select, lists all CSMs in the system
  - **Sentiment** — multi-select: Good / Some Risk / High Risk
  - **Health band** — select: 0–40 / 41–70 / 71–100
  - **Renewal window** — select: Next 30 days / 31–60 / 61–90 / Overdue
  - **Lifecycle Stage** — multi-select from the full stage list
- Active filter count badge: "3 filters active" with a clear-all link
- Filter state in URL, same as search

**Account overview — health score edit:**
- Score displayed as a number with a pencil icon that appears on hover
- Click pencil → number becomes an editable input
- Confirm: checkmark button (or press Enter) → saves via PATCH API call → success toast
- Cancel: X button (or press Escape) → reverts to previous value
- No save-on-blur — losing focus does nothing until the CSM explicitly confirms

**Account overview — lifecycle stage chips:**
- Active stages shown as removable chips (e.g., "Adoption ×", "At Risk ×")
- "+ Add stage" link opens a popover with all available stages; click one to add it as a chip
- Removing a chip saves immediately
- Multiple stages supported at the same time (this is a TEXT[] column, not a single value)

**Account overview — renewal stage progression:**
- Replaced the dropdown with a horizontal step component: Discovery → Intent Confirmed → Commercial Agreed → Renewal Sent → Renewed / Churned
- Click any stage to advance or revert to it
- Each stage change is timestamped and stored; hover over the current stage badge shows "Set to X on [date] by [CSM]"

**Notes — edit and undo:**
- Each note card has an "Edit" button that opens the note form pre-filled with existing content
- Delete shows a Sonner toast with a 5-second undo option — no browser confirm dialogs

**Success plans — creation UI:**
- "Create Success Plan" button always visible in the Tasks tab header, even when zero plans exist
- Clicking opens a form: plan name (required), description (optional), owner (defaults to current CSM), due date
- Empty state below the button explains the two-level structure: plans group tasks

---

### How to build it

**Account list search and filters:**
The filter state is managed by a single `useAccountFilters` hook that reads from and writes to URL search params using the `nuqs` library. The accounts query is built server-side from these params. No client-side data fetching on filter change — the URL param change triggers a Next.js server component re-render, which runs the filtered Supabase query.

```typescript
// URL: /accounts?q=arctic&sentiment=high_risk&csm=priya-id
// Hook reads params → builds query → passed to AccountsTable component
```

**Health score inline edit:**
Small controlled React component: display mode vs. edit mode based on `isEditing` state. On confirm, call `PATCH /api/accounts/[id]` with `{ health_score_override: value }`. On success, update local state. On failure, revert and show an error toast.

**Lifecycle stage chips:**
Custom component using shadcn/ui Popover for the stage picker. Each chip remove calls `PATCH /api/accounts/[id]` with the updated array. Adding a stage does the same. Both are immediate (no "save" button — the save is the action).

**Renewal stage progression:**
Stage stored in `accounts.renewal_stage`. History stored as a JSONB array in `accounts.metadata` (no new table needed — this keeps the schema clean). Each stage click calls PATCH, appends to history in the same request.

**Toast-undo delete for notes:**
Sonner toast with an "Undo" action. On delete click: immediately remove from UI (optimistic), show toast. If undo clicked: call `PATCH /api/accounts/[id]/notes/[id]` to restore. If toast expires: call `DELETE /api/accounts/[id]/notes/[id]`.

**API routes needed:**
```
GET    /api/accounts              List with filters (existing — extend query builder)
PATCH  /api/accounts/[id]         Update account fields (existing — extend fields)
PATCH  /api/accounts/[id]/notes/[noteId]   Update note content or restore deleted
DELETE /api/accounts/[id]/notes/[noteId]   Hard delete (after undo window expires)
POST   /api/accounts/[id]/success-plans    Create success plan
```

**Estimated time: 3–4 days**

**Done when:**
- [ ] Typing in the search box filters accounts without a page reload
- [ ] Filter state survives a browser refresh (URL persistence confirmed)
- [ ] Health score cannot be saved by clicking away — only by confirming with the checkmark
- [ ] Lifecycle stage accepts two simultaneous values and persists both
- [ ] Deleting a note shows an undo toast; no `confirm()` dialog appears anywhere in the app
- [ ] "Create Success Plan" button is visible in the Tasks tab even when no plans exist

---

## Feature 2: Dashboard — Work Queue Model

### In plain language

The dashboard is the first thing CSMs see every morning. The old design shows you the state of things — how many accounts you have, what your average health score is, a list of renewals. It's a status report. The problem is CSMs don't need a status report in the morning. They need to know what to act on.

The new dashboard is a work queue. When you open it, you immediately see: tasks that are overdue, tasks due this week, accounts with renewals coming up that need outreach, accounts that have been flagged as high risk. And above all of that — a strip of AI-generated signals that says things like "Arctic Wolf: 2 action items from yesterday's call not yet turned into tasks" or "Santos Brasil: renewal in 28 days, no outreach logged in 3 weeks."

No hunting. No filtering. The dashboard tells you what to do.

**What a CSM will experience:**
- Open the platform at 9am — immediately see three overdue tasks highlighted in red
- See that Clinica Alemana has a renewal in 12 days with no outreach logged — click through directly to the account
- See an AI signal card that says "8x8: 3 action items from Mar 22 call not yet tasked" — click to go directly to those suggestions
- Hit "+ New Task" right on the dashboard without navigating anywhere

---

### What it does

**Layout — Today's Focus (three columns):**
- **Overdue & Urgent** — tasks past their due date, red left border, grouped at the top
- **Due This Week** — tasks due in the next 7 days, amber left border for tasks due today
- **Upcoming (14 days)** — tasks due in the next 8–14 days, standard styling
- Hard cap of 5 items per column visible by default; "View all X →" link to the full task list
- Each task card shows: title, account name (clickable → account overview), due date, owner avatar
- "+ New Task" button on the widget header → opens task creation modal → asks which account

**AI signals strip (above the three columns):**
- 3–5 auto-generated signal cards, each a single sentence describing something that needs attention
- Examples: "Arctic Wolf: QBR not scheduled — renewal in 85 days", "Biote Medical: High risk signal added 6 days ago, no follow-up task created", "Clinica Alemana: No meeting logged in 4 weeks, renewal in 12 days"
- Each card is clickable → navigates to the relevant account
- "Dismiss" button on each card — dismissed signals don't reappear the next day
- Signals are computed overnight by a scheduled background job (no Claude call — these are template sentences filled with data from queries, which keeps latency and cost to zero)

**Renewals widget:**
- Accounts renewing in the next 90 days, sorted by days remaining
- Each row: account name, sentiment badge (Good/Some Risk/High Risk), days remaining (red if ≤ 14, amber if ≤ 30), ARR
- Click any row → account Overview tab (not the account list)

**High Risk widget:**
- Accounts with High Risk or Some Risk sentiment, sorted by ARR (highest risk first)
- Each row: account name, "Last activity X days ago" (computed from most recent meeting note date)
- "Last activity" shown in red if > 14 days
- "View all X at-risk accounts →" link if list exceeds the display cap (5)

**Role variants:**
- CSM: scoped to their assigned accounts and tasks only
- CS Lead/Admin: team-wide view with a secondary stats strip showing total team ARR at risk, team average health score, and overdue tasks count across all CSMs

---

### How to build it

**Data loading:**
Dashboard data is fetched server-side in the RSC layout — not client-side. This means the dashboard renders populated on the first paint, with no loading spinners. The RSC calls Supabase directly using the server client.

Four data queries run in parallel (using `Promise.all`):
1. Tasks for current user — filtered by status/due date, sorted by urgency
2. Accounts for current user — filtered for renewals in 90 days
3. Accounts for current user — filtered for high/some risk sentiment
4. Dashboard signals for current user — filtered for today, not dismissed

**AI signals computation (background job):**
A Vercel Cron function runs at 06:00 UTC daily. It runs six parameterized queries against the database:
```
- Accounts with renewal ≤ 30 days AND no meeting note in last 14 days
- Accounts with unprocessed AI action items (action_items_processed = false)
- Accounts with unresolved high-risk signals AND no follow-up task in last 7 days
- Accounts with QBR not scheduled AND renewal < 90 days
- Accounts with exec engagement = 'None' AND renewal < 60 days
- Accounts with CSM Pulse = High Risk AND no outreach in 21 days
```

Results are written to `dashboard_signals` table. The dashboard RSC reads from this table — zero AI API calls on page load.

```sql
-- New table
CREATE TABLE dashboard_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  account_id UUID REFERENCES accounts(id),
  signal_type TEXT,
  signal_text TEXT,
  computed_at TIMESTAMPTZ DEFAULT now(),
  dismissed_at TIMESTAMPTZ
);
```

**API routes needed:**
```
PATCH  /api/dashboard/signals/[id]/dismiss   Set dismissed_at
```

**Estimated time: 2–3 days**

**Done when:**
- [ ] Dashboard renders with data on first load (no empty → loading → populated flicker)
- [ ] Overdue tasks appear in the left column with red styling; due-today tasks are in amber
- [ ] Clicking a renewal row navigates to that account's Overview tab
- [ ] AI signal cards appear for at least 2 accounts after the nightly cron runs
- [ ] Dismissing a signal removes it without page reload and it doesn't reappear the next day
- [ ] CS Lead sees team-wide stats; CSM sees only their own data

---

## Feature 3: Computed Health Score

### In plain language

Right now, the health score is a number someone typed in at some point. It might be accurate. It might be from three months ago. There's no way to tell.

The computed health score replaces this with a formula. It takes four signals — how actively customers are using Zluri's product, what the sentiment of recent meetings has been, how engaged the customer's exec team has been, and whether there are any unresolved risk signals — and produces a score between 0 and 100 that updates automatically.

The CS team has access to something no third-party CSP can replicate: Zluri's own product data. How many of a customer's licensed users actually logged in last month? What percentage of licensed seats are being actively used? This is the most reliable health signal there is, and right now it isn't being used at all.

For Phase 1, product usage data comes in via a CSV export from Zluri's internal systems (an API connection is a future build). After a CS Lead imports the file, every health score in the system updates automatically.

**What a CSM will experience:**
- Account overview shows "Computed: 82" with a small sparkline of the score over the last 90 days
- Hovering over the sparkline shows what drove each point in time
- A tooltip explains the formula: "82 = 91% product adoption (40%) + Positive sentiment (30%) + Low exec engagement (20%) − 0 risk penalty (10%)"
- CSM can still override the score if they have context the formula doesn't — the override is stored separately and shown alongside the computed score

---

### What it does

**Formula:**
```
Health Score (0–100) =
  40%  ×  Product Adoption Score
           (active_users_30d ÷ licensed_users × 100)
+ 30%  ×  Meeting Sentiment Score
           (average of last 3 Granola-synced meetings: Positive=100, Neutral=50, Negative=0)
+ 20%  ×  Engagement Score
           (based on exec engagement level + days since last meeting, scaled 0–100)
+ 10%  ×  Risk Signal Penalty
           (−10 for each unresolved high-risk signal, floor 0)
```

This formula requires CS Lead sign-off before implementation — the weights are a business judgment, not a technical one.

**On the account overview:**
- "Computed: 82" displayed prominently with a "?" tooltip explaining the breakdown
- "Override: —" shows if no override; shows override value if set
- Pencil icon next to the override field to set/edit a manual override
- 90-day sparkline below the score (CSS bar chart, no library required)
- "Last computed: 2 hours ago" timestamp
- If product usage data is missing for an account: "Partial data — product adoption signal unavailable" with the score computed from the remaining three signals

**Product usage CSV import:**
- New import type available at `/import` (alongside the existing account import): "Product Usage Data"
- Required columns: account identifier (org_id), active_users_last_30d, licensed_users, snapshot_date
- After upload and field mapping: validates rows, shows a preview of which accounts will be updated
- On confirm: updates `accounts.product_usage_*` columns, triggers a health score recomputation for every updated account
- Import log recorded in `import_logs`

**Score recomputation triggers:**
- After a product usage CSV import
- After a Granola sync (new sentiment reading added)
- After a risk signal is added or dismissed
- After exec engagement is updated on an account

---

### How to build it

**Health score computation function:**
A server-side TypeScript function that takes an account's current data and produces a score. Called whenever a trigger event occurs. Runs as part of the API route that handles the trigger — not a separate service.

```typescript
function computeHealthScore(account: Account, sentimentHistory: SentimentHistory[]): number {
  const adoptionScore = account.product_usage_licensed_users > 0
    ? (account.product_usage_active_users / account.product_usage_licensed_users) * 100
    : null; // partial data flag

  const sentimentScore = averageSentiment(sentimentHistory.slice(0, 3));
  const engagementScore = computeEngagement(account.exec_engagement, account.last_meeting_date);
  const riskPenalty = Math.min(account.risk_signals.length * 10, 100);

  const weights = adoptionScore !== null
    ? [0.4, 0.3, 0.2, 0.1]
    : [0, 0.43, 0.29, 0.14]; // redistribute if no product data

  return Math.round(
    (weights[0] * (adoptionScore ?? 0)) +
    (weights[1] * sentimentScore) +
    (weights[2] * engagementScore) -
    (weights[3] * riskPenalty)
  );
}
```

**Product usage import:**
Reuse the existing CSV import pipeline (PapaParse on client, validation + upsert on server). New import type adds `product_usage_*` field mapping. After upsert, call the health score computation function for each updated account and write `computed_health_score` and `health_score_last_computed` to the accounts table.

**Sparkline:**
CSS flexbox bars — no chart library. Each bar's height is proportional to the health score at that point. Bar colour: green if ≥ 70, amber if 40–69, red if < 40.

**Schema changes:**
```sql
-- New columns on accounts table
ALTER TABLE accounts ADD COLUMN computed_health_score INTEGER;
ALTER TABLE accounts ADD COLUMN health_score_override INTEGER;
ALTER TABLE accounts ADD COLUMN health_score_last_computed TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN product_usage_active_users INTEGER;
ALTER TABLE accounts ADD COLUMN product_usage_licensed_users INTEGER;
ALTER TABLE accounts ADD COLUMN product_usage_snapshot_date DATE;
```

**API routes needed:**
```
POST   /api/import/product-usage          Upload and process product usage CSV
POST   /api/accounts/[id]/compute-health  Recompute score (called internally on triggers)
PATCH  /api/accounts/[id]                 Save health score override (existing route, new field)
```

**Estimated time: 2–3 days**

**Done when:**
- [ ] Health score on account overview shows "Computed: [N]" not a bare number
- [ ] Importing a product usage CSV updates the health score for matched accounts within 30 seconds
- [ ] Adding a risk signal on an account immediately updates the computed score
- [ ] Accepting a sentiment suggestion from Granola sync updates the computed score
- [ ] Sparkline shows the last 90 days of score history
- [ ] Accounts without product usage data show "Partial data" flag, not an error

---

## Feature 4: AI Meeting Analysis Pipeline

### In plain language

Every week, CSMs have 5–10 customer calls. Granola records and transcribes them. But right now, the insights from those calls — the action items, the concerns the customer raised, the overall tone of the conversation — live only in Granola. Nothing automatically flows into the CSP.

This feature creates that connection. After a CSM syncs their Granola notes, the platform sends each transcript to Claude (Anthropic's AI). Claude reads it and identifies three things: (1) any action items that came out of the meeting ("the customer asked us to send the integration guide by Friday"), (2) any risk signals ("the customer mentioned they're evaluating alternatives"), and (3) the overall sentiment of the meeting (positive, neutral, or negative).

These are surfaced on the account page as suggestions. The CSM reviews them and clicks "Accept" or "Dismiss." Nothing is written automatically — Claude proposes, the CSM decides.

The result: action items that used to be forgotten or manually re-entered take 10 seconds to convert into real tasks. Risks that used to slip through get captured from the transcript automatically.

**What a CSM will experience:**
- Syncs Granola after a Monday meeting
- Opens Arctic Wolf in the CSP
- Sees a purple banner: "3 AI suggestions from Monday's meeting — 2 proposed tasks, 1 risk signal"
- Clicks "Review" — sees two task suggestions (with text and proposed due date) and one risk signal (with the exact quote that triggered it)
- Clicks "Accept" on the tasks — they appear in the Tasks tab immediately
- Clicks "Accept" on the risk signal — it appears in the Risk Signals section on the Overview tab
- The sentiment (Positive) is suggested next to the CSM Pulse buttons — one click to confirm

---

### What it does

**Extraction (happens in background after every Granola sync):**

Claude is called with each meeting note's full content and a structured prompt that asks for JSON output with three keys:
- `action_items`: array of `{ text, due_date_hint, owner_hint }`
- `risk_signals`: array of `{ text, severity }` (severity: high_risk or some_risk)
- `sentiment`: one of `positive`, `neutral`, `negative`
- `summary`: 2–3 sentence plain-language summary of the meeting

The output is validated with a schema before anything is written. If the AI response doesn't match the expected structure, extraction fails gracefully and the note is saved normally without suggestions.

**Proposed tasks (on the Tasks tab):**
- "AI Suggested Tasks" tray, collapsible, with a count badge ("3 pending")
- Each suggested task shows: action item text, suggested due date, suggested owner (best guess from context)
- Three buttons per suggestion: **Accept** (creates a real task immediately) | **Edit** (opens task creation form pre-filled) | **Dismiss** (removes the suggestion)
- Accepted tasks have `source = 'ai'` and appear in the standard task list alongside manual tasks

**Proposed risk signals (on the Overview tab):**
- Below the existing risk signals section, with a dashed purple border and "AI Suggested" label
- Shows: signal text and the severity (High Risk or Some Risk)
- Two buttons: **Accept** (appends to `accounts.risk_signals`, triggers health score recomputation) | **Dismiss**

**Sentiment suggestion (on the Overview tab):**
- Next to the CSM Pulse (Good/Some Risk/High Risk) buttons
- Small inline suggestion: "AI suggested: Positive — from Mar 24 meeting" with Accept and Dismiss
- Accepting adds a row to `sentiment_history` (used by the health score formula and sparkline)

**AI summary on note cards:**
- Shown at the top of each note card in the Notes tab
- 2–3 sentences summarising the meeting
- "Action items: Book Q2 QBR · Follow up on SSO approval" shown below the summary
- Collapsible — collapsed by default for notes the CSM has already processed

**The non-negotiable rule:**
No AI suggestion becomes a real record without explicit CSM action. Claude's output is always a proposal. The only silent writes are: `meeting_notes.ai_summary` (informational, shown on the note card) and `meeting_notes.sentiment_hint` (a suggestion shown next to CSM Pulse, not an automatic update to the score).

---

### How to build it

**When extraction runs:**
After a Granola sync completes, each newly-synced note is added to a `sync_jobs` queue table with `type = 'extract_note'`. A Vercel Cron function (running every 15 minutes) picks up pending jobs and processes them — one Claude call per note.

```sql
CREATE TABLE sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT, -- 'granola_sync', 'extract_note'
  user_id UUID REFERENCES profiles(id),
  note_id UUID REFERENCES meeting_notes(id),
  status TEXT DEFAULT 'pending', -- pending / processing / done / failed
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT
);
```

**The Claude prompt structure:**
```
System: You are extracting structured data from a customer meeting transcript.
        Output ONLY valid JSON matching this schema: { action_items: [...], risk_signals: [...], sentiment: "positive"|"neutral"|"negative", summary: "..." }
        
User: [meeting note content, truncated to 4000 tokens]
```

Model used: `claude-haiku-4-5-20251001` — optimised for speed and structured extraction. Cost per note: approximately $0.001–0.003 depending on transcript length.

**Output validation:**
Before any database write, the Claude response is parsed and validated using a Zod schema. If validation fails: job marked as `failed`, note saved normally, `action_items_processed` remains `false`.

**Proposed risk signals table:**
```sql
CREATE TABLE proposed_risk_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  note_id UUID REFERENCES meeting_notes(id),
  signal_text TEXT,
  severity_hint TEXT,
  status TEXT DEFAULT 'pending', -- pending / accepted / dismissed
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Sentiment history table:**
```sql
CREATE TABLE sentiment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id),
  note_id UUID REFERENCES meeting_notes(id),
  date DATE,
  value TEXT, -- positive / neutral / negative
  confirmed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Meeting notes schema changes:**
```sql
ALTER TABLE meeting_notes ADD COLUMN ai_summary TEXT;
ALTER TABLE meeting_notes ADD COLUMN sentiment_hint TEXT;
ALTER TABLE meeting_notes ADD COLUMN sentiment_confirmed BOOLEAN DEFAULT false;
ALTER TABLE meeting_notes ADD COLUMN action_items_processed BOOLEAN DEFAULT false;
```

**Task status change:**
The `tasks.status` column needs a new value: `'proposed'`. Proposed tasks don't appear in the main task list — only in the AI suggestions tray. On accept, status changes to `'todo'` and `source` is set to `'ai'`.

**API routes needed:**
```
POST   /api/integrations/granola/sync            Trigger sync (queues jobs)
GET    /api/accounts/[id]/ai-suggestions         Return all pending proposals for account
PATCH  /api/accounts/[id]/tasks/[id]/accept      Accept proposed task → real task
PATCH  /api/accounts/[id]/tasks/[id]/dismiss     Dismiss proposed task
PATCH  /api/accounts/[id]/risk-signals/[id]/accept   Accept proposed signal
PATCH  /api/accounts/[id]/risk-signals/[id]/dismiss  Dismiss
PATCH  /api/accounts/[id]/sentiment/[noteId]/accept  Confirm sentiment hint
```

**Estimated time: 4–5 days**

**Done when:**
- [ ] After a Granola sync, AI suggestions appear on the account page within 60 seconds
- [ ] Accepting a proposed task creates a real task that appears in the Tasks tab
- [ ] Accepting a risk signal adds it to the risk signals section and triggers a health score update
- [ ] Accepting a sentiment suggestion adds it to the sentiment history and updates the sparkline
- [ ] Dismissing any suggestion removes it permanently without page reload
- [ ] If Claude extraction fails, the note is still saved normally — no error shown to the CSM
- [ ] No AI content is written to any user-facing field without explicit CSM confirmation

---

## Feature 5: Per-CSM Integration Settings

### In plain language

Right now, any integration setup requires an admin. CSMs can't connect their own Granola account — they have to raise a request and wait. For a platform that's supposed to reduce tool friction, this is friction.

This feature adds a Settings page where each CSM can connect their own Granola and Gmail accounts in 2 minutes, without involving anyone else. Admin can see who's connected and can force-disconnect if needed — but day-to-day, CSMs are self-serve.

This is also the prerequisite for the email trigger feature in Phase 2 — without Gmail connected here, CSMs can't use email drafts later.

**What a CSM will experience:**
- Goes to Settings → Integrations
- Clicks "Connect Granola" — enters their Granola API key (or goes through OAuth if supported) — green dot appears with "Connected · Last synced: never"
- Clicks "Connect Gmail" — Google OAuth flow opens in a popup — authorises only draft creation — returns to the settings page with "Connected · priya.sharma@zluri.com"
- Sets Granola to auto-sync daily
- From now on, every morning their latest Granola notes are automatically available in the CSP

---

### What it does

**Settings → Integrations page (new route: ****`/settings/integrations`****):**
Available to all authenticated users — not admin-only.

**Granola integration:**
- "Connect Granola" button → input field for API key (or OAuth redirect if Granola supports OAuth — confirm before build)
- "Test Connection" button → calls Granola API with the key, shows success or error inline
- On success: stores encrypted API key in `csm_integrations.granola_credentials` via Supabase Vault
- Connected state: green dot, "Connected · Last synced: [timestamp]", "Sync Now" button, auto-sync toggle, frequency selector (Daily / Twice daily / Manual)
- "Disconnect" link → confirmation modal → clears credentials, updates status

**Gmail integration:**
- "Connect Gmail" button → initiates Google OAuth 2.0 flow with `gmail.compose` scope only
  - `gmail.compose` means: can create drafts. Cannot read inbox. Cannot send emails. Cannot see any existing messages.
- After OAuth: stores encrypted refresh token in `csm_integrations.gmail_credentials` via Supabase Vault
- Connected state: green dot, "Connected · priya.sharma@zluri.com", "Compose scope only" badge, "Disconnect" link
- Scope disclosure shown prominently before the OAuth button: "We will only create drafts in your Gmail. We cannot read your emails or send anything on your behalf."

**Slack (placeholder, Phase 1):**
- Slack card shown in the UI with "Connect Slack" button
- On click: shows a "Coming soon" message explaining what Slack will be used for (Phase 2 signal monitoring)
- No OAuth flow in Phase 1

**Admin view at ****`/admin/integrations`****:**
- Table of all CSMs: name, Granola status (connected/not/error), Gmail status, last Granola sync time
- "Force disconnect" button per CSM per integration
- "Mark as required" toggle per integration: CSMs with the corresponding role see an alert banner if not connected

---

### How to build it

**`csm_integrations`**** table (one row per user, created on first settings page visit):**
```sql
CREATE TABLE csm_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  granola_connected BOOLEAN DEFAULT false,
  granola_credentials JSONB,          -- encrypted via Supabase Vault
  granola_sync_enabled BOOLEAN DEFAULT true,
  granola_sync_frequency TEXT DEFAULT 'daily',
  granola_last_synced_at TIMESTAMPTZ,
  gmail_connected BOOLEAN DEFAULT false,
  gmail_credentials JSONB,             -- encrypted refresh token
  slack_connected BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Credential encryption:**
Supabase Vault (`pgsodium`) — credentials are encrypted before write, decrypted only on read by server-side functions. The `JSONB` column stores the encrypted ciphertext, not the raw key/token. This means even a database dump doesn't expose credentials.

**Gmail OAuth flow:**
1. CSM clicks "Connect Gmail"
2. Server generates a Google OAuth URL with `gmail.compose` scope and `state` = CSRF token
3. CSM is redirected to Google's OAuth consent screen
4. Google redirects back to `/api/auth/google/callback?code=...&state=...`
5. Server validates state, exchanges code for access + refresh token
6. Refresh token stored encrypted in Vault; access token stored in memory/session (it expires in 1 hour and is refreshed on each Gmail API call)
7. CSM is redirected back to the settings page with a success toast

**Token refresh:**
Before every Gmail API call, check if the access token has expired. If so, use the stored refresh token to get a new one. Update the stored access token. This happens transparently — the CSM never sees a re-authentication prompt unless the refresh token itself is revoked.

**Granola sync trigger:**
"Sync Now" creates a job in `sync_jobs` with `type = 'granola_sync'`. The Vercel Cron function picks it up within 15 minutes. Daily auto-sync also writes to `sync_jobs` via the cron schedule.

**API routes needed:**
```
GET    /api/settings/integrations              Current user's integration status
POST   /api/settings/integrations/granola/connect    Store API key, test connection
DELETE /api/settings/integrations/granola/disconnect  Clear credentials
PATCH  /api/settings/integrations/granola/preferences  Update sync frequency, auto-sync toggle
POST   /api/settings/integrations/granola/sync-now    Queue sync job
GET    /api/auth/google/callback               OAuth callback handler (Gmail)
DELETE /api/settings/integrations/gmail/disconnect    Revoke token + clear credentials
GET    /api/admin/integrations                 All CSMs' integration status (admin only)
DELETE /api/admin/integrations/[userId]/[type] Force disconnect (admin only)
```

**Estimated time: 3–4 days**

**Done when:**
- [ ] CSM can connect a Granola API key without admin involvement — "Test Connection" confirms it works
- [ ] CSM can connect Gmail via OAuth in under 2 minutes — connected state shows their email address
- [ ] Granola auto-sync runs daily for connected CSMs (verified via sync_jobs table and last_synced_at timestamp)
- [ ] No credentials are stored in plaintext anywhere in the database
- [ ] Admin can see connection status for every CSM in one table
- [ ] Disconnecting Gmail revokes the token at Google — not just locally
- [ ] If Gmail is not connected, email trigger buttons across the platform show "Connect Gmail first" and link to this settings page

---

## Feature 6: Sales-to-CS Lifecycle Checklist

### In plain language

There's a documented Sales-to-CS process at Zluri. It has three phases (handover, implementation, steady state) and around 18 steps that should happen when a new customer is onboarded. Right now, there's no system that tracks whether each step has happened for each account. Some steps get missed. Some emails don't get sent. Some documents aren't generated.

This feature puts the checklist directly on each account's overview page. The CS Lead can see completion percentages across all accounts. And certain steps auto-check themselves when the corresponding action is taken in the platform — for example, the "Deal closure email sent" checkbox ticks automatically when that email trigger is used in Phase 2.

It's a simple feature, but it's the thing that makes the process real — turning a PDF document into something that actually gets tracked per customer.

**What a CSM will experience:**
- Opens any account overview — sees a checklist panel on the right side
- Phase 1 (Pre-Kickoff) shows 7 steps, with a progress bar showing "7/10 complete"
- Clicks a checkbox next to "QBR scheduled" — it checks; progress bar updates
- In Phase 2, clicks "Send Deal Closure Email" → email draft created → the "Deal closure email sent" checkbox auto-ticks
- CS Lead opens their admin view → sees checklist completion % across all accounts

---

### What it does

**On the account Overview tab (right column):**
Three sections, each with a progress bar and a list of checkboxes:

**Pre-Kickoff:**
- Deal closure email sent to CSops
- Exec introduction email sent
- CSM/CSE assigned
- Sales recordings and handover docs received
- Handover Document generated
- Customer Environment Intake Form completed
- Pre-kickoff alignment call completed
- Customer kickoff call completed
- Implementation plan prepared
- Kickoff completed + SOW signed

**Implementation:**
- Project tracker created and shared with customer
- Weekly exec updates cadence set up
- Go-live conducted
- Go-live email + KT materials sent

**Steady State:**
- Monthly adoption report cadence active
- QBR scheduled
- Expansion opportunities documented

**Manual checking:** CSM clicks any checkbox to check or uncheck it. Change is saved immediately.

**Auto-checking (Phase 1 where applicable, Phase 2 for the rest):**
- "CSM/CSE assigned" → auto-checks when `accounts.csm_id` is set
- Phase 2 additions: email triggers auto-check their corresponding checklist items on draft creation

**Progress bars:** Per-phase completion percentage (e.g., "7/10") shown above each phase section. Full-phase completion shown in green.

**CS Lead portfolio view:** In the admin/CS Lead dashboard, a summary column showing checklist completion % per account — sortable, so the CS Lead can immediately see which accounts have the biggest process gaps.

---

### How to build it

**`account_lifecycle_checklist`**** table (one row per account, created when account is created):**
```sql
CREATE TABLE account_lifecycle_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) UNIQUE,
  -- Pre-Kickoff
  deal_closure_email_sent BOOLEAN DEFAULT false,
  exec_intro_email_sent BOOLEAN DEFAULT false,
  csm_cse_assigned BOOLEAN DEFAULT false,
  recordings_received BOOLEAN DEFAULT false,
  handover_doc_generated BOOLEAN DEFAULT false,
  intake_form_completed BOOLEAN DEFAULT false,
  pre_kickoff_alignment_done BOOLEAN DEFAULT false,
  pre_kickoff_customer_call_done BOOLEAN DEFAULT false,
  impl_plan_prepared BOOLEAN DEFAULT false,
  kickoff_done BOOLEAN DEFAULT false,
  -- Implementation
  project_tracker_created BOOLEAN DEFAULT false,
  project_tracker_shared BOOLEAN DEFAULT false,
  weekly_updates_cadence_set BOOLEAN DEFAULT false,
  go_live_conducted BOOLEAN DEFAULT false,
  go_live_email_sent BOOLEAN DEFAULT false,
  -- Steady State
  monthly_reports_cadence_set BOOLEAN DEFAULT false,
  qbr_scheduled BOOLEAN DEFAULT false,
  expansion_opportunities_documented BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Auto-check trigger (database-level):**
A Supabase database trigger on `accounts` that fires when `csm_id` changes from null to a value — automatically sets `csm_cse_assigned = true` in the corresponding `account_lifecycle_checklist` row.

**UI component:**
`AccountLifecycleChecklist` — a React client component that renders the three phases with checkboxes. Each checkbox click sends `PATCH /api/accounts/[id]/checklist` with the field name and new value. Optimistic update on click — reverts if the API call fails.

**API routes needed:**
```
GET    /api/accounts/[id]/checklist     Fetch checklist for account
PATCH  /api/accounts/[id]/checklist     Update one or more checklist fields
GET    /api/admin/checklists            Aggregated checklist completion across all accounts (admin only)
```

**Estimated time: 1–2 days**

**Done when:**
- [ ] Every account has a checklist visible on the Overview tab right column
- [ ] Checking a box saves immediately with no page reload
- [ ] Progress bars update in real time as boxes are checked
- [ ] Assigning a CSM to an account auto-checks "CSM/CSE assigned"
- [ ] CS Lead can see checklist completion % for all accounts in the portfolio view

---

## Delivery Summary

### Sequencing rationale

The features are built in an order that respects dependencies:

1. **Account management** first — every other feature lives on account pages; they need to work correctly before anything else is added to them
2. **Dashboard** second — CSMs need a daily entry point that makes sense; building this early means it gets real feedback before Phase 1 is complete
3. **Health score** third — depends on the account page existing; the CSV import provides data to test with immediately
4. **AI pipeline** fourth — depends on Granola integration; needs the account page and task infrastructure in place
5. **Integration settings** fifth — can be built in parallel with the AI pipeline; CSMs need it to be able to trigger their first Granola sync
6. **Lifecycle checklist** last — simplest feature; quick to build once the account page is stable

### Effort summary

| Feature | Estimated days | Engineering support needed? |
| --- | --- | --- |
| Foundation (auth, schema, scaffold) | 2 | Yes — initial Supabase setup, Vercel config |
| Account management foundations | 3–4 | No |
| Dashboard — work queue | 2–3 | No |
| Computed health score | 2–3 | No |
| AI meeting analysis pipeline | 4–5 | Yes — Vercel Cron setup, Claude API integration |
| Per-CSM integration settings | 3–4 | Yes — Gmail OAuth, Supabase Vault setup |
| Lifecycle checklist | 1–2 | No |
| Polish, data import, deploy | 3–4 | Yes — production deployment, data migration |
| **Total** | **20–27 days** |  |

**Timeline: 4 weeks with buffer. 3 weeks if the foundation and OAuth setup are completed in the first 3 days.**

### What engineering support is needed
- Initial Supabase project setup, schema migration run, Vercel project configuration: ~1 day
- Gmail OAuth consent screen submission + Google Cloud project setup: ~half a day
- Supabase Vault configuration for credential encryption: ~2 hours
- Vercel Cron job setup for AI extraction and signal computation: ~half a day
- Production deployment and DNS/auth configuration: ~1 day

Everything else is built by Shrikant.

---

## Risks and how to handle them

**Risk 1: Granola doesn't support OAuth — only API keys**
*Impact:* Lower friction (API keys are simpler than OAuth). No architectural change needed — the settings UI just shows an API key input instead of an OAuth button.
*Action:* Confirm with Granola docs before Week 3. Design the settings page to handle both.

**Risk 2: Gmail OAuth consent screen review takes more than 3 days**
*Impact:* Email integration cannot be tested until approved. This doesn't block Phase 1 (email triggers are Phase 2), but it does block testing the Gmail connect flow in Phase 1's integration settings.
*Action:* Submit the Google Cloud OAuth consent screen on Day 1. Use "testing" mode (limited to whitelisted users) until approved — sufficient for the CS team's 8–10 accounts.

**Risk 3: Claude API extraction quality is inconsistent**
*Impact:* Poor extractions lead to irrelevant task suggestions, which trains CSMs to dismiss everything.
*Action:* Test the extraction prompt on 10 real Granola transcripts before going live. Tune the prompt until precision > 80% (8 of 10 extracted action items are real action items). If quality is still inconsistent, ship the AI summary feature first and hold back proposed tasks for a fast-follow iteration.

**Risk 4: Health score formula gets challenged after build**
*Impact:* Rebuilding the formula after the fact is painful and erodes trust in the score.
*Action:* Get CS Lead sign-off on the formula weights before writing a line of health score code. Document the sign-off. The formula is a named constant in code — easy to change if weights shift — but the architecture doesn't change.

**Risk 5: Phase 1 scope slips past 4 weeks**
*Impact:* Delays Phase 2 and the project tracker, which CSMs are most excited about.
*Action:* If Week 3 shows the AI pipeline is taking longer than expected, ship Phase 1 without the AI extraction and release it as a fast-follow update. The core features (account management, dashboard, health score, integration settings, checklist) can ship independently.

---

## Appendix: Open questions that need answers before Week 1

| # | Question | Needed for | Owner |
| --- | --- | --- | --- |
| Q1 | Health score formula weights confirmed? | Feature 3 | CS Lead |
| Q2 | Zluri product usage CSV columns? | Feature 3 | Product / Data team |
| Q3 | Granola: OAuth or API key? | Feature 5 | Shrikant to confirm with Granola |
| Q4 | Google Cloud project created and OAuth consent screen submitted? | Feature 5 | Engineering |
| Q5 | ChurnZero CSV export pulled and ready for seeding? | Week 4 data import | Shrikant |
