# Zluri Customer Success Platform — Technical Architecture Document
**Version:** 1.0
**Date:** 2026-03-26
**Status:** Draft
**Companion document:** PRD-v1.md

---

## TABLE OF CONTENTS

1. System Purpose and Operational Context
2. Architecture Overview
3. Data Model Reference
4. Authentication, Authorization, and Role Architecture
5. API Layer Contract
6. CSV Import Pipeline
7. Integration Agent Architecture
8. AI Pipeline
9. Background Job Infrastructure
10. Email Trigger and Gmail Draft Pipeline
11. Document Generation Pipeline
12. Custom Dashboard Architecture
13. Public Project Tracker
14. Observability and Operations
15. Environment and Deployment
16. Known Technical Debt Register

---

## 1. SYSTEM PURPOSE AND OPERATIONAL CONTEXT

### What the platform does
The Zluri CSP is an internal web application that manages the full customer lifecycle from Sales-to-CS handover through go-live and steady-state account management. It is used by Zluri's Customer Success team (CSMs, CSEs, CS Lead, CSops) and provides read/view access to Account Executives and other internal stakeholders.

### Who uses it
| Role | Count (estimate) | Primary Use |
| --- | --- | --- |
| CSM | 8–10 | Daily account management, notes, tasks, emails |
| CSE | 8-10 | Project tracker, technical docs, tasks |
| CS Lead / CSops | 2–3 | Portfolio visibility, assignments, settings |
| Admin | 1–2 | User management, templates, global config |
| AE (viewer) | 5-10 | Account context, implementation status |
| Custom stakeholder | Variable | Role-specific dashboard views |

### Deployment environment
- **Frontend + API**: Next.js 14+ (App Router) deployed on Vercel
- **Database + Auth**: Supabase (managed PostgreSQL + GoTrue auth + Realtime + Storage)
- **AI**: Anthropic Claude API (server-side only)
- **External integrations**: Granola API, Google Gmail API, Slack API (Phase 2+)

### SLA expectations (internal tool)
- Availability target: best-effort, no formal SLA
- Acceptable downtime: maintenance windows during off-hours
- Data loss tolerance: zero (Supabase handles backups; RPO < 24 hours via daily backups)
- Acceptable latency: < 500ms for standard page loads; < 3s for AI-powered operations

---

## 2. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (CSM/AE)                         │
│   Next.js App Router — React Server Components + Client Hooks   │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────────────────────────┐
│                     Vercel Edge Network                         │
│   Middleware: session refresh, auth gate, domain check,         │
│   role enforcement (JWT claim), rate limiting                   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼──────┐    ┌────────▼────────┐
│  Next.js RSC  │    │  Route Handlers │
│  (page data)  │    │  /api/*         │
└───────┬───────┘    └────────┬────────┘
        │                     │
        └──────────┬──────────┘
                   │
     ┌─────────────▼─────────────┐
     │        Supabase           │
     │  PostgreSQL + RLS         │
     │  GoTrue Auth (Google OAuth)│
     │  Storage (future)         │
     │  Realtime (future)        │
     └─────────────┬─────────────┘
                   │
     ┌─────────────▼─────────────┐
     │     Background Jobs       │
     │  Vercel Cron → /api/cron  │
     │  or Supabase Edge Fn      │
     └─────────────┬─────────────┘
                   │
     ┌─────────────▼─────────────┐
     │     External Services     │
     │  Anthropic Claude API     │
     │  Granola API              │
     │  Google Gmail API         │
     │  Slack API (Phase 2)      │
     │  Gamma API (Phase 3)      │
     └───────────────────────────┘
```

### Client data fetching strategy
- **React Server Components**: used for initial page load data (accounts list, account detail)
- **SWR hooks**: used for data that refreshes on interaction (task status, note count)
- **Optimistic updates**: for inline edits (health score, sentiment, task status) — update local state immediately, revert on API error
- **No direct Supabase client calls from the browser** for writes — all mutations go through `/api/*` route handlers for validation

---

## 3. DATA MODEL REFERENCE

### Entity Relationship Summary

```
profiles (1) ──< accounts (as csm_id)
accounts (1) ──< contacts
accounts (1) ──< tasks
accounts (1) ──< meeting_notes
accounts (1) ──< success_plans ──< tasks
accounts (1) ──< projects ──< project_phases ──< project_milestones
projects ──< project_milestones ──< tasks (via milestone_id)
accounts (1) ──< documents
accounts (1) ──< drive_links
accounts (1) ── account_integrations (1)
accounts (1) ── account_lifecycle_checklist (1)
profiles (1) ── csm_integrations (1)
accounts (1) ──< email_log
import_logs (standalone audit table)
sync_jobs (job queue table)
dashboard_configs ──< dashboard_widgets
```

### Table Reference

#### `profiles`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | FK → auth.users |
| email | TEXT |  |
| full_name | TEXT |  |
| role | TEXT | admin / member / viewer / ae / collaborator |
| avatar_url | TEXT | from Google OAuth |
| created_at | TIMESTAMPTZ |  |

**RLS:** Users can read their own row. Admins can read all. Admins can update role.

---

#### `accounts`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| org_id | TEXT UNIQUE | Stable dedup key — ChurnZero ID or manual |
| name | TEXT |  |
| arr | NUMERIC |  |
| renewal_date | DATE |  |
| contract_type | TEXT |  |
| csm_id | UUID | FK → profiles |
| ae_name | TEXT | AE may not be a system user |
| ae_email | TEXT |  |
| go_live_date | DATE |  |
| contract_signed_date | DATE |  |
| health_score | INTEGER | Manual override (0–100) |
| computed_health_score | INTEGER | System-computed |
| health_score_last_computed | TIMESTAMPTZ |  |
| sentiment | TEXT | high_risk / some_risk / good |
| lifecycle_stage | TEXT[] | Multi-value — TEXT[] not TEXT CHECK |
| exec_engagement | TEXT | 7-option enum |
| renewal_stage | TEXT |  |
| risk_signals | TEXT[] |  |
| product_usage_active_users | INTEGER | From CSV import |
| product_usage_licensed_users | INTEGER | From CSV import |
| product_usage_snapshot_date | DATE |  |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ | auto-updated by trigger |

**Key constraint:** `org_id` is the upsert key for all CSV imports and future agent syncs. Never mutate `org_id` after creation.

**RLS:**
- Admin: full access
- Member: SELECT/UPDATE/INSERT where `csm_id = auth.uid()`
- Viewer / AE: SELECT only (all accounts visible by default; can be scoped)

---

#### `contacts`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| name | TEXT |  |
| email | TEXT |  |
| role | TEXT |  |
| is_primary | BOOLEAN |  |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `tasks`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| title | TEXT |  |
| description | TEXT |  |
| due_date | DATE |  |
| status | TEXT | todo / in_progress / done / cancelled |
| owner_id | UUID | FK → profiles |
| plan_id | UUID | FK → success_plans (nullable) |
| project_milestone_id | UUID | FK → project_milestones (nullable) |
| source | TEXT | manual / ai / integration (default: manual) |
| client_visible | BOOLEAN | false by default; true = shown in public project view |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

**Note:** Tasks can belong to a success plan OR a project milestone OR neither (standalone). They cannot belong to both.

---

#### `success_plans`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| name | TEXT |  |
| status | TEXT |  |
| owner_id | UUID | FK → profiles |
| due_date | DATE |  |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `meeting_notes`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| title | TEXT |  |
| content | TEXT |  |
| meeting_date | DATE |  |
| source | TEXT | manual / granola / slack / other |
| external_id | TEXT | Granola doc ID — used for dedup |
| metadata | JSONB | Raw AI extraction output (legacy; structured fields below are preferred) |
| sentiment_hint | TEXT | positive / neutral / negative |
| sentiment_confirmed | BOOLEAN | false until CSM confirms |
| action_items_processed | BOOLEAN | false until AI proposals created |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

**Constraints:**
```sql
UNIQUE (external_id) WHERE external_id IS NOT NULL
```

---

#### `projects`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| name | TEXT |  |
| description | TEXT |  |
| status | TEXT | not_started / in_progress / on_track / at_risk / delayed / completed |
| csm_id | UUID | FK → profiles |
| cse_id | UUID | FK → profiles (nullable) |
| ae_name | TEXT | AE not required to be in system |
| ae_email | TEXT |  |
| start_date | DATE |  |
| target_go_live_date | DATE |  |
| actual_go_live_date | DATE |  |
| public_token | UUID | UNIQUE — used for client-shareable URL |
| public_sharing_enabled | BOOLEAN | Default true |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `project_phases`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| project_id | UUID | FK → projects ON DELETE CASCADE |
| name | TEXT |  |
| order_index | INTEGER | Defines display order |
| status | TEXT |  |
| start_date | DATE |  |
| end_date | DATE | Planned |
| actual_end_date | DATE |  |

---

#### `project_milestones`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| phase_id | UUID | FK → project_phases ON DELETE CASCADE |
| name | TEXT |  |
| description | TEXT |  |
| owner_id | UUID | FK → profiles (nullable) |
| owner_type | TEXT | internal / customer / partner |
| due_date | DATE |  |
| completed_date | DATE |  |
| status | TEXT |  |
| client_visible | BOOLEAN | Default true |
| order_index | INTEGER |  |

---

#### `documents`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| project_id | UUID | FK → projects (nullable) |
| type | TEXT | handover_doc / intake_form / sow / impl_plan / mom / weekly_update / phase_completion / monthly_report / go_live_announcement / other |
| title | TEXT |  |
| content | TEXT | Markdown / rich text |
| status | TEXT | draft / final / sent |
| generated_by | UUID | FK → profiles |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `drive_links`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| url | TEXT |  |
| title | TEXT |  |
| category | TEXT | sales_materials / technical_docs / implementation_docs / customer_shared / other |
| added_by | UUID | FK → profiles |
| created_at | TIMESTAMPTZ |  |

---

#### `email_log`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| project_id | UUID | FK → projects (nullable) |
| type | TEXT | deal_closure / exec_intro / welcome / weekly_update / mom / phase_completion / go_live / monthly_report |
| recipients | JSONB | {to: [], cc: [], bcc: []} |
| subject | TEXT |  |
| body_preview | TEXT | First 500 chars |
| gmail_draft_id | TEXT | Returned by Gmail API |
| status | TEXT | draft_created / failed |
| triggered_by | UUID | FK → profiles |
| created_at | TIMESTAMPTZ |  |

---

#### `account_integrations`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts |
| slack_channel_id | TEXT |  |
| email_domain | TEXT | Used for Granola meeting matching |
| jira_project_key | TEXT |  |
| notion_page_id | TEXT |  |
| granola_folder_id | TEXT |  |
| clari_account_id | TEXT |  |
| granola_last_synced_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `account_lifecycle_checklist`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| account_id | UUID | FK → accounts UNIQUE |
| deal_closure_email_sent | BOOLEAN |  |
| exec_intro_email_sent | BOOLEAN |  |
| csm_cse_assigned | BOOLEAN |  |
| recordings_received | BOOLEAN |  |
| handover_doc_generated | BOOLEAN |  |
| intake_form_completed | BOOLEAN |  |
| pre_kickoff_alignment_done | BOOLEAN |  |
| pre_kickoff_customer_call_done | BOOLEAN |  |
| impl_plan_prepared | BOOLEAN |  |
| kickoff_done | BOOLEAN |  |
| project_tracker_created | BOOLEAN |  |
| project_tracker_shared | BOOLEAN |  |
| weekly_updates_cadence_set | BOOLEAN |  |
| go_live_conducted | BOOLEAN |  |
| go_live_email_sent | BOOLEAN |  |
| monthly_reports_cadence_set | BOOLEAN |  |
| qbr_scheduled | BOOLEAN |  |
| expansion_opportunities_documented | BOOLEAN |  |
| updated_at | TIMESTAMPTZ |  |

---

#### `csm_integrations`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| user_id | UUID | FK → profiles UNIQUE |
| granola_connected | BOOLEAN |  |
| granola_api_key_enc | TEXT | Encrypted via Supabase Vault |
| granola_sync_enabled | BOOLEAN | Default true |
| granola_sync_frequency | TEXT | daily / manual |
| granola_last_synced_at | TIMESTAMPTZ |  |
| gmail_connected | BOOLEAN |  |
| gmail_access_token_enc | TEXT | Encrypted |
| gmail_refresh_token_enc | TEXT | Encrypted |
| gmail_token_expiry | TIMESTAMPTZ |  |
| slack_connected | BOOLEAN |  |
| slack_access_token_enc | TEXT | Encrypted |
| updated_at | TIMESTAMPTZ |  |

**Security note:** Tokens are never returned to the client. Route handlers decrypt on the server and use them for API calls. Supabase Vault (`pgsodium`) is used for encryption at rest.

---

#### `sync_jobs`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| type | TEXT | granola_sync / health_score_compute / gmail_draft / document_generate |
| status | TEXT | queued / running / completed / failed / dead |
| user_id | UUID | FK → profiles |
| account_id | UUID | FK → accounts (nullable) |
| payload | JSONB | Input parameters |
| result | JSONB | Output or error details |
| attempts | INTEGER | Default 0 |
| max_attempts | INTEGER | Default 3 |
| queued_at | TIMESTAMPTZ |  |
| started_at | TIMESTAMPTZ |  |
| completed_at | TIMESTAMPTZ |  |
| error | TEXT | Last error message |

---

#### `dashboard_configs`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| name | TEXT |  |
| owner_id | UUID | FK → profiles (nullable — null = system default) |
| role_visibility | TEXT[] | Which roles can see this dashboard |
| shareable_token | UUID | UNIQUE — for sharing via URL |
| is_default | BOOLEAN | One default per role |
| layout | JSONB | Widget positions and sizes |
| created_at | TIMESTAMPTZ |  |
| updated_at | TIMESTAMPTZ |  |

#### `dashboard_widgets`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| dashboard_id | UUID | FK → dashboard_configs ON DELETE CASCADE |
| widget_type | TEXT | See Widget Registry below |
| position_x | INTEGER | Grid column (12-col grid) |
| position_y | INTEGER | Grid row |
| width | INTEGER | Column span |
| height | INTEGER | Row span |
| config | JSONB | Widget-specific settings (filters, date range, etc.) |
| order_index | INTEGER |  |

---

#### `import_logs`
| Column | Type | Notes |
| --- | --- | --- |
| id | UUID | PK |
| imported_by | UUID | FK → profiles |
| filename | TEXT |  |
| import_type | TEXT | accounts / product_usage |
| total_rows | INTEGER |  |
| inserted_rows | INTEGER |  |
| updated_rows | INTEGER |  |
| error_rows | INTEGER |  |
| errors | JSONB | Array of {row, field, message} |
| created_at | TIMESTAMPTZ |  |

---

### Indexes

```sql
-- Accounts
CREATE INDEX idx_accounts_csm_id ON accounts(csm_id);
CREATE INDEX idx_accounts_renewal_date ON accounts(renewal_date);
CREATE INDEX idx_accounts_sentiment ON accounts(sentiment);
CREATE INDEX idx_accounts_org_id ON accounts(org_id);

-- Full text search for matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_accounts_name_trgm ON accounts USING GiST (name gist_trgm_ops);

-- Tasks
CREATE INDEX idx_tasks_account_id ON tasks(account_id);
CREATE INDEX idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Meeting notes
CREATE INDEX idx_notes_account_id ON meeting_notes(account_id);
CREATE INDEX idx_notes_meeting_date ON meeting_notes(meeting_date DESC);
CREATE UNIQUE INDEX idx_notes_external_id ON meeting_notes(external_id) WHERE external_id IS NOT NULL;

-- Projects
CREATE INDEX idx_projects_account_id ON projects(account_id);
CREATE UNIQUE INDEX idx_projects_public_token ON projects(public_token);

-- Sync jobs
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status) WHERE status IN ('queued','running');
CREATE INDEX idx_sync_jobs_user_id ON sync_jobs(user_id);
```

---

## 4. AUTHENTICATION, AUTHORIZATION, AND ROLE ARCHITECTURE

### Auth Flow

```
User visits app
    ↓
Middleware checks session (Supabase cookie)
    ↓
No session? → redirect to /login
    ↓
/login → Google OAuth → Supabase GoTrue
    ↓
Supabase Auth Hook fires:
  1. Creates profiles row (trigger: handle_new_user)
  2. Sets role in JWT app_metadata claim (default: 'member')
  3. Enforces @zluri.com domain (rejects others)
    ↓
/auth/callback → session established → redirect to /dashboard
    ↓
Middleware reads role from JWT claim (user.app_metadata.role)
No DB round-trip needed
```

### Role Definitions

| Role | Description | Can Access |
| --- | --- | --- |
| `admin` | CSops / platform admin | Everything — all accounts, all users, all settings, import, audit log |
| `member` | CSM / CSE | Own assigned accounts (csm_id = uid), own tasks, own integrations |
| `viewer` | CS Lead — read-only across all accounts | All accounts (read), no edit, no admin |
| `ae` | Account Executive — limited view | AE-specific dashboard OR accounts where ae_email matches their email |
| `collaborator` | External Zluri stakeholder | Custom dashboard view only (no account detail access) |

### AE Access Architecture

AEs are Zluri employees with @zluri.com Google accounts but are not CSMs. Two access paths:

**Option A: AE role with account scoping (recommended for Phase 1)**
- AE logs in via Google OAuth (@zluri.com)
- `profiles.role = 'ae'`
- RLS scopes their account access: `ae_email = auth.email()`
- They see only accounts where their email is recorded as the AE
- View access to: account overview, contacts, project tracker, meeting notes (without AI suggestions)
- No edit access; no settings access; no admin access
- Default landing page: AE-specific dashboard (see Section 12)

**Option B: Shareable dashboard link (for AEs who prefer not to log in)**
- Admin or CS Lead generates a shareable dashboard URL for a specific AE
- URL includes a `dashboard_configs.shareable_token`
- No authentication required to view
- Shows: accounts where that AE is recorded, their implementation status, renewal dates
- Read-only, no account detail drill-down (just summary cards)
- Token can be revoked

**Both options are supported.** AEs with accounts in the system are encouraged to use Option A for richer context. Option B is a fallback for lightweight sharing.

### Middleware Role Enforcement

```typescript
// src/middleware.ts — enforced checks in order:
1. Refresh session (Supabase cookie)
2. No session → redirect to /login
3. Has session but email not @zluri.com → sign out + redirect to /login
4. Role from JWT: user.app_metadata.role
5. /admin/* or /import → require role === 'admin', else 403
6. /settings/* → require role in ['admin','member','viewer','ae'] (no collaborator)
7. All other routes → any authenticated user
```

**Critical:** Role is read from `user.app_metadata.role` in the JWT — zero DB round-trips in middleware. The `profiles` table role and the JWT claim must stay in sync. A Supabase Auth Hook fires whenever `profiles.role` is updated and refreshes the JWT claim.

### RLS Policy Summary

| Table | Admin | Member | Viewer | AE | Collaborator |
| --- | --- | --- | --- | --- | --- |
| accounts | Full | SELECT/UPDATE/INSERT where csm_id=uid | SELECT all | SELECT where ae_email=email | None |
| contacts | Full | Via account | SELECT via account | SELECT via account | None |
| tasks | Full | Via account | SELECT via account | SELECT via account | None |
| meeting_notes | Full | Via account | SELECT via account | SELECT via account | None |
| projects | Full | Via account | SELECT via account | SELECT via account | None |
| project_milestones | Full | Via project | SELECT via project | SELECT via project | None |
| documents | Full | Via account | SELECT via account | SELECT via account | None |
| drive_links | Full | Via account | SELECT via account | SELECT via account | None |
| csm_integrations | Full | Own row only | None | None | None |
| account_integrations | Full | Via account | SELECT via account | None | None |
| dashboard_configs | Full | Own + shared | Own + shared | Own + system AE | System collaborator |
| import_logs | Full | None | None | None | None |
| sync_jobs | Full | Own rows | None | None | None |
| profiles | Full | Own row | SELECT all | Own row | Own row |

---

## 5. API LAYER CONTRACT

### Validation Architecture

Every write route follows this pattern:
```
Request
  → auth check (middleware already ran, but re-verify session in handler)
  → role check (if route is role-restricted)
  → Zod schema validation (reject with 400 + field-level errors)
  → field allowlist strip (remove any fields not in the allowlist)
  → DB call (Supabase user client — RLS applies)
  → response
```

Zod schemas live in `src/lib/schemas/` mirroring the entity names:
- `src/lib/schemas/account.ts` → `AccountCreateSchema`, `AccountUpdateSchema`
- `src/lib/schemas/task.ts` → `TaskCreateSchema`, `TaskUpdateSchema`
- `src/lib/schemas/project.ts` → `ProjectCreateSchema`, `ProjectUpdateSchema`
- etc.

`AccountUpdateSchema` explicitly allowlists mutable fields:
```typescript
// org_id, csm_id, created_at are NOT in this list
const AccountUpdateSchema = z.object({
  name: z.string().optional(),
  arr: z.number().optional(),
  renewal_date: z.string().optional(),
  health_score: z.number().min(0).max(100).optional(),
  sentiment: z.enum(['high_risk','some_risk','good']).optional(),
  // ... etc
})
```

### Route Inventory

#### Accounts
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/accounts` | member+ | Query params: csm_id, sentiment, health_band, renewal_window, search |
| POST | `/api/accounts` | admin | Creates account; auto-creates lifecycle_checklist row |
| GET | `/api/accounts/[id]` | member+ | Includes joined csm profile |
| PATCH | `/api/accounts/[id]` | member | Allowlisted fields only |
| DELETE | `/api/accounts/[id]` | admin | Soft delete (sets deleted_at) |

#### Contacts
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/accounts/[id]/contacts` | member+ |  |
| POST | `/api/accounts/[id]/contacts` | member |  |
| PATCH | `/api/contacts/[id]` | member |  |
| DELETE | `/api/contacts/[id]` | member | Hard delete |

#### Tasks
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/tasks` | member+ | Query: account_id, owner_id, status, due_before |
| POST | `/api/tasks` | member |  |
| PATCH | `/api/tasks/[id]` | member |  |
| DELETE | `/api/tasks/[id]` | member |  |

#### Projects
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/projects` | member+ | Query: account_id, status, csm_id |
| POST | `/api/projects` | member | Creates project + default phases from template |
| GET | `/api/projects/[id]` | member+ | Includes phases, milestones, tasks |
| PATCH | `/api/projects/[id]` | member |  |
| DELETE | `/api/projects/[id]` | admin |  |
| POST | `/api/projects/[id]/regenerate-token` | member | Invalidates public_token, generates new one |
| GET | `/api/p/[token]` | public | Returns client-visible project data only |

#### Documents
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/accounts/[id]/documents` | member+ |  |
| POST | `/api/documents/generate` | member | Triggers AI document generation job |
| GET | `/api/documents/[id]` | member+ |  |
| PATCH | `/api/documents/[id]` | member |  |
| GET | `/api/documents/[id]/export-pdf` | member | Server-rendered PDF |

#### Integrations (per-CSM)
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/integrations/settings` | member | Returns own csm_integrations row (tokens redacted) |
| PATCH | `/api/integrations/granola` | member | Save/update Granola API key (encrypted) |
| DELETE | `/api/integrations/granola` | member | Disconnect |
| POST | `/api/integrations/granola/sync` | member | Enqueues sync job, returns job_id |
| POST | `/api/integrations/gmail/connect` | member | Initiates Gmail OAuth |
| GET | `/api/integrations/gmail/callback` | member | Handles OAuth callback, stores tokens |
| DELETE | `/api/integrations/gmail` | member | Disconnect |
| POST | `/api/integrations/slack/connect` | member | Initiates Slack OAuth |
| DELETE | `/api/integrations/slack` | member | Disconnect |

#### Email Triggers
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/email/draft` | member | Enqueues gmail_draft job, returns job_id |
| GET | `/api/email/templates` | member | Returns CSM's templates (merged with admin defaults) |
| PATCH | `/api/email/templates/[type]` | member | Update own template |

#### Admin
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/admin/users` | admin |  |
| PATCH | `/api/admin/users/[id]` | admin | Role update only |
| GET | `/api/admin/integrations` | admin | All CSM integration statuses |
| DELETE | `/api/admin/integrations/[userId]/[type]` | admin | Force disconnect |
| GET | `/api/admin/audit` | admin | Paginated audit log |

#### Sync Jobs
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/jobs/[id]` | member | Poll job status |
| GET | `/api/jobs` | member | Own recent jobs |

#### Cron (internal — Vercel Cron, not user-facing)
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/api/cron/granola-sync` | CRON_SECRET header | Processes queued granola sync jobs |
| POST | `/api/cron/health-score` | CRON_SECRET header | Recomputes health scores nightly |
| POST | `/api/cron/ai-signals` | CRON_SECRET header | Computes dashboard signal strip |

#### Rate Limiting (Vercel Middleware)
- `/api/integrations/*/sync`: 5 requests/minute per user
- `/api/email/draft`: 20 requests/minute per user
- `/api/documents/generate`: 10 requests/minute per user
- All other routes: 120 requests/minute per user
- Cron routes: only callable with `Authorization: Bearer ${CRON_SECRET}` header

---

## 6. CSV IMPORT PIPELINE

### Flow

```
Client: drag/drop CSV
  → PapaParse (client-side): extract headers + 10 sample rows
  → FieldMapper: auto-map headers using fuzzy rules
  → User confirms mapping
  → Client sends batches of 500 rows to POST /api/import/validate
  → Server: Zod validation per row, return {valid, errors}
  → Client: ImportPreview highlights red/green rows
  → User confirms
  → Client sends batches of 500 rows to POST /api/import
  → Server: upsert via org_id ON CONFLICT
  → Client polls for completion
  → ImportResultSummary: inserted, updated, errors
```

### Chunked Upload Contract

```typescript
// POST /api/import
// Body: { rows: Row[], mapping: FieldMapping, filename: string, batchIndex: number, totalBatches: number }
// Response: { inserted: number, updated: number, errors: RowError[] }
```

The client sends sequential batches (not parallel) to avoid overwhelming the DB. Each batch response is accumulated. Final `import_logs` row is written after the last batch.

### Field Auto-Mapping Rules (`src/lib/csv/parser.ts`)

Supports ChurnZero CSV export column names. Examples:
- "Annual Recurring Revenue" / "ARR" / "Contract Value" → `arr`
- "CSM Pulse" / "Sentiment" / "Health" → `sentiment`
- "5A Stage" / "Lifecycle Stage" / "Customer Stage" → `lifecycle_stage`
- "ChurnScore" / "Health Score" / "Risk Score" → `health_score`
- "Renewal Date" / "Contract Renewal" / "Renewal" → `renewal_date`
- "CSM" / "CSM Name" / "Account Manager" → CSM lookup by name → `csm_id`

### Import Types

**Accounts import** (`/import?type=accounts`):
- Upsert on `org_id`
- Auto-creates `account_lifecycle_checklist` row if new account
- Triggers health score recompute job for updated accounts

**Product Usage import** (`/import?type=product_usage`):
- Upsert on `org_id`
- Updates `product_usage_*` columns on matching accounts
- Triggers health score recompute job for updated accounts

### Import Security
- Server-side row cap: 5,000 rows per batch request
- File size limit: enforced at Vercel route handler level (`export const maxDuration = 60`)
- All imported data passes through Zod schema validation before any DB write
- Import is admin-only (enforced in middleware + route handler)

---

## 7. INTEGRATION AGENT ARCHITECTURE

### Agent Interface

```typescript
// src/lib/agents/types.ts
interface IntegrationAgent<TItem, TResult> {
  // Match an external item to an account
  matchAccount(
    item: TItem,
    accounts: Account[]
  ): Promise<MatchResult>

  // Fetch items from the external service since last sync
  fetchItems(
    credentials: AgentCredentials,
    lastSyncAt: Date | null
  ): Promise<TItem[]>

  // Transform a matched item into a DB-insertable result
  transform(
    item: TItem,
    accountId: string
  ): Promise<TResult>
}

interface MatchResult {
  accountId: string | null
  confidence: 'high' | 'medium' | 'low' | 'no_match'
  matchedOn: 'email_domain' | 'slack_channel' | 'jira_key' | 'name_similarity' | 'manual'
  requiresReview: boolean
}
```

### Account Matching Pipeline (`src/lib/agents/matching.ts`)

Matching runs in priority order. First match at sufficient confidence wins.

```
1. Email domain match
   Query: account_integrations.email_domain IN (attendee_email_domains)
   Confidence: high
   No review required

2. Slack channel match (Phase 2)
   Query: account_integrations.slack_channel_id = item.channel_id
   Confidence: high

3. Jira project key match (Phase 2)
   Query: account_integrations.jira_project_key = item.project_key
   Confidence: high

4. Name similarity (fallback)
   Query: similarity(accounts.name, $search_term) > 0.85
   Uses pg_trgm index — single query replaces old ilike loop
   Confidence: medium if 0.85–0.95, low if < 0.85
   Requires CSM review if confidence < high

5. No match → add to manual_review_queue (Phase 2)
```

### Granola Agent (`src/lib/agents/granola.ts`)

```typescript
// Input: Granola document
// Output: meeting_notes row + proposed tasks + proposed risk signals

async function processGranolaDocument(
  doc: GranolaDocument,
  userId: string
): Promise<GranolaProcessResult> {
  // 1. Match to account
  const match = await matchAccount(doc, accounts)
  if (!match.accountId) return { status: 'no_match', doc }

  // 2. Check for existing note (dedup by external_id)
  // 3. Extract insights via Claude (haiku for speed)
  // 4. Return structured proposals — not written to DB here
  return {
    status: 'matched',
    accountId: match.accountId,
    note: { ... },
    proposedTasks: [...],      // source = 'ai', status = 'proposed'
    proposedRiskSignals: [...], // for CSM review
    sentimentHint: 'negative'
  }
}
```

### Credential Management

- Credentials stored in `csm_integrations` table, encrypted via Supabase Vault (`pgsodium.crypto_secretbox`)
- Credentials are **never** returned to the browser — server-side decrypt only
- Route handlers that need credentials: decrypt in handler, use for API call, discard
- Token refresh: for OAuth tokens (Gmail, Slack), check expiry before use; if expired, use refresh token to get new access token; update stored token

---

## 8. AI PIPELINE

### Model Selection

| Use Case | Model | Reason |
| --- | --- | --- |
| Document generation (SOW, Handover Doc, MoM) | `claude-opus-4-6` | Quality-critical; user reviews output |
| Global command interface responses | `claude-opus-4-6` | Complex reasoning, portfolio queries |
| Meeting insight extraction (Granola sync) | `claude-haiku-4-5-20251001` | High volume, latency-sensitive, simpler task |
| Email draft generation | `claude-sonnet-4-6` | Balance of quality and speed |
| Dashboard AI signal strip | `claude-haiku-4-5-20251001` | Runs nightly, cost-sensitive |

### AI Output Data Contract

**This is the architectural rule that prevents JSONB graveyard:**

AI output is never stored as raw JSONB and ignored. Every AI operation produces structured rows:

| AI Operation | Output → DB Destination |
| --- | --- |
| Granola sync insight | `meeting_notes.sentiment_hint` + proposed tasks (source='ai', status='proposed') + proposed risk signals (pending CSM confirmation) |
| Document generation | `documents` row (content as markdown, status='draft') |
| Email draft | `email_log` row (status='draft_created') + Gmail draft via API |
| Health score compute | `accounts.computed_health_score` + timestamp |
| Dashboard signals | In-memory only — computed at query time, not stored |

**AI suggestions always require human confirmation before affecting account state:**
- Proposed tasks: visible in "Review AI suggestions" tray; CSM accepts/dismisses
- Proposed risk signals: shown inline on account overview with Accept/Dismiss
- Sentiment hint: shown as suggestion next to CSM Pulse field; CSM confirms

### Prompt Templates (`src/lib/prompts/`)

Each document type has a prompt template in `src/lib/prompts/[type].ts`. Structure:

```typescript
export function buildHandoverDocPrompt(account: Account, notes: MeetingNote[]): string {
  return `
You are generating a Handover Document for a new Zluri customer.

Customer: ${account.name}
ARR: $${account.arr}
CSM: ${account.csm?.full_name}

Pre-sales meeting transcripts:
${notes.map(n => `[${n.meeting_date}] ${n.content}`).join('\n\n')}

Generate a structured Handover Document with these sections:
1. Customer Overview (goals, current state, decision context)
2. Key Stakeholders (names, roles, contacts)
3. Technical Environment (stack, integrations, constraints)
4. Identified Risks and Blockers
5. POC Findings and Committed Outcomes
6. Recommended Implementation Approach

Use professional language suitable for sharing with the customer and internal team.
Output as markdown.
  `
}
```

### Token Budgets

| Operation | Input limit | Output limit | Est. cost/call |
| --- | --- | --- | --- |
| Meeting insight extraction | 4K tokens | 1K tokens | ~$0.001 (haiku) |
| Document generation | 16K tokens | 4K tokens | ~$0.20 (opus) |
| Email draft | 4K tokens | 2K tokens | ~$0.02 (sonnet) |
| Global command | 8K tokens | 4K tokens | ~$0.08 (opus) |
| Nightly health signals | 2K tokens | 1K tokens | ~$0.0005 (haiku) |

### Fallback Behavior

If the Anthropic API is unavailable:
- Document generation: return 500 with user-facing message "Document generation temporarily unavailable. Try again in a few minutes."
- Granola sync insight extraction: sync note without insights; set `action_items_processed = false` so a retry job can process it later
- Email draft: surface error in compose modal; allow CSM to write manually
- Dashboard signals: skip the signal strip; show stale signals from last successful run

---

## 9. BACKGROUND JOB INFRASTRUCTURE

### Job Queue Design

The `sync_jobs` table is the job queue. All async operations are enqueued here.

**Job lifecycle:**
```
queued → running → completed
                 → failed (attempts < max_attempts → re-queued)
                 → dead (attempts = max_attempts)
```

**Job processing — two scheduler options:**

**Option A (recommended): Vercel Cron**
- Cron job at `/api/cron/process-jobs` fires every minute (minimum Vercel interval)
- Handler: SELECT up to 10 `status = 'queued'` jobs, process concurrently (max 5), update status
- Simple, no additional infrastructure
- Limitation: 1-minute minimum interval; up to 60 second latency on job pickup

**Option B: Supabase Edge Function + pg\_cron**
- `pg_cron` fires every 30 seconds, calls Edge Function via pg_net
- Lower latency, runs in Supabase infra (closer to DB)
- More complex to set up and debug

**Decision: Start with Option A. Migrate to Option B if latency becomes a problem.**

### Job Types and Handlers

```
granola_sync
  Handler: src/lib/jobs/granola-sync.ts
  Payload: { userId, accountId? }
  Process: fetch Granola docs → match → extract insights → create proposals
  Timeout: 50 seconds (Vercel Cron function limit)
  Concurrency: max 3 per user at a time

gmail_draft
  Handler: src/lib/jobs/gmail-draft.ts
  Payload: { userId, accountId, emailType, recipients, subject, body }
  Process: decrypt Gmail token → refresh if expired → create draft via Gmail API
  Timeout: 10 seconds
  Concurrency: unlimited

document_generate
  Handler: src/lib/jobs/document-generate.ts
  Payload: { userId, accountId, documentType, projectId? }
  Process: fetch account + notes + project data → build prompt → call Claude → save to documents
  Timeout: 30 seconds
  Concurrency: max 2 per user

health_score_compute
  Handler: src/lib/jobs/health-score.ts
  Payload: { accountId? } (null = all accounts)
  Process: pull product_usage, sentiment trend, engagement signals → compute score → update accounts
  Timeout: 50 seconds for batch runs
  Concurrency: 1 (scheduled nightly)
```

### Retry and Dead Letter Policy

- `max_attempts = 3` for all job types
- Backoff between retries: `2^attempts * 10 seconds` (10s, 20s, 40s)
- Dead jobs: remain in `sync_jobs` with `status = 'dead'` for 30 days
- Admin can retry dead jobs from `/admin/audit`
- Alert (Slack message to internal CSops channel) when any job enters `dead` state

---

## 10. EMAIL TRIGGER AND GMAIL DRAFT PIPELINE

### Flow

```
CSM clicks email trigger button
  → POST /api/email/draft
  → Route handler:
      1. Validate request (email type, account_id)
      2. Fetch account + contacts + project data
      3. Merge with CSM's email template for this type
      4. Build prompt for email body
      5. Enqueue gmail_draft job → return { jobId }
  → Client polls GET /api/jobs/[jobId]
  → Job completes:
      1. Decrypt Gmail tokens from csm_integrations
      2. Refresh token if expired
      3. Create draft via Gmail API (POST /gmail/v1/users/me/drafts)
      4. Store gmail_draft_id in email_log
      5. Update lifecycle_checklist if applicable
  → Client receives { status: 'completed', gmailDraftUrl }
  → Toast: "Draft created in Gmail · Open →"
```

### Template Merge Logic

For each email type, the effective template is:
1. Start with system default template (`src/lib/email-templates/[type].ts`)
2. Merge with admin-level overrides (locked fields from `/admin/email-templates`)
3. Merge with CSM's own customizations (from `csm_integrations` or a separate `email_template_overrides` table)
4. Locked fields cannot be overridden at CSM level

### Auto-Checklist Update

When an email trigger is used, the corresponding lifecycle checklist item is automatically checked:
- `deal_closure_email_sent` → checked when `deal_closure` email trigger fires
- `exec_intro_email_sent` → checked when `exec_intro` trigger fires
- `go_live_email_sent` → checked when `go_live` trigger fires
- etc.

### Gmail OAuth Scope

**Requested scope: ****`https://www.googleapis.com/auth/gmail.compose`**** only**

This scope allows creating drafts. It does not allow reading the inbox, sending emails, or accessing any existing messages. This is the minimum scope required and should be communicated to CSMs during the OAuth consent screen.

---

## 11. DOCUMENT GENERATION PIPELINE

### Flow

```
CSM clicks "Generate Document" → select type
  → POST /api/documents/generate
  → Route handler:
      1. Validate (account_id, document_type)
      2. Fetch context: account, contacts, relevant notes, project state
      3. Enqueue document_generate job → return { jobId }
  → Client polls GET /api/jobs/[jobId]
  → Job processes:
      1. Build context object from DB data
      2. Select prompt template for document type
      3. Call Claude (opus-4-6 for most types)
      4. Parse response into markdown
      5. Create documents row (status = 'draft')
      6. Update lifecycle_checklist if applicable
  → Client receives { status: 'completed', documentId }
  → Opens document in full-screen editor (Tiptap or similar rich text editor)
  → CSM edits → "Save" (PATCH /api/documents/[id]) → "Mark as Final" → "Export PDF" or "Send via Email"
```

### Document Editor Requirements
- Rich text editor (Tiptap recommended — already in React ecosystem, supports markdown import/export)
- Formatting: headings, bold/italic, bullet lists, tables, horizontal rules
- Auto-save every 30 seconds (PATCH with status = 'draft')
- "Mark as Final" → status = 'final', no further auto-saves
- "Export PDF" → server-side PDF render (Puppeteer on a Vercel function, or a PDF API service)
- "Send via Email" → opens email trigger compose modal with this document in the body

### PDF Generation
Two options:
- **Puppeteer (self-hosted on Vercel):** Render the document as HTML, use headless Chrome to generate PDF. Works but cold starts can be slow.
- **PDF API service (e.g., API2PDF, DocRaptor):** Send HTML, receive PDF. Simpler, adds a vendor dependency.

**Decision:** Start with a lightweight HTML→PDF approach. Evaluate Puppeteer vs. service at implementation time based on Vercel memory limits.

---

## 12. CUSTOM DASHBOARD ARCHITECTURE

### Design

The dashboard system supports multiple dashboard configurations. Each configuration is a saved layout of widgets. The default dashboards are system-defined per role; users can create custom ones or admins can create and share them.

### Widget Registry

Pre-built widget types:

| Widget Type | Description | Config Options |
| --- | --- | --- |
| `my_tasks` | CSM's overdue + upcoming tasks | date_range, max_items |
| `renewals` | Upcoming renewals list | window_days, sort_by |
| `high_risk` | High risk accounts | max_items, include_some_risk |
| `ai_signals` | AI-generated attention items | max_items |
| `portfolio_stats` | ARR, account count, avg health | breakdown_by |
| `account_list` | Filtered account list inline | filters, columns |
| `implementation_status` | Projects status summary | status_filter |
| `renewal_pipeline` | ARR at risk by renewal window | windows: [30,60,90] |
| `team_workload` | Task distribution across CSMs | admin only |
| `lifecycle_progress` | Checklist completion rates | admin only |
| `health_trend` | Portfolio health score over time | admin only |
| `custom_accounts_table` | Ad-hoc account list with custom columns | columns, filters |

### Dashboard Types

**1. System defaults** (cannot be deleted):
- `csm_default`: shown to members on login. Widgets: ai_signals, my_tasks, renewals, high_risk
- `admin_default`: shown to admins. Widgets: portfolio_stats, team_workload, lifecycle_progress, renewal_pipeline
- `ae_default`: shown to AEs. Widgets: account_list (filtered to their accounts), renewals (their accounts), implementation_status

**2. Personal dashboards**: created by any user for themselves. Not visible to others.

**3. Shared dashboards (Admin-created)**: admin creates, assigns to a role or specific users. Read-only for recipients. Example: "CS Head Monthly Review", "AE Renewal Pipeline".

**4. Shareable link dashboards**: any dashboard can generate a `shareable_token` URL. The URL is accessible without login. Intended for: sharing with AEs who prefer not to log in, sending to CS Head for async review. Read-only.

### Dashboard Builder UI

Route: `/dashboards/new` and `/dashboards/[id]/edit`

- 12-column drag-and-drop grid (react-grid-layout)
- Widget picker: scrollable list of available widgets
- Click widget → adds to grid at default size
- Drag to reposition, resize by dragging corner
- Widget config panel: click widget → edit filter settings, date ranges, title
- "Save" → updates `dashboard_configs.layout` JSONB
- "Share" → enables `shareable_token`, shows shareable URL

### AE-Specific Dashboard

The `ae_default` system dashboard shows:
- Their assigned accounts (filtered via `ae_email = auth.email()`)
- Implementation status across those accounts (project phase, % complete, days to go-live)
- Renewal dates and ARR at risk
- Recent activity (last note, last task update per account)

AEs can also have custom dashboards built by the CS Lead and shared to them specifically.

---

## 13. PUBLIC PROJECT TRACKER

### Architecture

```
Client visits /p/[public_token]
  → No auth check (public route, excluded from middleware auth gate)
  → GET /api/p/[public_token]
  → Route handler:
      1. Look up project by public_token
      2. Check public_sharing_enabled = true
      3. Return: project name, account name, phases, milestones (client_visible only), tasks (client_visible only)
      4. Never return: other account data, contacts, internal notes, CSM details beyond name
  → Client renders read-only Gantt + phase/milestone list
```

### Data Visibility Rules

| Field | Visible to public? |
| --- | --- |
| Project name | Yes |
| Account name | Yes |
| CSM name | Yes |
| Phase names | Yes |
| Milestone names | Only if `client_visible = true` |
| Task names | Only if `client_visible = true` |
| Task owner name | Only if `client_visible = true` |
| Due dates | Only if `client_visible = true` |
| Internal notes | Never |
| Contacts | Never |
| ARR / financial data | Never |
| Health score | Never |

### Token Security
- `public_token` is a UUIDv4 — 122 bits of entropy, not guessable
- Rate limited: 60 requests/minute per IP from public route
- Can be regenerated (old token immediately invalidated) via `POST /api/projects/[id]/regenerate-token`
- Can be disabled per-project via `public_sharing_enabled = false`
- Can be disabled globally by admin via settings

---

## 14. OBSERVABILITY AND OPERATIONS

### Structured Logging

A middleware wrapper adds structured logging to all API routes:

```typescript
// src/lib/middleware/logger.ts
{
  request_id: string,      // UUID generated per request
  timestamp: string,       // ISO 8601
  method: string,
  path: string,
  user_id: string | null,
  role: string | null,
  status_code: number,
  duration_ms: number,
  error?: string
}
```

Logs are written to Vercel's built-in log drain (available in Vercel dashboard). For production-grade observability, connect to a log aggregator (Datadog, Logtail, or Axiom) via Vercel log drain.

### Error Alerting

- Sync job entering `dead` state → send Slack message to `#csops-alerts` channel
- Cron job failing for 3 consecutive runs → same alert
- Gmail draft creation failure → in-app toast to user + log entry
- Claude API error rate > 10% in 5-minute window → Slack alert

### Health Checks

`GET /api/health` (public, no auth):
```json
{
  "status": "ok",
  "db": "ok",
  "timestamp": "2026-03-26T10:00:00Z"
}
```

Vercel uptime monitoring can poll this endpoint.

### Environment Variables

| Variable | Purpose | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | No (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (bypasses RLS) | Yes |
| `ANTHROPIC_API_KEY` | Claude API | Yes |
| `GOOGLE_CLIENT_ID` | Gmail + Google OAuth client ID | No |
| `GOOGLE_CLIENT_SECRET` | Gmail OAuth secret | Yes |
| `CRON_SECRET` | Bearer token for cron route auth | Yes |
| `NEXT_PUBLIC_APP_URL` | App base URL (for OAuth callbacks) | No |

**SUPABASE\_SERVICE\_ROLE\_KEY usage policy:** Only used in cron handlers and admin-only server routes. Never used in client-side code or routes accessible to non-admin users.

### Database Backup Policy

Supabase handles automated backups. On Pro plan: daily backups retained for 7 days, point-in-time recovery for the last 7 days. Document the assumption: RPO = 24 hours, RTO = 2–4 hours (Supabase restore time).

---

## 15. ENVIRONMENT AND DEPLOYMENT

### Environments

| Environment | Branch | Purpose |
| --- | --- | --- |
| Production | `main` | Live — used by CS team |
| Preview | Any PR branch | Vercel preview deployment — for review before merge |
| Local | — | Developer machine with `.env.local` |

### Migration Workflow

```
1. Make schema changes locally using Supabase CLI
2. Generate migration: supabase db diff --file supabase/migrations/NNNN_description.sql
3. Test migration on local: supabase db reset
4. PR created → Vercel preview deploy (does NOT auto-run migrations)
5. Migration reviewed in PR
6. PR merged → run migration manually on production: supabase db push
7. Document applied migrations in supabase/migrations/APPLIED.md
```

**Rule:** Never apply a migration to production that hasn't been tested locally against a fresh db reset.

### Pending Migrations (apply before Phase 2)

```sql
-- Migration 0003: lifecycle_stage type fix
ALTER TABLE accounts ALTER COLUMN lifecycle_stage TYPE TEXT[];
-- (verify actual column type in live project first — may already be TEXT[])

-- Migration 0004: meeting_notes dedup constraint
ALTER TABLE meeting_notes
  ADD CONSTRAINT meeting_notes_external_id_key
  UNIQUE (external_id)
  WHERE external_id IS NOT NULL;

-- Migration 0005: granola_last_synced_at on account_integrations
ALTER TABLE account_integrations
  ADD COLUMN IF NOT EXISTS granola_last_synced_at TIMESTAMPTZ;

-- Migration 0006: pg_trgm for name matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_accounts_name_trgm ON accounts USING GiST (name gist_trgm_ops);

-- Migration 0007: role in JWT (Auth Hook — configure in Supabase dashboard, not SQL)
-- Supabase → Authentication → Hooks → Custom Access Token Hook
-- Set function: return modified JWT with app_metadata.role = profiles.role
```

---

## 16. KNOWN TECHNICAL DEBT REGISTER

This register documents known shortcuts taken for speed. Each entry has an estimated remediation effort and a trigger condition for when it should be addressed.

| ID | Issue | Current State | Risk | Remediation Effort | Trigger |
| --- | --- | --- | --- | --- | --- |
| TD-01 | No server-side input validation on write routes | Raw body passed to DB | Data corruption, security | 2 days | Must fix before Phase 2 |
| TD-02 | Granola sync is synchronous (504 risk) | Single HTTP request | Silent production failures | 3 days | Must fix before nightly cron |
| TD-03 | lifecycle_stage column type mismatch | TEXT vs TEXT[] ambiguity | Silent data corruption | 2 hours | Must fix before any new accounts written |
| TD-04 | No unique constraint on meeting_notes.external_id | Dedup contract not enforced | Duplicate notes on re-sync | 30 minutes | Must fix before Granola sync promoted to production |
| TD-05 | Role check is DB lookup per admin request | Per-request Supabase query in middleware | Latency + availability risk | 1 day | Fix when admin user count > 5 or latency complaints |
| TD-06 | CSV import sends full payload as single body | No chunking, no size limit | 413 on large exports | 1 day | Fix before first large (>500 row) CSV import |
| TD-07 | AI output stored as JSONB metadata blob | Unqueryable, no downstream effect | Data graveyard | 2 days | Must fix before Granola sync promoted to production |
| TD-08 | No rate limiting on any route | Open to accidental DoS from cron runaway | Reliability | 4 hours | Must fix before cron jobs are enabled |
| TD-09 | No structured request logging | Zero visibility into failures | Debuggability | 1 day | Must add before Phase 2 |
| TD-10 | No migration runner in deploy pipeline | Manual `supabase db push` | Schema drift across envs | 1 day | Fix before second engineer joins the project |
| TD-11 | matching.ts uses ilike loop | N sequential unindexed queries | Performance at scale | 2 hours | Fix concurrently with pg_trgm migration |

**Remediation order for Phase 2 readiness:**
TD-04 → TD-03 → TD-01 → TD-02 → TD-07 → TD-08 → TD-09 (in that sequence)

---

*End of Technical Architecture Document v1.0*
