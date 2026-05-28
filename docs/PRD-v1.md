---
planStatus:
  planId: plan_1774520106005_arshpl
  title: ""
  status: draft
  planType: feature
  priority: medium
  progress: 0
  owner: ""
  stakeholders: []
  tags: []
  created: "2026-03-26"
  updated: "2026-03-26T10:15:06.005Z"
---
# Zluri Customer Success Platform — Product Requirements Document
**Version:** 2.0
**Date:** 2026-03-26
**Status:** For CTO Review and Approval
**Owner:** Shrikant Iyer, CS Operations

---

## 1. WHAT WE'RE BUILDING AND WHY

Zluri's Customer Success team runs on ChurnZero today. ChurnZero handles basic account tracking, renewal alerts, and health score dashboards reasonably well. **We are not replacing it.** We're building a platform that does the things ChurnZero fundamentally cannot.

**ChurnZero doesn't know what happened in your meetings.** It can't read a Granola transcript, pull out the action items a customer committed to, and surface them as tasks. Every action item from every customer call is manually re-entered — or silently lost.

**ChurnZero doesn't know your product data.** Zluri has first-party data on how customers actually use the product — active users, license utilisation, feature adoption per account. No third-party CSP can access this. We can build a health score that genuinely reflects whether a customer is getting value.

**ChurnZero has no workflow for the Sales-to-CS handover.** The process document exists. The steps are known. But there is no system that enforces them. Deals fall through the handover gap because nothing tracks whether each step actually happened.

**ChurnZero can't give customers a live view of their implementation.** Progress is communicated via email and decks. There's no live, client-facing view of where an implementation stands.

**ChurnZero can't generate documents or draft emails in context.** Every weekly update, MoM, and phase completion report is written from scratch. The data exists in the system; the tool doesn't use it.

This platform fills those gaps. It supplements ChurnZero — CSMs continue using ChurnZero for what it does well, and use the Zluri CSP for everything it cannot.

### At a glance

| Capability | ChurnZero | Zluri CSP |
| --- | --- | --- |
| Account list, health, renewals | ✓ | ✓ (better) |
| Task management | Basic | ✓ with success plans |
| Meeting notes | — | ✓ + AI extraction |
| Computed health score (product data) | — | ✓ Phase 1 |
| AI action items from meetings | — | ✓ Phase 1 |
| Sales-to-CS lifecycle checklist | — | ✓ Phase 1 |
| Implementation project tracker | — | ✓ Phase 2 |
| Client-shareable project URL | — | ✓ Phase 2 |
| Document generation (AI-drafted) | — | ✓ Phase 2 |
| Gmail draft creation from context | — | ✓ Phase 2 |
| AI command interface (ask Claude) | — | ✓ Phase 3 |
| Customer ROI dashboard | — | Phase 3 |

### Three design principles

**1. Supplement, don't disrupt.** ChurnZero stays. This platform adds what ChurnZero lacks, so CSMs aren't forced to choose or switch workflows.

**2. AI as a collaborator, not an authority.** Claude extracts action items, drafts documents, and surfaces risk signals — but every AI output requires explicit human confirmation before it becomes a real record. Nothing is silently written.

**3. CSM-owned.** CSMs connect their own Granola and Gmail accounts through a self-serve settings page. Admins set guardrails; CSMs operate within them without raising a ticket.

---

## 2. CURRENT STATE PROBLEMS

Six findings emerged from the cross-functional review of this platform. These are the root causes Phase 1 is designed to fix.

**Problem 1 — Health scores are guesses.**
Manual integers with no formula, no history, and no behavioral basis. A CSM who hasn't updated the score in three weeks has the same number as one who just ran a QBR. The score cannot be used for forecasting or decision-making, and it creates false confidence.

**Problem 2 — Meeting insights die in Granola.**
CSMs conduct 5–10 customer calls per week. Action items are agreed to and then re-entered manually into a task tool — if they're entered at all. There's no automatic connection between what was said in a call and what appears as a task in the system.

**Problem 3 — The handover process lives in a spreadsheet.**
The Sales-to-CS collaboration process is documented. The steps are known. But no system enforces them or tracks which ones have been completed per account.

**Problem 4 — CSMs communicate implementation status via email.**
There's no live view customers can check. Every status update is an email or a deck. CSMs spend significant time on status communication that could be replaced by a self-serve customer tracker.

**Problem 5 — Documents are built from scratch every time.**
Weekly updates, MoMs, SOWs, phase completion reports. The data exists in the platform. The tool doesn't use it. Every document is a manual effort.

**Problem 6 — CSMs switch between 5+ tools for a single customer interaction.**
Granola for notes. Google Docs for documents. Gmail for emails. ChurnZero for health. Notion or Sheets for project tracking. Every context switch is friction.

---

## 3. USER PERSONAS

### Primary: Customer Success Manager (CSM)
The daily operator. Manages 15–40 accounts. Needs to arrive each morning and immediately understand what needs action — without hunting through tools. Spends their day in meetings, writing emails, updating customers, and managing implementation progress. Values speed, clarity, and not having to re-enter information.

### Secondary: Customer Success Engineer (CSE)
The technical counterpart. Focused on implementation tasks, architecture, and milestones. Less concerned with health scores and sentiment trends; more concerned with what's due and who owns it. The project tracker is their primary surface.

### Tertiary: CS Lead / CSops
Manages the team, not the accounts. Needs portfolio-level visibility: which accounts are at risk, what is overdue, how the team tracks against renewals. Sets guardrails — locked template fields, required integrations, role assignments.

### Account Executive (AE) — read-only
Needs account context without being a daily user. Should be able to log in, see implementation status and account health for their accounts, and leave. No complex onboarding. Read-only access enforced.

### Customer Stakeholder — no login
Receives a URL to a live implementation tracker. Can see phases, milestones, and overall progress. Cannot edit anything. No Zluri account required.

---

## 4. DESIGN LANGUAGE

The platform must feel like a Zluri product — not a generic internal tool. CSMs who use Zluri daily should recognise it immediately.

**Visual identity:**
- Dark sidebar (#0F0E1A), white content surfaces — mirrors Zluri's website
- Violet accent (#7C3AED) — primary interactive elements, active states, AI indicators
- Compact, data-dense tables — CS work involves a lot of data; layouts prioritise scannability over padding
- Action-first microcopy — "Review AI suggestions" not "AI suggestions available"; "Send email" not "Email"
- Reference: https://www.zluri.com for colour palette, typography, and quality bar

**AI output distinction:** All Claude-generated content uses a distinct violet "AI" pill so users always know what came from the AI vs. what they entered.

**Technical component choices:**
- Component library: shadcn/ui (themed to Zluri brand)
- Icons: Lucide
- Typography: Inter

---

## 5. FEATURE SET BY PHASE

Features are organised by phase. Each phase is a standalone deliverable that leaves the platform in a usable, production-ready state.

---

### PHASE 1 — ChurnZero Supplement + Account Intelligence
**Timeline: 3–4 weeks | Owner: Shrikant Iyer + engineering support**

Phase 1 makes the platform immediately useful as a daily tool. It targets two things: fixing the account management gaps that make the platform hard to use today, and adding the features ChurnZero cannot provide — especially the AI meeting intelligence pipeline and computed health score.

By the end of Phase 1, a CSM can arrive in the morning, see what needs attention, log a meeting note, have action items automatically surfaced as proposed tasks, and understand their accounts' true health from real data — not a manually entered number.

---

#### 5.1.1 Account Management — Core Foundations

The account list and account overview are the two most-used screens. This feature closes the gaps that make them difficult to use in practice.

**Account list — search and filters:**
- Real-time text search by account name or CSM name; result count updates live ("12 of 37 accounts")
- Inline filter bar directly above the table (not hidden in the page header): CSM, Sentiment, Health band, Renewal window, Lifecycle Stage
- Filter state persists in the URL — survives page refresh, can be shared
- "3 filters active" indicator with a clear-all button

**Account overview — inline editing:**
- Health score: click pencil icon to edit; confirm with checkmark; cancel with X — no accidental save-on-blur
- Lifecycle stage: multi-chip component (e.g., "Adoption" + "At Risk" as removable chips, not a dropdown)
- Renewal stage: visual step progression track — stages are clicked through, not selected from a dropdown; stage changes are timestamped for audit trail
- All key detail fields (exec engagement, go-live date, AE name) inline-editable

**Notes — edit and undo:**
- Edit existing notes (reuse the note form, pre-filled)
- Delete uses a toast + 5-second undo instead of browser confirm dialogs (which can't be undone)

**Success plans — creation UI:**
- "Create Success Plan" always visible in the Tasks tab — even when no plans exist
- Empty state explains the two-level structure (plans contain tasks)

---

#### 5.1.2 Dashboard — Work Queue Model

The dashboard answers one question: "What needs my attention right now?" It is a work queue, not a status board.

**Layout:**
- Three-column "Today's Focus": Overdue & Urgent | Due This Week | Upcoming in 14 Days
- AI signals strip above the focus columns: 3–5 auto-generated sentences about accounts that need action (computed nightly from meeting data, task history, renewal proximity — no Claude call required; these are template sentences filled with DB-queried values)
- Renewals widget: accounts renewing soon with sentiment badge and days remaining, colour-coded by urgency (red ≤ 14 days, amber ≤ 30 days)
- High Risk widget: at-risk accounts with "last activity X days ago" label
- "+ New Task" on the task widget — opens a modal, asks which account

**Role variants:**
- CSM: scoped to their accounts and tasks only
- CS Lead/Admin: team-wide with portfolio stats (total ARR at risk, team health average, overdue tasks across all CSMs)

---

#### 5.1.3 Computed Health Score

Replaces the manually entered health score integer with a formula-based score that updates automatically.

**Formula (requires CS Lead sign-off before build):**
```
Health Score =
  40%  × Product Adoption Score   (active users ÷ licensed users, last 30 days)
  30%  × Meeting Sentiment Score   (average of last 3 Granola-synced meetings, 0–100)
  20%  × Engagement Score          (cadence frequency + exec engagement level)
  10%  × Risk Signal Penalty       (−10 per unresolved high-risk signal, floored at 0)
```

**In the platform:**
- Score is computed automatically after each Granola sync, each product usage import, and each time risk signals change
- Displayed as "Computed: 82" alongside a manual override option for cases where the CSM has context the formula doesn't
- 90-day history sparkline on the account overview
- If product usage data isn't yet available, score uses remaining signals and is flagged "Partial data"

**Product usage data input:**
- New CSV import type at `/import`: "Product Usage Data"
- Fields: account identifier (org_id), active users (last 30 days), licensed users, snapshot date
- Auto-matched to accounts; health scores recalculate immediately after import

---

#### 5.1.4 AI Meeting Analysis Pipeline

When a CSM syncs their Granola notes, Claude reads each transcript and extracts action items, risk signals, and meeting sentiment. These appear on the account page as suggestions — nothing is written automatically without the CSM's confirmation.

**What happens after a Granola sync (in background, takes < 60 seconds per note):**

1. **Action items → Proposed tasks.** Appear in an "AI Suggested Tasks" tray on the Tasks tab, each with text, suggested due date, and suggested owner. CSM can Accept (creates a real task), Edit then Accept, or Dismiss.

2. **Risk signals → Proposed risk signals.** Appear on the Overview tab with a dashed purple border and "AI Suggested" label. Accept adds to the account's risk signals; Dismiss removes.

3. **Sentiment → Suggested pulse.** Shown next to the CSM Pulse buttons: "AI suggested: Positive — from Mar 24 meeting." One-click accept adds it to the sentiment history, which feeds the health score formula.

4. **AI Summary.** 2–3 sentence plain-language summary shown at the top of each note card. Collapsible. Shows key decisions, attendees, and action items.

**The rule that does not bend:** Claude never silently writes a task, risk signal, or health score update. Every AI output is a proposal until the CSM confirms it.

---

#### 5.1.5 Per-CSM Integration Settings

Each CSM connects their own tools through a self-serve settings page. No admin ticket required. Admin has visibility and control but doesn't manage individual credentials.

**Granola:**
- Connect via API key (or OAuth if Granola supports it — to confirm before build)
- Sync preferences: auto-sync daily / twice daily / manual only
- "Sync Now" for on-demand sync
- Status: green dot with last sync timestamp, or error message with "Reconnect" option

**Gmail:**
- Connect via Google OAuth — compose scope only (create drafts; cannot read inbox or send)
- Connected state shows the CSM's email address to confirm it's the right account
- Required before email trigger feature works (Phase 2); if not connected, email buttons show "Connect Gmail first"

**Admin oversight at ****`/admin/integrations`****:**
- Table of all CSMs and their connection status per integration
- "Force disconnect" option for any CSM
- "Mark as required" toggle per integration per role

---

#### 5.1.6 Sales-to-CS Lifecycle Checklist

The Sales-to-CS process encoded as a per-account checklist on the account overview. Three phases, each with a progress bar. Certain items auto-check when the corresponding action is taken in the platform.

**Pre-Kickoff:** Deal closure email sent · Exec introduction email sent · CSM/CSE assigned · Sales recordings received · Handover doc generated · Intake form completed · Pre-kickoff call done · Kickoff + SOW signed

**Implementation:** Project tracker created · Project tracker shared with customer · Weekly update cadence set · Go-live conducted · Go-live email sent

**Steady State:** Monthly report cadence active · QBR scheduled · Expansion opportunities documented

**Auto-check logic:** Deal closure email sent triggers when the email trigger is used. CSM/CSE assigned triggers when account assignment is saved. Project tracker created triggers when a project is created (Phase 2). This reduces manual checklist maintenance.

**CS Lead view:** Checklist completion % shown across all accounts in the portfolio view — so the CS Lead can see which accounts have handover process gaps.

---

### PHASE 2 — Process and Project Management
**Timeline: 3–4 weeks (after Phase 1) | Owner: Shrikant Iyer + engineering**

Phase 2 adds the workflow and project management layer. By the end of Phase 2, the platform becomes the primary tool for running a customer's implementation — not just tracking account health. CSMs manage the entire implementation lifecycle inside the platform and give customers a live view of progress.

---

#### 5.2.1 Implementation Project Tracker

A structured project workspace per customer: project → phases → milestones → tasks — with a Gantt chart and a shareable client URL.

**Structure:** Each account can have multiple projects (e.g., Phase 1 Implementation, Phase 2 Expansion). Projects contain phases. Phases contain milestones. Milestones contain tasks. Tasks have owners, due dates, and statuses. Task owners can be internal (Zluri team) or labeled "Customer action."

**Gantt view:** Horizontal timeline with planned vs. actual bars per milestone. Drag to adjust dates. Today marker. Bars colour-coded green/amber/red by schedule adherence.

**Project creation wizard:** Account → project name → team (CSM/CSE/AE) → start date and target go-live → template selection.

**Standard template** (pre-populates phases and milestones from the Sales-to-CS process):
- Discovery & Requirements
- Configuration & Integration
- UAT & Testing
- Go-Live

**Global projects list at ****`/projects`****:** All projects visible to current user; filterable by status, go-live window, account; sortable by go-live date and progress.

---

#### 5.2.2 Client-Shareable Project URL

Each project generates a unique URL the customer can open without logging in. They see milestone progress. They cannot edit anything.

- URL: `zluri-csp.app/p/{uuid-token}`
- Shows: project name, overall status and progress %, phases, milestones (only those marked "client visible"), last updated timestamp, CSM contact name
- Does not show: internal task names, owner names, other account data
- Token can be regenerated — old URL immediately returns a 404
- Admin can disable public sharing globally from settings

---

#### 5.2.3 Document Generation (AI-Drafted)

A "Generate Document" button on any account or project page. Claude pre-fills a document from account data, meeting notes, and project status. The CSM edits in a full rich text editor and saves or exports.

**Document types:** Handover Document · Customer Intake Form · Statement of Work (SOW) · Implementation Plan · Meeting Minutes (MoM) · Weekly Executive Update · Phase Completion Report · Monthly Adoption Report · Go-Live Announcement

**Flow:** Select type → Claude generates (< 15 seconds) → edit in full editor → Save to account / Export PDF / Send via email trigger

**Document storage:** All documents stored under the account's Documents tab, alongside Google Drive links.

---

#### 5.2.4 Email Triggers — Gmail Draft Creation

8 email types that CSMs currently write from scratch are triggerable from the relevant screen. Claude drafts the body. The CSM reviews and edits. "Save as Draft" creates the draft in their connected Gmail account. They send it manually.

| Email | Triggered from |
| --- | --- |
| Deal Closure Notification | Account overview |
| Exec Introduction | Account overview |
| Welcome Email | Project → Kickoff milestone |
| Weekly Executive Update | Project detail |
| Meeting Minutes | Note card |
| Phase Completion | Project → phase completion |
| Go-Live Announcement | Project → Go-Live milestone |
| Monthly Adoption Report | Account overview |

**Compose flow:** Trigger → modal with pre-filled To/CC (from account contacts + admin defaults), subject, AI-drafted body → CSM edits → "Save as Draft" → draft in Gmail → toast with "Open in Gmail →" link.

Sending this draft also auto-checks the corresponding lifecycle checklist item (e.g., Deal Closure email sent → checklist item ticked).

---

#### 5.2.5 Google Drive Document Hub

A lightweight per-account repository of Google Drive links. No Drive API or OAuth required — paste-link model.

- Paste a Drive URL → add title → select category
- Categories: Sales Materials · Technical Docs · Implementation Docs · Customer-shared · Other
- Renders as a card with file type icon and "Open in Drive →" link

---

#### 5.2.6 AE Dashboard

Read-only view for Account Executives scoped to their linked accounts.

- AEs log in with Zluri Google account; see a simplified dashboard of their accounts
- Account matching: AE email on account record matches login email
- Can view: account health, implementation status, renewal date, recent notes, project tracker
- Cannot edit anything — enforced at the database level, not just the UI

---

### PHASE 3 — AI Intelligence Layer
**Timeline: 3–4 weeks (after Phase 2) | Owner: Shrikant Iyer + engineering**

Phase 3 leverages the data the platform has accumulated — months of meeting notes, project history, sentiment readings, health trends — and adds the features that make the platform proactively intelligent.

---

#### 5.3.1 AI Global Command Interface (Cmd+K)

Pressing Cmd+K opens a chat interface powered by Claude. CSMs type natural language queries; Claude responds with structured results, filtered account lists, or opens a compose flow. Claude has read access to the current user's portfolio data.

**Example queries:**
- "Which accounts have renewals in 30 days with health score below 60?"
- "Draft a weekly update email for BambooHR based on this week's project status"
- "What were the main blockers from last week's meetings across all my accounts?"
- "Show me accounts where I haven't logged a note in 3 weeks"

Claude proposes actions — it does not write to the database directly.

---

#### 5.3.2 Customer ROI Dashboard

Per-account view of value delivered: license savings, app consolidations identified, shadow IT reduction. The renewal justification artifact that currently doesn't exist. Design happens with the CS Lead before build starts — what "ROI" means in Zluri's context needs definition first.

---

#### 5.3.3 Slack Signal Monitoring

Per-account Slack channel monitoring for early warning signals: going quiet (no messages for X days), escalation keywords, competitor mentions. Detected signals appear as proposed risk signals — same accept/dismiss flow as the Granola AI extraction.

---

#### 5.3.4 Dashboard Builder (Admin)

Admin can create custom dashboards for different audiences using a drag-and-drop widget builder. Dashboards are shareable via a unique URL. Available widgets: My Tasks, Renewals, High Risk, Health Distribution, AI Signals, Portfolio Stats, Project Status, Activity Feed.

---

#### 5.3.5 Gamma QBR Deck Integration

"Generate QBR Deck" passes account data to a pre-built Gamma template and returns a shareable deck URL stored in the account's Documents tab. Requires Gamma API access and a production-ready QBR template designed in Gamma first.

---

#### 5.3.6 Automated Granola Sync

Replace the manual "Sync Now" trigger with a nightly automated sync per connected CSM. Per-CSM opt-out available. Admin dashboard shows sync health: last run, records synced, errors.

---

## 6. SELF-SERVE SETTINGS ARCHITECTURE

### CSM-configurable (no admin needed)

| Setting | Location |
| --- | --- |
| Granola: connect, disconnect, sync frequency | Settings → Integrations |
| Gmail: connect, disconnect | Settings → Integrations |
| Slack: connect, configure channels | Settings → Integrations |
| Email template subject and body (within admin guardrails) | Settings → Email Templates |
| Default account list filters | Settings → Preferences |
| Personal timezone | Settings → Profile |

### Admin-only

| Setting | Location |
| --- | --- |
| User management and role assignment | Admin → Users |
| Locked email template fields | Admin → Email Templates |
| Global integration enable/disable | Admin → Integrations |
| CSV import | /import |
| Public project tracker on/off | Admin → Settings |
| Audit log | Admin → Audit |

### Guardrails
- CSMs cannot change their own role
- CSMs cannot see or edit other CSMs' account data (database-level enforcement via Row Level Security)
- CSMs cannot modify admin-locked template fields
- CSMs cannot disable integrations marked required by admin

---

## 7. NAVIGATION AND INFORMATION ARCHITECTURE

### Sidebar
```
Dashboard             ← Work queue view
Accounts              ← Account list and detail
Projects              ← Global project tracker (Phase 2)
────────────────
[Ask Claude... ⌘K]   ← AI command interface (Phase 3)
────────────────
Settings
  Profile
  Integrations        ← Per-CSM tool connections
  Email Templates     ← Template customisation (Phase 2)
  Preferences
Admin (admin only)
  Users
  Integrations
  Settings
  Audit Log
```

### Account detail tabs
```
Overview     ← Health, sentiment, lifecycle, risk signals, checklist
Contacts     ← Customer stakeholders
Projects     ← Implementation projects (Phase 2)
Documents    ← Generated docs + Drive links (Phase 2)
Tasks        ← Tasks and success plans
Notes        ← Meeting notes feed
```

### Routes

| Route | Purpose | Access |
| --- | --- | --- |
| `/dashboard` | Work queue | All |
| `/accounts` | Account list | All |
| `/accounts/[id]/overview` | Account detail — overview | All |
| `/accounts/[id]/tasks` | Tasks and success plans | All |
| `/accounts/[id]/notes` | Meeting notes | All |
| `/projects` | Global project list | All (Phase 2) |
| `/projects/[id]` | Project Gantt and milestones | All (Phase 2) |
| `/p/[token]` | Client-facing project view | Public — no login (Phase 2) |
| `/settings/integrations` | Per-CSM integrations | All |
| `/settings/email-templates` | Email template customisation | All (Phase 2) |
| `/import` | CSV import | Admin only |
| `/admin/users` | User management | Admin only |
| `/admin/integrations` | Integration oversight | Admin only |

---

## 8. DATA MODEL

### Phase 1 tables

**`profiles`** — one row per CSP user; linked to Supabase Auth
```
id, email, full_name, role (admin/member/viewer/ae), timezone
```

**`accounts`** — one row per customer account
```
id, org_id (stable dedup key for CSV imports),
name, domain, arr, renewal_date, contract_type, csm_id,
sentiment (high_risk/some_risk/good), lifecycle_stage TEXT[],
health_score_override, computed_health_score, health_score_last_computed,
exec_engagement, renewal_stage, risk_signals TEXT[],
ae_name, ae_email, go_live_date,
product_usage_active_users, product_usage_licensed_users, product_usage_snapshot_date
```

**`contacts`** — customer stakeholders per account
```
id, account_id, name, email, role, is_primary
```

**`tasks`** — tasks linked to accounts; optionally to success plans or project milestones
```
id, account_id, title, description, due_date, status,
owner_id, plan_id, source (manual/ai), project_milestone_id, client_visible
```

**`success_plans`** — grouping layer above tasks
```
id, account_id, name, description, status, owner_id, due_date
```

**`meeting_notes`** — synced from Granola or added manually
```
id, account_id, title, content, meeting_date,
source (manual/granola), external_id (Granola dedup key),
sentiment_hint, sentiment_confirmed, ai_summary, action_items_processed
```

**`csm_integrations`** — per-CSM tool connections (credentials encrypted at rest)
```
id, user_id, granola_connected, granola_credentials (encrypted),
granola_sync_enabled, granola_sync_frequency, granola_last_synced_at,
gmail_connected, gmail_credentials (encrypted), slack_connected
```

**`sentiment_history`** — time series of per-account sentiment readings
```
id, account_id, note_id, date, value (positive/neutral/negative), confirmed_by
```

**`proposed_risk_signals`** — AI-suggested signals awaiting CSM review
```
id, account_id, note_id, signal_text, severity_hint,
status (pending/accepted/dismissed)
```

**`dashboard_signals`** — pre-computed daily signals for the dashboard strip
```
id, user_id, account_id, signal_type, signal_text, computed_at, dismissed_at
```

**`account_lifecycle_checklist`** — one row per account; tracks Sales-to-CS process steps
```
id, account_id,
deal_closure_email_sent, exec_intro_email_sent, csm_cse_assigned,
recordings_received, handover_doc_generated, intake_form_completed,
pre_kickoff_done, kickoff_done, impl_plan_prepared,
project_tracker_created, project_tracker_shared, weekly_updates_set,
go_live_conducted, go_live_email_sent,
monthly_reports_set, qbr_scheduled, expansion_documented
```

**`import_logs`** — record of each CSV import
```
id, imported_by, type, total_rows, inserted, updated, errors JSONB
```

### Phase 2 tables

**`projects`** — implementation project linked to one account
```
id, account_id, name, status, csm_id, cse_id,
ae_name, ae_email, start_date, target_go_live_date, actual_go_live_date,
public_token UUID, public_sharing_enabled
```

**`project_phases`** — ordered phases within a project
```
id, project_id, name, order_index, status, start_date, end_date, actual_end_date
```

**`project_milestones`** — deliverables within a phase
```
id, phase_id, name, description, owner_id, owner_type (internal/customer),
due_date, completed_date, status, client_visible
```

**`documents`** — AI-generated or manually created documents
```
id, account_id, project_id, type, title, content (Markdown),
status (draft/final/sent), generated_by
```

**`drive_links`** — Google Drive links per account
```
id, account_id, url, title, category, added_by
```

**`email_log`** — record of Gmail drafts created via the platform
```
id, account_id, project_id, type, recipients JSONB,
subject, gmail_draft_id, status, triggered_by
```

---

## 9. TECHNICAL STACK

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14+ (App Router), React, TypeScript |
| Styling | Tailwind CSS + shadcn/ui (themed to Zluri brand) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth — Google OAuth, @zluri.com restriction |
| AI | Anthropic Claude API — server-side only |
| Deployment | Vercel — functions + Cron jobs |
| Email | Gmail API — compose scope only (per-CSM OAuth) |
| Meeting sync | Granola API — per-CSM credentials |
| Credential encryption | Supabase Vault (pgsodium) |

### AI model selection

| Use case | Model | Reason |
| --- | --- | --- |
| Meeting note extraction | claude-haiku-4-5 | High frequency; needs to be fast |
| Complex document generation | claude-opus-4-6 | Quality matters; lower frequency |
| Email draft generation | claude-haiku-4-5 | Streamed in real time |
| AI command interface (Phase 3) | claude-opus-4-6 | Analytical queries across portfolio |

### Security
- All credentials (Granola API keys, Gmail OAuth tokens) encrypted at rest via Supabase Vault — never stored in plaintext
- Gmail: compose scope only; cannot read inbox or send emails
- Public project URLs: UUID token (not guessable); rate-limited at 10 requests/minute per IP
- Role enforcement: both application layer (middleware) and database layer (Row Level Security). Database is the final authority.
- Sign-in: @zluri.com Google accounts only

---

## 10. SUCCESS METRICS

### Phase 1 — measured 4 weeks after launch

| Metric | Target |
| --- | --- |
| % of CSMs with Granola connected | > 80% |
| % of meeting notes where at least one AI task suggestion was accepted | > 50% |
| % of accounts with a computed health score | > 70% |
| Daily active users / total CS team headcount | > 60% |

### Phase 2 — measured 4 weeks after launch

| Metric | Target |
| --- | --- |
| % of implementation-phase accounts with an active project tracker | > 70% |
| % of weekly exec updates sent via platform vs. manual | > 40% |
| % of accounts with lifecycle checklist > 80% complete | > 60% |

### Phase 3 — measured 6 weeks after launch

| Metric | Target |
| --- | --- |
| % of CSMs using AI command interface weekly | > 50% |
| Time from deal closure to Handover Document generated | < 24 hours |

---

## 11. OUT OF SCOPE — THIS RELEASE

- ChurnZero replacement (it stays; this supplements it)
- Jira integration
- Salesforce CRM sync
- Gmail inbox monitoring or read access
- Automated email sending (drafts only — CSMs send manually)
- Mobile app or mobile-optimised layout
- Multi-language support
- External product launch (internal tool; strategic question revisited at 6 months)
- Billing or subscription management

---

## 12. OPEN QUESTIONS

### Before Phase 1 starts
1. **Health score formula** — CS Lead needs to review and approve the 40/30/20/10 weighting. Is product adoption genuinely 2× more important than sentiment?
2. **Product usage CSV format** — what columns does the Zluri internal data export produce? Needed before the health score import can be designed.
3. **Granola access model** — OAuth or API key only? Affects the integrations settings flow.

### Before Phase 2 starts
4. **Locked email template fields** — which CC recipients or fields must CSops control? Needed before email template settings are built.
5. **Client-facing tracker visibility** — what is Zluri comfortable showing customers? Task names? Owner names? Dates? Needs CS Lead + legal sign-off.
6. **Project template phases** — do Discovery → Config → UAT → Go-Live match how CSMs actually run implementations? Validate with 2–3 CSMs before building.

### Before Phase 3 starts
7. **ROI dashboard definition** — what does "value delivered" mean in Zluri's context? What metrics constitute customer ROI?
8. **Internal tool vs. product** — is leadership ready to revisit the strategic question of whether this becomes a product Zluri sells externally?
