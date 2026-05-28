# Zluri Customer Success Platform — Technical Architecture Document
**Version:** 2.0
**Date:** 2026-03-26
**Status:** For CTO Review and Approval
**Owner:** Shrikaant Iyer, CS Operations
**Phase scope:** Phase 1 only — ChurnZero Supplement + Account Intelligence
**Companion document:** PRD-v2.md, Phase1-Feature-Spec-v2.md

---

## How to read this document

This document explains how the platform is built — the technology choices, the data design, the security model, and how the pieces connect. It's written in two layers. Plain language sections explain what something is and why we made a particular choice. Technical sections have the specific implementation details for engineering review and handoff.

If you're reviewing this for CTO sign-off, focus on Sections 1–4 (overview, stack, data model, security). If you're handing this to an engineer to set up infrastructure or review a specific subsystem, the full document applies.

---

## TABLE OF CONTENTS

1. System Overview
2. Technology Stack
3. Architecture Overview
4. Data Model — Phase 1
5. Authentication and Security
6. API Layer
7. AI Pipeline (Granola → Claude → Proposed Actions)
8. Health Score Computation
9. Per-CSM Integration Settings
10. Background Jobs
11. Dashboard Signals
12. Deployment and Environment
13. What's Deferred to Phase 2
14. Open Technical Decisions

---

## 1. SYSTEM OVERVIEW

### In plain language

This platform sits alongside ChurnZero, not instead of it. ChurnZero handles account tracking, renewal alerts, and health dashboards reasonably well. This platform does the things ChurnZero fundamentally cannot: read Granola meeting transcripts and turn them into tasks, compute health scores from real product usage data, track the Sales-to-CS handover process per account, and give CSMs a unified work queue they open in the morning to see exactly what needs their attention.

Phase 1 focuses on the account management foundation and the AI meeting intelligence pipeline. Phases 2 and 3 (email drafting, document generation, client-facing project tracker) depend on Phase 1 being solid and trusted.

### Who uses it

| Role | How many | What they do in the platform |
| --- | --- | --- |
| CSM | 8–10 | Daily use: accounts, tasks, notes, dashboard |
| CSE (technical CSM) | 4–6 | Project tracking, technical tasks |
| CS Lead / CS Ops | 2–3 | Portfolio view, CSM assignments, admin settings |
| Admin | 1–2 | User management, data imports, app config |
| AE (viewer, read-only) | 5–10 | Account context and status — no writes |

### Operational expectations (internal tool)

- **Availability:** Best-effort — no formal SLA. Acceptable brief downtime during off-hours maintenance.
- **Data safety:** Zero tolerance for data loss. Supabase maintains automated daily backups (point-in-time recovery available on Pro plan).
- **Performance:** Standard page loads under 500ms. AI-powered operations (Granola sync, health score compute) run as background jobs — results appear within minutes, not seconds.

---

## 2. TECHNOLOGY STACK

### In plain language

The platform is built on four technology layers. You don't need to choose or configure any of them from scratch — these are the industry-standard tools for this type of application, and they're chosen because they have the least operational overhead for a small team and a solo builder.

| Layer | Tool | What it does | Why this one |
| --- | --- | --- | --- |
| **Frontend + API** | Next.js 14+ | The web app — everything the browser sees, plus the server-side API routes | Industry standard; handles both frontend and backend in one project |
| **Database + Auth** | Supabase | PostgreSQL database, user login (Google OAuth), credential storage | Managed — no database server to run; built-in auth and row-level security |
| **AI** | Anthropic Claude API | Reads meeting transcripts; extracts action items and risk signals | Best-in-class for structured text extraction; server-side only |
| **Hosting** | Vercel | Deploys the Next.js app and runs scheduled jobs | Zero-config deployment; native Next.js support |

### Language and tooling

- **TypeScript** throughout — catches type errors before they become runtime bugs
- **Tailwind CSS** — utility-first styling, no separate stylesheet to maintain
- **shadcn/ui** — pre-built, accessible UI components (tables, dialogs, forms, toasts)
- **react-hook-form + zod** — form handling and schema validation
- **SWR** — client-side data fetching with automatic cache invalidation

---

## 3. ARCHITECTURE OVERVIEW

### In plain language

When a CSM opens the platform, here's what happens:

1. Their browser requests the page from Vercel
2. Vercel's middleware checks: are they logged in? Do they have an `@zluri.com` email? What's their role?
3. If all three pass, the page loads — server components fetch data directly from Supabase and render the page before it reaches the browser
4. When a CSM edits an account or adds a note, the browser calls a route handler (`/api/...`) which validates the input, checks permissions, and writes to the database
5. AI operations (syncing Granola, computing health scores) don't block the page — they queue a job, which runs in the background and updates the database when complete

```
Browser (CSM/AE)
   │
   ▼
Vercel Edge — Middleware
   │  • Refresh Supabase session
   │  • Redirect unauthenticated → /login
   │  • Block non-@zluri.com accounts
   │  • Role guard: admin-only routes checked via JWT claim
   ▼
Next.js App (Vercel)
   ├── React Server Components  ←──── reads Supabase directly (server-side)
   └── Route Handlers (/api/*)  ←──── handles all writes + AI operations
          │
          ▼
       Supabase
       ├── PostgreSQL + RLS (Row Level Security)
       ├── GoTrue (Google OAuth)
       └── Vault (pgsodium — credential encryption)
          │
          ├──▶ Anthropic Claude API  (server-side only; never client-side)
          ├──▶ Granola API           (server-side only)
          └──▶ Google Gmail API      (server-side only; compose scope only)
          │
          ▼
       Vercel Cron
       └── /api/cron/health-score  (nightly)
       └── /api/cron/process-sync-jobs  (every 5 minutes)
```

### Key architectural decisions

**All writes go through API route handlers, never direct from the browser.**
Direct browser-to-Supabase writes would bypass server-side validation. All mutations go through `/api/*` routes which validate input, enforce authorization, and handle errors cleanly.

**AI calls are server-side only.**
The Anthropic API key never leaves the server. Claude is called from route handlers and cron jobs only — never from browser-side code.

**Long-running operations are async jobs.**
Granola sync, health score computation, and (in Phase 2) document generation all write a job record to `sync_jobs`, return immediately to the browser, and complete in the background. This prevents HTTP timeouts and gives the user a consistent experience.

**Row Level Security (RLS) is the authorization floor.**
Even if an API route has a bug, the database-level RLS policies prevent a CSM from reading another CSM's accounts, or a viewer from writing records. Defense in depth.

---

## 4. DATA MODEL — PHASE 1

### In plain language

The database has 12 tables in Phase 1. Most of them are straightforward: accounts, contacts, tasks, notes. A few are less obvious and worth explaining in plain language:

- **`sync_jobs`** — a job queue table. When Granola sync is triggered, we insert a row here instead of doing the sync immediately. A background worker picks it up, does the sync, and updates the row with the result. This prevents the UI from hanging on a slow HTTP call.
- **`proposed_risk_signals`** — when Claude reads a meeting note and detects a risk signal ("customer mentioned they might not renew"), it doesn't write directly to the account. It writes a *proposal* here. The CSM reviews it and decides whether to accept, edit, or dismiss. Nothing is silently written.
- **`sentiment_history`** — instead of storing sentiment as a single value on the account, we track it over time. Each confirmed sentiment reading from a meeting note gets a row here. This is what powers the sentiment trend component of the health score.
- **`dashboard_signals`** — pre-computed items for the work queue dashboard. A nightly job runs and writes one row per signal per CSM. The dashboard reads this table instead of computing everything fresh on page load.
- **`account_lifecycle_checklist`** — 18 boolean columns, one per step in the Sales-to-CS handover process. One row per account. Steps auto-tick when the corresponding action is taken in the platform.
- **`csm_integrations`** — one row per CSM with their Granola API key and Gmail OAuth tokens, encrypted at rest via Supabase Vault.

### Entity relationships

```
profiles (1) ──< accounts (via csm_id)
accounts (1) ──< contacts
accounts (1) ──< tasks
accounts (1) ──< meeting_notes
accounts (1) ──< success_plans ──< tasks (via plan_id)
accounts (1) ── account_integrations (1)
accounts (1) ── account_lifecycle_checklist (1)
accounts (1) ──< proposed_risk_signals
meeting_notes (1) ──< proposed_risk_signals (via note_id)
meeting_notes (1) ──< sentiment_history (via note_id)
profiles (1) ── csm_integrations (1)
profiles (1) ──< dashboard_signals (via user_id)
sync_jobs (standalone — references user_id)
import_logs (standalone audit table)
```

### Table Reference

---

#### `profiles`
Automatically created when a user first signs in via Google OAuth.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK — matches `auth.users.id` |
| email | TEXT | From Google OAuth |
| full_name | TEXT | From Google OAuth |
| role | TEXT | admin / member / viewer / ae |
| avatar_url | TEXT | Google profile photo |
| created_at | TIMESTAMPTZ |  |

**RLS:** Each user can read their own row. Admins can read and update all rows (for role assignment).

---

#### `accounts`
Core entity. One row per customer account.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| org_id | TEXT UNIQUE NOT NULL | Stable dedup key — ChurnZero ID on import; never changes |
| name | TEXT NOT NULL |  |
| arr | NUMERIC | Annual Recurring Revenue |
| renewal_date | DATE |  |
| contract_type | TEXT |  |
| csm_id | UUID | FK → profiles |
| ae_name | TEXT | AE may not be a platform user |
| ae_email | TEXT |  |
| go_live_date | DATE |  |
| contract_signed_date | DATE |  |
| health_score | INTEGER | CSM manual override (0–100); nullable |
| computed_health_score | INTEGER | System-computed; see Section 8 |
| health_score_last_computed | TIMESTAMPTZ | When computed_health_score was last updated |
| sentiment | TEXT | high_risk / some_risk / good |
| lifecycle_stage | TEXT[] | Array — multiple stages can apply simultaneously |
| exec_engagement | TEXT | 7-option enum (see Feature Spec) |
| renewal_stage | TEXT |  |
| risk_signals | TEXT[] | Current active risk tags |
| product_usage_active_users | INTEGER | From product data CSV import |
| product_usage_licensed_users | INTEGER | From product data CSV import |
| product_usage_snapshot_date | DATE | When product data was last imported |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ | Auto-updated by DB trigger |

**Critical constraint:** `org_id` is the upsert key for all CSV imports and future agent syncs. Every import uses `INSERT ... ON CONFLICT (org_id) DO UPDATE`. Never allow `org_id` to be changed via the UI after creation.

**`lifecycle_stage`**** type note:** Stored as `TEXT[]` (PostgreSQL array). Previous versions incorrectly used a `TEXT CHECK` constraint, which breaks on multi-value input. Use `TEXT[]` in the migration.

**RLS:**
- Admin: full read/write on all rows
- Member: SELECT / UPDATE / INSERT on rows where `csm_id = auth.uid()`
- Viewer / AE: SELECT only (all rows visible unless admin restricts)

---

#### `contacts`
People associated with an account.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| name | TEXT |  |
| email | TEXT |  |
| role | TEXT | Champion / Executive Sponsor / Admin / End User / etc |
| is_primary | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

**RLS:** Follows account's RLS — CSMs can only manage contacts for their assigned accounts.

---

#### `tasks`
Action items — standalone, attached to a success plan, or extracted by AI.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| title | TEXT NOT NULL |  |
| description | TEXT |  |
| due_date | DATE |  |
| status | TEXT | todo / in_progress / done / cancelled |
| owner_id | UUID | FK → profiles |
| plan_id | UUID | FK → success_plans (nullable) |
| source | TEXT | manual / ai (default: manual) |
| source_note_id | UUID | FK → meeting_notes — set when source = 'ai' |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

**Note on AI tasks:** When Claude extracts action items from a meeting note, they first become rows in `proposed_tasks` (not `tasks`). Only when the CSM clicks "Accept" does a row get inserted into `tasks` with `source = 'ai'`. See Section 7.

---

#### `success_plans`
Named groupings of tasks with a goal and deadline.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| name | TEXT NOT NULL |  |
| status | TEXT | active / completed / paused |
| owner_id | UUID | FK → profiles |
| due_date | DATE |  |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `meeting_notes`
Notes from customer calls — manually entered or synced from Granola.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| title | TEXT |  |
| content | TEXT | Full note / transcript content |
| meeting_date | DATE |  |
| source | TEXT | manual / granola |
| external_id | TEXT | Granola document ID — used for dedup |
| sentiment_hint | TEXT | positive / neutral / negative — set by Claude, unconfirmed |
| sentiment_confirmed | BOOLEAN | Default false — set true when CSM confirms |
| action_items_processed | BOOLEAN | Default false — set true when AI proposals have been created |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

**Critical constraint:**
```sql
CREATE UNIQUE INDEX meeting_notes_external_id_idx
  ON meeting_notes (external_id)
  WHERE external_id IS NOT NULL;
```
This prevents the same Granola document from being imported twice if a sync job runs more than once for the same meeting.

---

#### `proposed_tasks`
AI-extracted action items awaiting CSM review. Never shown to customers. Never surface in the tasks table without explicit CSM acceptance.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| note_id | UUID | FK → meeting_notes |
| title | TEXT | Extracted task title |
| description | TEXT | Context from the transcript |
| due_date | DATE | Claude's estimate (nullable) |
| status | TEXT | pending / accepted / edited / dismissed |
| accepted_task_id | UUID | FK → tasks — set when accepted |
| created_at | TIMESTAMPTZ |  |

**RLS:** Only the assigned CSM can see or action proposals for their accounts.

---

#### `proposed_risk_signals`
AI-detected risk signals from meeting notes, awaiting CSM confirmation before they affect the account.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| note_id | UUID | FK → meeting_notes |
| signal_text | TEXT | Human-readable risk description |
| severity_hint | TEXT | low / medium / high |
| status | TEXT | pending / accepted / dismissed |
| created_at | TIMESTAMPTZ |  |

---

#### `sentiment_history`
Time-series record of meeting sentiment. Used to compute the sentiment trend component of the health score.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| note_id | UUID | FK → meeting_notes |
| date | DATE | Meeting date |
| value | TEXT | positive / neutral / negative |
| confirmed_by | UUID | FK → profiles — set when CSM confirms |
| created_at | TIMESTAMPTZ |  |

---

#### `account_lifecycle_checklist`
One row per account. 18 boolean columns tracking completion of each Sales-to-CS handover step.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts UNIQUE |
| deal_closure_email_sent | BOOLEAN | Default false |
| exec_intro_email_sent | BOOLEAN | Default false |
| csm_cse_assigned | BOOLEAN | Default false |
| recordings_received | BOOLEAN | Default false |
| handover_doc_generated | BOOLEAN | Default false |
| intake_form_completed | BOOLEAN | Default false |
| pre_kickoff_alignment_done | BOOLEAN | Default false |
| pre_kickoff_customer_call_done | BOOLEAN | Default false |
| impl_plan_prepared | BOOLEAN | Default false |
| kickoff_done | BOOLEAN | Default false |
| project_tracker_created | BOOLEAN | Default false |
| project_tracker_shared | BOOLEAN | Default false |
| weekly_updates_cadence_set | BOOLEAN | Default false |
| go_live_conducted | BOOLEAN | Default false |
| go_live_email_sent | BOOLEAN | Default false |
| monthly_reports_cadence_set | BOOLEAN | Default false |
| qbr_scheduled | BOOLEAN | Default false |
| expansion_opportunities_documented | BOOLEAN | Default false |
| updated_at | TIMESTAMPTZ |  |

**Auto-creation trigger:**
```sql
CREATE OR REPLACE FUNCTION create_lifecycle_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO account_lifecycle_checklist (account_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_account_insert
  AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION create_lifecycle_checklist();
```

---

#### `account_integrations`
Per-account mapping to external identifiers (Granola folder, email domain, Slack channel).

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts UNIQUE |
| email_domain | TEXT | Used to match Granola meetings to this account |
| granola_folder_id | TEXT | Phase 2 — reserved |
| slack_channel_id | TEXT | Phase 2 — reserved |
| jira_project_key | TEXT | Phase 2 — reserved |
| granola_last_synced_at | TIMESTAMPTZ | Updated after each successful sync |
| updated_at | TIMESTAMPTZ |  |

**Phase 1 use:** Only `email_domain` is actively used in Phase 1 for Granola meeting-to-account matching. The other columns are populated manually and sit ready for Phase 2 agents.

---

#### `csm_integrations`
Per-CSM credentials for Granola and Gmail. Encrypted at rest.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| user_id | UUID | FK → profiles UNIQUE |
| granola_connected | BOOLEAN | Default false |
| granola_api_key_enc | TEXT | Encrypted via Supabase Vault (pgsodium) |
| granola_sync_enabled | BOOLEAN | Default true |
| granola_sync_frequency | TEXT | daily / manual |
| granola_last_synced_at | TIMESTAMPTZ |  |
| gmail_connected | BOOLEAN | Default false |
| gmail_access_token_enc | TEXT | Encrypted |
| gmail_refresh_token_enc | TEXT | Encrypted |
| gmail_token_expiry | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

**Security invariant:** Encrypted columns are NEVER returned to the client. Route handlers decrypt server-side, use the token for an API call, and return only the result. If an engineer adds a select that returns `granola_api_key_enc` to the browser, that is a security bug.

---

#### `sync_jobs`
Job queue for all async operations. See Section 10.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| type | TEXT | granola_sync / health_score_compute |
| status | TEXT | queued / running / completed / failed / dead |
| user_id | UUID | FK → profiles |
| account_id | UUID | FK → accounts (nullable — for account-scoped jobs) |
| payload | JSONB | Input parameters for the job |
| result | JSONB | Output or structured error details |
| attempts | INTEGER | Default 0 |
| max_attempts | INTEGER | Default 3 |
| queued_at | TIMESTAMPTZ |  |
| started_at | TIMESTAMPTZ |  |
| completed_at | TIMESTAMPTZ |  |
| error | TEXT | Last error message |

---

#### `dashboard_signals`
Pre-computed work queue items for each CSM. See Section 11.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| user_id | UUID | FK → profiles |
| account_id | UUID | FK → accounts |
| signal_type | TEXT | overdue_task / renewal_30 / renewal_60 / renewal_90 / high_risk / no_meeting_14d / no_meeting_30d |
| signal_text | TEXT | Human-readable description |
| metadata | JSONB | Signal-specific data (task id, renewal date, etc.) |
| computed_at | TIMESTAMPTZ | When the signal was generated |
| dismissed_at | TIMESTAMPTZ | Nullable — set when CSM dismisses a signal |

---

#### `import_logs`
Audit trail for all CSV import operations.

| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| imported_by | UUID | FK → profiles |
| import_type | TEXT | churnzero_accounts / product_usage |
| total_rows | INTEGER |  |
| inserted_rows | INTEGER |  |
| updated_rows | INTEGER |  |
| error_rows | INTEGER |  |
| errors | JSONB | Array of {row, field, message} objects |
| created_at | TIMESTAMPTZ |  |

---

### Database triggers

**Auto-create ****`profiles`**** on new auth user:**
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**Auto-update ****`updated_at`**** on all tables:**
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Apply to: accounts, contacts, tasks, success_plans, meeting_notes,
--           account_integrations, account_lifecycle_checklist, csm_integrations
```

---

## 5. AUTHENTICATION AND SECURITY

### In plain language

Users sign in with their `@zluri.com` Google account. The platform does not have its own username/password system. After sign-in, the session is maintained by Supabase and checked on every page load.

Security is enforced in three layers:

1. **Middleware** — the first gate. Every request is checked before the page renders. Non-Zluri emails are blocked here.
2. **Route handlers** — the second gate. API routes check whether the authenticated user has the right to perform the requested operation.
3. **Row Level Security (RLS)** — the third gate. Even if layers 1 and 2 have bugs, the database itself will refuse to return or modify data the user doesn't own.

This is defense in depth. A bug at any one layer is caught by the other two.

### Middleware (`src/middleware.ts`)

Runs on every request before the page renders.

```typescript
export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Refresh Supabase session (maintains auth across tab reloads)
  const supabase = createServerClient(/* ... */);
  const { data: { session } } = await supabase.auth.getSession();

  // 2. Unauthenticated → login
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Non-Zluri email → sign out and redirect
  if (!session.user.email?.endsWith('@zluri.com')) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/login?error=domain', request.url));
  }

  // 4. Admin-only routes: check JWT claim (role embedded at sign-in)
  const role = session.user.user_metadata?.role ?? 'member';
  const adminRoutes = ['/admin', '/import'];
  if (adminRoutes.some(r => request.nextUrl.pathname.startsWith(r)) && role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}
```

**Role as JWT claim (not a live DB lookup):** The user's role is stored in `user_metadata` at sign-in time and embedded in the JWT. Middleware reads the JWT — no database round-trip per request. When an admin changes a user's role, the change takes effect on next sign-in (or can be forced via `supabase.auth.admin.updateUserById`).

### RLS policy reference (Phase 1)

**`accounts`****:**
```sql
-- Admin: all
CREATE POLICY "admin_all" ON accounts FOR ALL USING (
  (auth.jwt() ->> 'role') = 'admin'
);
-- Member: own accounts only
CREATE POLICY "member_own" ON accounts FOR ALL USING (
  csm_id = auth.uid() AND (auth.jwt() ->> 'role') = 'member'
);
-- Viewer/AE: read-only
CREATE POLICY "viewer_read" ON accounts FOR SELECT USING (
  (auth.jwt() ->> 'role') IN ('viewer', 'ae')
);
```

**Pattern repeated on:** `contacts`, `tasks`, `success_plans`, `meeting_notes`, `proposed_tasks`, `proposed_risk_signals`, `sentiment_history`, `account_lifecycle_checklist`, `account_integrations`

**`csm_integrations`****:** A CSM can only read/write their own row. Admins can read all (no access to encrypted credential columns).

**`sync_jobs`****, ****`import_logs`****:** Admin only (admins can see all jobs; CSMs cannot).

**`dashboard_signals`****:** Each CSM can only read their own signals.

### Input validation

All write routes use **Zod schemas** to validate request bodies server-side before touching the database. Validation errors return `400` with structured error details. No write route assumes the input is safe.

```typescript
// Example: account update validation
const accountUpdateSchema = z.object({
  health_score: z.number().int().min(0).max(100).nullable().optional(),
  sentiment: z.enum(['high_risk', 'some_risk', 'good']).optional(),
  lifecycle_stage: z.array(z.string()).max(5).optional(),
  renewal_stage: z.string().max(100).optional(),
  risk_signals: z.array(z.string()).max(20).optional(),
});
```

---

## 6. API LAYER

### In plain language

All data mutations in the platform go through API routes — not direct database calls from the browser. This keeps validation, authorization, and error handling in one place.

### Phase 1 route inventory

**Accounts**
```
GET    /api/accounts                     List accounts (with search/filter params)
GET    /api/accounts/[id]                Single account with related data
PATCH  /api/accounts/[id]                Update account fields
POST   /api/accounts                     Create new account (admin/member)
```

**Contacts**
```
GET    /api/accounts/[id]/contacts       List contacts for an account
POST   /api/accounts/[id]/contacts       Add contact
PATCH  /api/contacts/[id]                Update contact
DELETE /api/contacts/[id]                Delete contact
```

**Tasks**
```
GET    /api/accounts/[id]/tasks          List tasks for an account
POST   /api/accounts/[id]/tasks          Create task
PATCH  /api/tasks/[id]                   Update task (status, due date, owner)
DELETE /api/tasks/[id]                   Delete task
```

**Success plans**
```
GET    /api/accounts/[id]/plans          List plans for an account
POST   /api/accounts/[id]/plans          Create plan
PATCH  /api/plans/[id]                   Update plan
DELETE /api/plans/[id]                   Delete plan
```

**Meeting notes**
```
GET    /api/accounts/[id]/notes          List notes for an account
POST   /api/accounts/[id]/notes          Add note (manual)
PATCH  /api/notes/[id]                   Edit note
DELETE /api/notes/[id]                   Delete note
POST   /api/notes/[id]/analyze           Trigger Claude analysis on a note
```

**AI proposals**
```
GET    /api/accounts/[id]/proposals      Get pending proposed tasks + risk signals
POST   /api/proposals/tasks/[id]/accept  Accept a proposed task → creates tasks row
POST   /api/proposals/tasks/[id]/dismiss Dismiss a proposed task
POST   /api/proposals/risks/[id]/accept  Accept a proposed risk signal → merges into account
POST   /api/proposals/risks/[id]/dismiss Dismiss a proposed risk signal
```

**Lifecycle checklist**
```
GET    /api/accounts/[id]/checklist      Get checklist for an account
PATCH  /api/accounts/[id]/checklist      Update one or more checklist items
```

**Health score**
```
POST   /api/accounts/[id]/health/compute  Trigger health score recompute (queues a job)
```

**Integrations (per-CSM)**
```
GET    /api/integrations/me              Get current CSM's integration status (no tokens)
POST   /api/integrations/granola/connect Save Granola API key (encrypted via Vault)
DELETE /api/integrations/granola         Disconnect Granola
POST   /api/integrations/granola/sync    Trigger manual Granola sync (queues a job)
GET    /api/integrations/gmail/oauth     Start Gmail OAuth flow
GET    /api/integrations/gmail/callback  Complete Gmail OAuth, save tokens
DELETE /api/integrations/gmail           Disconnect Gmail
```

**Import**
```
POST   /api/import/accounts              Import ChurnZero CSV (admin only)
POST   /api/import/usage                 Import product usage CSV (admin only)
GET    /api/import/logs                  List recent import logs (admin only)
```

**Cron (internal — not user-facing)**
```
POST   /api/cron/health-score            Nightly health score recompute for all accounts
POST   /api/cron/process-sync-jobs       Every 5 min — process queued sync_jobs
POST   /api/cron/dashboard-signals       Nightly — recompute dashboard_signals
```

### Route handler pattern

```typescript
// src/app/api/accounts/[id]/route.ts
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  // 1. Authenticate
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // 2. Validate input
  const body = await request.json();
  const result = accountUpdateSchema.safeParse(body);
  if (!result.success) return Response.json({ error: result.error.flatten() }, { status: 400 });

  // 3. Write (RLS handles account ownership check at DB level)
  const { data, error } = await supabase
    .from('accounts')
    .update(result.data)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(data);
}
```

---

## 7. AI PIPELINE (GRANOLA → CLAUDE → PROPOSED ACTIONS)

### In plain language

When a CSM connects their Granola account, the platform can pull in their meeting transcripts. A CSM clicks "Sync Granola" — a background job runs, fetches their recent meetings from Granola, finds the ones that match accounts in the platform (matched by the account's email domain), and stores them as meeting notes.

Then Claude reads each new note. It produces three things:
1. **Proposed tasks** — action items mentioned in the meeting ("Customer will send their SSO config by Friday" → proposed task with CSM/customer ownership, estimated due date)
2. **A risk signal** — if the meeting content suggests risk ("they said they're evaluating alternatives"), Claude flags it with severity and a description
3. **A sentiment reading** — positive, neutral, or negative, based on the overall tone

None of these are written directly to the account. Each one appears in a review panel where the CSM can accept, edit, or dismiss. Only accepted items affect the account's tasks, risk signals, and sentiment history.

### Granola sync flow

```
1. CSM triggers sync (manual button or nightly cron)
       │
       ▼
2. INSERT INTO sync_jobs { type: 'granola_sync', user_id, status: 'queued' }
   → Return immediately to browser ("Sync started — check back in a moment")
       │
       ▼
3. /api/cron/process-sync-jobs (runs every 5 min via Vercel Cron)
   → Picks up queued jobs WHERE attempts < max_attempts
   → Marks job as 'running'
       │
       ▼
4. Fetch Granola API key from csm_integrations (decrypt server-side)
   → Call Granola API: GET /meetings?since={last_synced_at}
       │
       ▼
5. For each meeting returned:
   a. Check if external_id already exists in meeting_notes → skip if yes (dedup)
   b. Find matching account:
      - Check attendee email domains against account_integrations.email_domain
      - If match found → account_id confirmed
      - If no match → log to sync job result as 'unmatched'; skip
   c. INSERT INTO meeting_notes { source: 'granola', external_id, account_id, ... }
   d. INSERT INTO sync_jobs { type: 'note_analyze', account_id, note_id, status: 'queued' }
       │
       ▼
6. Mark granola_sync job as 'completed'
   UPDATE csm_integrations SET granola_last_synced_at = NOW()
```

### Claude extraction flow

Triggered after a new meeting note is created (from Granola sync or manually). Runs as a queued job.

```typescript
// src/lib/ai/analyze-note.ts

const EXTRACTION_PROMPT = `
You are analyzing a customer success meeting note. Extract the following in JSON:

{
  "proposed_tasks": [
    {
      "title": "Action item description",
      "description": "Context from the meeting",
      "owner_type": "csm | customer | both",
      "due_date": "YYYY-MM-DD or null",
      "confidence": "high | medium | low"
    }
  ],
  "risk_signal": {
    "detected": true | false,
    "signal_text": "Description of the risk",
    "severity": "low | medium | high"
  } | null,
  "sentiment": "positive | neutral | negative",
  "sentiment_rationale": "One sentence explanation"
}

Rules:
- Only extract explicit action items — not vague discussion points
- Risk signal: only flag if there is a clear signal of churn risk, budget pressure, executive disengagement, or competitive evaluation
- If confident there is no risk signal, set risk_signal to null
- Sentiment should reflect the overall account health tone of the meeting, not just the mood

Meeting note content:
{{CONTENT}}
`;

export async function analyzeNote(note: MeetingNote): Promise<ExtractionResult> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',  // Fast + cost-effective for high-frequency extraction
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: EXTRACTION_PROMPT.replace('{{CONTENT}}', note.content)
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text) as ExtractionResult;
}
```

**Model selection rationale:** `claude-haiku-4-5` is used for extraction (high frequency, low latency, lower cost). `claude-opus-4-6` is reserved for document generation in Phase 2 (quality matters more than speed there).

### Proposal storage and acceptance

After extraction:

```typescript
// Store proposed tasks
for (const task of result.proposed_tasks) {
  await supabase.from('proposed_tasks').insert({
    account_id: note.account_id,
    note_id: note.id,
    title: task.title,
    description: task.description,
    due_date: task.due_date,
    status: 'pending'
  });
}

// Store proposed risk signal (if detected)
if (result.risk_signal?.detected) {
  await supabase.from('proposed_risk_signals').insert({
    account_id: note.account_id,
    note_id: note.id,
    signal_text: result.risk_signal.signal_text,
    severity_hint: result.risk_signal.severity,
    status: 'pending'
  });
}

// Store unconfirmed sentiment reading
await supabase.from('meeting_notes').update({
  sentiment_hint: result.sentiment,
  action_items_processed: true
}).eq('id', note.id);
```

When CSM accepts a proposed task:
```typescript
// POST /api/proposals/tasks/[id]/accept
const { data: proposal } = await supabase
  .from('proposed_tasks')
  .select()
  .eq('id', params.id)
  .single();

// Create the real task
const { data: task } = await supabase.from('tasks').insert({
  account_id: proposal.account_id,
  title: proposal.title,
  description: proposal.description,
  due_date: proposal.due_date,
  source: 'ai',
  source_note_id: proposal.note_id,
  status: 'todo',
  owner_id: session.user.id
}).select().single();

// Mark proposal as accepted
await supabase.from('proposed_tasks').update({
  status: 'accepted',
  accepted_task_id: task.id
}).eq('id', params.id);
```

When CSM confirms a sentiment reading:
```typescript
// Clicking "confirm" on the sentiment badge in the note view
await supabase.from('sentiment_history').insert({
  account_id: note.account_id,
  note_id: note.id,
  date: note.meeting_date,
  value: note.sentiment_hint,
  confirmed_by: session.user.id
});
await supabase.from('meeting_notes').update({ sentiment_confirmed: true }).eq('id', note.id);
// Health score recompute is queued automatically after sentiment confirmation
```

---

## 8. HEALTH SCORE COMPUTATION

### In plain language

The health score is a number between 0 and 100. Unlike ChurnZero's score (which is updated manually), this one is computed from actual signals: how many of the customer's licensed users are actively using Zluri, how recent and positive their meeting sentiment has been, how engaged their executive sponsor is, and whether they have active risk signals.

CSMs can override the computed score — but the system-computed score runs independently on a schedule and is always visible alongside the override. A CSM who hasn't updated their override in three weeks will see the computed score updating on its own, showing the true picture.

### Formula

```
Computed Health Score = (
  Adoption Component   × 40%  +
  Sentiment Component  × 30%  +
  Engagement Component × 20%  +
  Risk Penalty         × 10%
)
```

**Adoption Component (0–100)**
```
active_users / licensed_users × 100
```
- Uses `product_usage_active_users / product_usage_licensed_users` from the accounts table
- If no product usage data has been imported, this component is excluded and weights are redistributed:
  `Sentiment × 43% + Engagement × 29% + Risk × 14% + Adoption-missing × 14%` (the 14% goes to a flat 50 value as neutral)

**Sentiment Component (0–100)**
- Looks at the last 90 days of confirmed sentiment history for the account
- `positive = 100`, `neutral = 50`, `negative = 0`
- Weighted average with exponential recency bias (more recent meetings count more)
- If no confirmed sentiment exists: uses `50` (neutral) as the default

**Engagement Component (0–100)**
- Mapped from `exec_engagement` field:
  - Champion engaged + exec sponsor engaged → 100
  - Champion engaged only → 75
  - Meeting with exec recently → 60
  - No exec engagement → 25
  - Executive disengaged (explicitly) → 0

**Risk Penalty (0–100, inverted)**
- Counts active `risk_signals` on the account
  - 0 signals → 100 (no penalty)
  - 1 signal → 70
  - 2 signals → 40
  - 3+ signals → 10

### Computation function

```typescript
// src/lib/health/compute.ts

export function computeHealthScore(
  account: Account,
  recentSentiment: SentimentHistoryRow[]
): { score: number; breakdown: HealthBreakdown } {
  const hasUsageData = account.product_usage_licensed_users > 0;

  // Adoption
  const adoption = hasUsageData
    ? (account.product_usage_active_users / account.product_usage_licensed_users) * 100
    : 50; // neutral fallback

  // Sentiment (last 90 days, exponentially weighted)
  const sentimentScore = computeSentimentScore(recentSentiment);

  // Engagement
  const engagement = ENGAGEMENT_MAP[account.exec_engagement] ?? 50;

  // Risk penalty
  const riskCount = account.risk_signals?.length ?? 0;
  const riskScore = riskCount === 0 ? 100 : riskCount === 1 ? 70 : riskCount === 2 ? 40 : 10;

  // Weights
  const weights = hasUsageData
    ? [0.4, 0.3, 0.2, 0.1]
    : [0.14, 0.43, 0.29, 0.14]; // redistribute if no usage data

  const score = Math.round(
    adoption     * weights[0] +
    sentimentScore * weights[1] +
    engagement   * weights[2] +
    riskScore    * weights[3]
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: { adoption, sentiment: sentimentScore, engagement, riskScore, weights }
  };
}
```

### When it runs

- **Nightly** — Vercel Cron calls `/api/cron/health-score` which recomputes all accounts
- **On-demand** — When a CSM accepts a sentiment confirmation or accepts a risk signal, the account's score is queued for immediate recompute
- **On CSV import** — After product usage data is imported, all affected accounts are queued for recompute

The result is written to `accounts.computed_health_score` and `accounts.health_score_last_computed`.

---

## 9. PER-CSM INTEGRATION SETTINGS

### In plain language

Each CSM connects their own Granola account (for meeting sync) and their own Gmail account (for email drafting in Phase 2). This is self-serve — they don't need to ask admin for access. Admins can see the connection status for all CSMs but cannot see or use their credentials.

Credentials are encrypted before they're stored. A Granola API key stored in the database looks like a random string of bytes. The decryption only happens server-side, at the moment a sync job runs.

### Granola connection

1. CSM navigates to `/settings/integrations`
2. Enters their Granola API key in the form
3. Frontend calls `POST /api/integrations/granola/connect` with the key
4. Route handler:
  - Validates the key by making a test call to Granola API
  - If valid: encrypts via Supabase Vault, stores in `csm_integrations.granola_api_key_enc`
  - Returns status only (not the key)
5. CSM sees "Granola connected ✓" with a "Sync now" button and last-synced timestamp

**Supabase Vault encryption:**
```sql
-- Store (encrypt)
UPDATE csm_integrations
SET granola_api_key_enc = vault.create_secret(
  $1,  -- plaintext API key
  'granola_key_' || user_id::text
)
WHERE user_id = $2;

-- Retrieve (decrypt, server-side only)
SELECT vault.decrypted_secret(granola_api_key_enc) AS api_key
FROM csm_integrations
WHERE user_id = $1;
```

### Gmail OAuth connection

Gmail requires OAuth 2.0 — a more involved flow than an API key, but only needed for Phase 2 (email drafting). The OAuth is set up in Phase 1 so CSMs can connect proactively.

**Scope requested:** `https://www.googleapis.com/auth/gmail.compose` only.
This scope allows creating drafts. It does NOT allow reading the inbox, sending emails, or any other access. This must be stated clearly in the Google OAuth consent screen and confirmed with the Google Cloud project owner before launch.

**Flow:**
```
CSM clicks "Connect Gmail"
    │
    ▼
GET /api/integrations/gmail/oauth
  → Generates OAuth URL with state parameter (anti-CSRF)
  → Redirects CSM to Google consent page
    │
    ▼
CSM approves → Google redirects to /api/integrations/gmail/callback
  → Validates state
  → Exchanges code for access + refresh tokens
  → Encrypts both tokens via Vault
  → Stores in csm_integrations
  → Redirects CSM back to /settings/integrations with success toast
```

---

## 10. BACKGROUND JOBS

### In plain language

Some operations take too long to complete within a normal web request (which times out after ~10 seconds on Vercel). Granola sync, health score computation, and Claude extraction can each take 15–60 seconds depending on the number of meetings or accounts.

The solution: write the work to be done into a database table (`sync_jobs`), and have a separate process pick it up and execute it every few minutes. This is called an async job queue.

There's no separate service to run. The job processor is a Vercel Cron — a scheduled route that runs on a timer.

### Job processing flow

```
Vercel Cron → POST /api/cron/process-sync-jobs  (every 5 minutes)
    │
    ▼
SELECT * FROM sync_jobs
WHERE status = 'queued'
  AND attempts < max_attempts
ORDER BY queued_at ASC
LIMIT 10  -- process up to 10 jobs per cron run
    │
    ▼
For each job:
  UPDATE sync_jobs SET status = 'running', started_at = NOW(), attempts = attempts + 1
      │
      ├── type = 'granola_sync'  → runGranolaSync(job)
      └── type = 'note_analyze'  → runNoteAnalysis(job)
      │
      ▼
  On success: UPDATE sync_jobs SET status = 'completed', completed_at = NOW(), result = {...}
  On failure: UPDATE sync_jobs SET status = 'failed', error = message
              If attempts = max_attempts: SET status = 'dead'
```

### Job status visibility

The `/settings/integrations` page polls `GET /api/integrations/me` every 10 seconds while a sync job is pending. Once the job completes, the page shows the result summary (N notes synced, N unmatched, N errors).

### Vercel Cron configuration (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/process-sync-jobs",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/health-score",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/dashboard-signals",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Cron authentication:** All cron routes verify that the request includes a `CRON_SECRET` header matching the environment variable. This prevents anyone from triggering cron routes by guessing the URL.

```typescript
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... process jobs
}
```

---

## 11. DASHBOARD SIGNALS

### In plain language

The dashboard work queue shows a CSM what needs their attention today — overdue tasks, renewals coming up in 30/60/90 days, accounts with no recent meeting, high-risk accounts. If this were computed fresh on every page load, it would require multiple slow database queries.

Instead, a nightly job pre-computes these signals and stores them as rows in `dashboard_signals`. When a CSM opens the dashboard, it's reading from this pre-populated table — extremely fast. Signals are refreshed overnight, but urgent ones (like a task that just became overdue) can be refreshed on-demand.

### Signal types

| `signal_type` | Description | Refresh trigger |
| --- | --- | --- |
| `overdue_task` | Task is past due date and not done | Nightly + on task status change |
| `renewal_30` | Renewal date is 30 days or fewer away | Nightly |
| `renewal_60` | Renewal date is 31–60 days away | Nightly |
| `renewal_90` | Renewal date is 61–90 days away | Nightly |
| `high_risk` | Account sentiment = 'high_risk' | Nightly + on sentiment change |
| `no_meeting_14d` | No meeting note in 14 days | Nightly |
| `no_meeting_30d` | No meeting note in 30 days | Nightly |

### Nightly computation

```typescript
// src/app/api/cron/dashboard-signals/route.ts

// 1. Delete stale signals older than 24h
await supabase.from('dashboard_signals').delete().lt('computed_at', yesterday);

// 2. Recompute for each CSM
const csms = await getCsmList();
for (const csm of csms) {
  const signals = await computeSignalsForUser(csm.id);
  await supabase.from('dashboard_signals').upsert(signals, { onConflict: 'user_id,signal_type,account_id' });
}
```

---

## 12. DEPLOYMENT AND ENVIRONMENT

### In plain language

The platform runs in two places: Vercel (the web app) and Supabase (the database). Both are managed services — no servers to maintain.

The build process is: push code to GitHub → Vercel automatically builds and deploys a preview URL → if the branch is `main`, it deploys to production.

### Environment variables

| Variable | Where it lives | What it's for |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (public) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel (public) | Supabase public API key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (secret) | Admin key — used server-side for cron jobs only |
| `ANTHROPIC_API_KEY` | Vercel (secret) | Claude API access |
| `GRANOLA_API_BASE_URL` | Vercel | Granola API endpoint |
| `GOOGLE_CLIENT_ID` | Vercel | Gmail OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | Vercel (secret) | Gmail OAuth app client secret |
| `CRON_SECRET` | Vercel (secret) | Shared secret for cron route authentication |
| `NEXT_PUBLIC_APP_URL` | Vercel | Full production URL (used in OAuth redirect URIs) |

### Deployment steps (initial)

1. Create Supabase project (free tier is sufficient for Phase 1)
2. Run migrations in order: `0001_schema.sql` → `0002_rls.sql` → `0003_triggers.sql`
3. Enable Supabase Vault (`pgsodium` extension) — requires one SQL command in the Supabase console
4. Configure Google Cloud project: create OAuth credentials, add `@zluri.com` to authorised domains, request `gmail.compose` scope approval
5. Create Vercel project, connect GitHub repo
6. Add all environment variables to Vercel
7. Set `NEXT_PUBLIC_APP_URL` to the Vercel production domain
8. Add production domain to Supabase auth redirect URLs
9. Add production domain to Google OAuth authorised redirect URIs
10. Deploy

### Environments

| Environment | Branch | URL pattern | Purpose |
| --- | --- | --- | --- |
| Production | `main` | `csm.zluri.com` (or Vercel domain) | Live CSM use |
| Preview | any PR branch | `*.vercel.app` | Review changes before merge |
| Local | — | `localhost:3000` | Development |

Local development requires a `.env.local` file. Use Supabase's local CLI (`supabase start`) for local database development, or connect to a development Supabase project.

---

## 13. WHAT'S DEFERRED TO PHASE 2

Phase 1 establishes the data model for Phase 2 features — tables like `projects`, `project_phases`, `project_milestones`, `documents`, `email_log` are in the schema but no Phase 1 feature writes to them. This is intentional — the Phase 2 agents need these tables to exist with stable schemas.

| Capability | Phase |
| --- | --- |
| Gmail draft creation | Phase 2 |
| AI document generation | Phase 2 |
| Implementation project tracker (Phases, Milestones) | Phase 2 |
| Client-shareable public project URL | Phase 2 |
| Custom dashboards (admin builds, viewer reads) | Phase 2 |
| Slack signal monitoring | Phase 2 |
| AI command interface / Ask Claude | Phase 3 |
| Customer ROI dashboard | Phase 3 |

---

## 14. OPEN TECHNICAL DECISIONS

These require a decision before or during Phase 1 build. They are not blockers to starting, but they affect the implementation of specific features.

| # | Decision | Options | Default if not decided |
| --- | --- | --- | --- |
| 1 | **Granola access model** — is Granola accessed via API key (per CSM) or via a single OAuth token (org-level)? | Per-CSM API key vs. org OAuth | Per-CSM API key (simpler; more private) |
| 2 | **Health score formula weights** — 40/30/20/10 is the design default. CS Lead should confirm or adjust | Keep 40/30/20/10 vs. adjust | Keep defaults; document as configurable |
| 3 | **Product usage data import cadence** — is this a one-time admin CSV upload or should it be a scheduled automated pull from Zluri's data warehouse? | Manual CSV monthly vs. automated pipeline | Manual CSV — Phase 1 |
| 4 | **Gmail OAuth consent screen approval** — requires explicit Google Cloud project creation and a domain verification step. Who owns the Google Cloud project? | CS Ops owns vs. Engineering team owns | Raise with Engineering before Day 11 |
| 5 | **Supabase Vault setup** — Vault (pgsodium) must be enabled by a Supabase admin user. Can Shrikant enable this independently or does it need Engineering? | Self-serve vs. needs engineering | Needs Engineering — raise before Day 11 |
| 6 | **Dashboard signals refresh frequency** — nightly is the default. Should overdue tasks refresh in real-time as task status changes? | Nightly only vs. event-triggered refresh | Nightly only — simpler; good enough for MVP |
