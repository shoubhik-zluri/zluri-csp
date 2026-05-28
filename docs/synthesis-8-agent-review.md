# Zluri CSP — 8-Agent Analysis Synthesis
**Date:** 2026-03-26
**Status:** Ready for stakeholder review
**Purpose:** Consolidated findings from 8 specialist agent reviews of the MVP. Basis for PRD + TAD development.

---

## HOW TO READ THIS DOCUMENT

Eight specialist agents — CSM, PM, Scrum Master, System Architect, UX Designer, CRO, CFO, CEO — independently reviewed the MVP plan and codebase. Their findings are synthesized here by theme. Where multiple agents flagged the same issue, the overlap is noted. The synthesis ends with a consolidated priority stack and the open strategic question that must be answered before the PRD can be finalized.

---

## AGENT SUMMARIES

### 1. CSM (Customer Success Strategy)
> **Verdict:** Record-keeping system masquerading as a command center.

The health score is a manually entered integer with no behavioral grounding — a liability, not an asset. There is no signal for "when did we last talk to this customer?" The dashboard is not scoped to individual CSMs. The renewal stage is a static dropdown, not a workflow with stages, owners, and next actions. Action items extracted from meeting notes don't automatically create tasks. Risk signals are decorative — they exist as tags with no playbook attached.

**Bold Challenge:** Zluri's own product telemetry should be the primary health signal. No third-party CSP can replicate this. Not using it is a strategic choice to be worse than you could be.

---

### 2. Project Manager
> **Verdict:** The tool manages records, not implementation work.

Success plans are flat task lists, not implementation timelines. There is no cross-functional ownership model — tasks have a single `owner_id` but no collaborators, stakeholders, or dependency links. There is no escalation workflow. There is no account activity log (who did what, when). Blockers cannot be modeled. When a delivery risk emerges — a customer hasn't completed their onboarding phase — the CSP has no way to surface it.

**Bold Challenge:** The platform needs an `implementation` entity distinct from a success plan — one that tracks milestones, dependencies, and blockers, not just tasks with due dates.

---

### 3. Scrum Master (Agile Delivery)
> **Verdict:** The sprints are waterfall phases in disguise. Zero acceptance criteria written. No Definition of Done.

Phase 2 scope (email domain field, agent interface, account_integrations table) was already shipped into the MVP schema without documentation. CSMs were not involved in the design. There is no user feedback loop. The email domain field in `account_integrations` — critical for Granola matching — has no reliable ingestion path for accounts not imported via ChurnZero CSV.

**Bold Challenge:** The CSV import flow may be the wrong centerpiece for onboarding. If CSMs cannot reliably get email domains into the system, the entire integration matching chain fails silently.

---

### 4. System Architect
> **Verdict:** Solid bones. The connective tissue is a pre-Phase 2 blocker.

**Critical issues:**
- Zero server-side input validation on any write endpoint. RLS protects authorization; it does not validate data. A legitimate user can corrupt records.
- Granola sync is synchronous and will 504 in production. No transaction wrapping means partial failures leave inconsistent data. No unique constraint on `meeting_notes.external_id` breaks the dedup contract.
- `lifecycle_stage` is typed as `TEXT[]` in TypeScript and components but the migration defines it as `TEXT CHECK` — a silent data integrity failure on any real database.

**High issues:**
- Middleware does a live DB lookup on every admin route navigation (role check). Should be a JWT claim.
- CSV import sends the full parsed dataset as a single JSON body with no size limit — will fail with a 413 on large ChurnZero exports.

**Bold Challenge:** AI output is being stored as JSONB metadata blobs with no downstream effect on the data model. If you do not define AI output as structured rows before Phase 2, you will rebuild this layer when someone asks why the health score doesn't update after a bad meeting.

---

### 5. UX Designer
> **Verdict:** Optimized for the person who built it, not the person who will use it under pressure.

**Critical gaps:**
- No text search on the accounts list — the highest-frequency daily interaction is completely unaddressed.
- The lifecycle stage multi-select is a hacked Select component that always shows `__add` as its internal value — will confuse users and is fragile.
- Notes are write-once — a CSM who typos a note must delete and re-enter it entirely.
- Success plan creation doesn't exist in the UI — a core named feature is inaccessible to real users.
- All three delete actions use browser `confirm()` — inaccessible, unundoable, jarring.

**Bold Challenge:** The account-centric navigation model (pick account → take action) is wrong for how CSMs actually work. CS work is event-driven and task-first, not account-browsing. The dashboard should be a work queue ("what needs my attention now across all accounts"), not a status board.

---

### 6. CRO (Revenue Strategy)
> **Verdict:** Zero expansion motion. The tool watches churn happen without enabling anyone to prevent it.

No NRR/GRR visibility anywhere. Risk signals are decorative tags with no playbook — a CSM can mark an account "high risk" but the system provides no guidance on what to do next. No manager or CRO-level portfolio view. Health score being manual means it is directionally wrong and legally cannot be used for forecasting or board reporting.

**Bold Challenge:** Need a Customer ROI Dashboard — showing the value Zluri has actually delivered (license savings, app consolidations, shadow IT reduction) per account. This is the renewal justification artifact that currently does not exist and is the primary reason CSMs lose renewals they should win.

---

### 7. CFO
> **Verdict:** The build decision was never formally justified. The tool has no financial memory.

No CSM productivity measurement. No NRR/GRR/churn tracking at the portfolio level. No finance-accessible reporting. The health score has no formula, no history, and no audit trail — it cannot support any financial model. The tool's own costs are not tracked anywhere. No baseline was established before the build started.

**Bold Challenge:** If you could run Vitally or Gainsight Essentials for $30K/year and this build cost $150K+ in engineering time, what is the payback period? That calculation has never been done, which means you cannot defend the build decision and cannot know whether to continue investing.

---

### 8. CEO (Strategic)
> **Verdict:** The team is building a ChurnZero replacement when they could be building a ChurnZero successor.

The presence of the Claude pipeline (Granola → AI insights → structured output) is a data flywheel in embryo. Combined with Zluri's own product usage data — which no third-party CSP can access — this could be a genuinely differentiated platform. The current framing as an "internal tool" is suppressing ambition: internal tools get internal budgets, internal timelines, and internal quality bars.

**Bold Challenge:** Stop calling this an internal tool. Zluri's customers are SaaS companies with CS teams who are using ChurnZero, Gainsight, or Salesforce Service Cloud — none of which have AI that reads meeting transcripts and matches them to accounts, and none of which can be natively wired to Zluri's usage data for behavioral health scores. The market for AI-native CS tooling is open. The question the leadership team has not asked out loud: is this a tool Zluri uses, or a product Zluri sells?

---

## CROSS-CUTTING THEMES

### Theme 1: The Health Score is the #1 Problem (CSM, CRO, CFO, CEO)

Four of eight agents independently flagged the manual health score as the single highest-priority fix. It is not a disagreement about importance — it is universal. A manually entered integer:
- Cannot support financial forecasting (CFO)
- Creates false confidence and bad renewal decisions (CRO)
- Provides no signal for CSM prioritization (CSM)
- Undermines the product's credibility as an intelligence system (CEO)

**Synthesized recommendation:** Define a computed health score formula before any other feature work. The formula should include: Zluri product usage signals (active users, license utilization), meeting sentiment trend from Granola AI insights, engagement indicators (exec engagement level, days since last meeting, cadence frequency). CSMs can override but the default is computed and continuous.

---

### Theme 2: AI Output Has No Downstream Effect (Architect, CEO, CSM, CRO)

The Claude pipeline works. It fetches Granola transcripts, extracts risk signals, action items, and sentiment hints. These land in a `metadata JSONB` blob in `meeting_notes`. They then do nothing.

They are not surfaced on the account overview. They don't populate `accounts.risk_signals`. Action items don't become tasks. Sentiment hints don't influence the health score. The extraction runs and produces structured data that the product ignores.

**Synthesized recommendation:** Close the AI loop before adding more integrations. Extracted action items → tasks table with `source = 'ai'`. Risk signals → merged into `accounts.risk_signals` with CSM confirmation. Meeting sentiment → tracked as a time series, not a one-time metadata field. Define the AI output contract in the schema, not in a JSONB blob.

---

### Theme 3: The Product Has No Workflow — Only Records (CSM, PM, CRO, UX)

Every action the CSP takes today is a create/read/update/delete operation on records. There is no workflow layer — no triggered next actions, no playbooks, no escalation paths, no automation rules. A CSM can mark an account "high risk" but nothing happens as a result. A renewal can enter the 30-day window and no alert fires. A meeting note can surface 3 action items and they stay in the note.

**Synthesized recommendation:** Design a lightweight workflow layer — triggers + actions — as part of the PRD. At minimum: automated task creation from AI-extracted action items, renewal proximity alerts (30/60/90 day), risk signal escalation to CSM manager when threshold crossed, playbook attachment per risk signal type.

---

### Theme 4: Success Plans Are Architecturally Sound but UX-Inaccessible (PM, UX, Scrum Master)

The data model supports success plans correctly — `success_plans` table, `plan_id` on tasks. The feature is invisible to users because there is no UI to create a plan. The task form's plan dropdown is hidden when no plans exist. The only way a plan can exist is if seeded directly into the database.

**Synthesized recommendation:** Ship success plan creation UI before launch. This is not a Phase 2 feature — it is a MVP gap.

---

### Theme 5: Technical Debt Is Pre-Phase 2 Critical (Architect, Scrum Master)

The system architect identified four blockers that must be resolved before Phase 2 integration work begins:
1. Input validation (zero server-side validation on write routes)
2. Unique constraint on `meeting_notes.external_id` + `lifecycle_stage` column type fix
3. Async job pattern for sync (current sync will 504 in production at real data volumes)
4. Structured AI output model (JSONB blobs are not queryable)

None of these are visible to end users today. All four will cause failures when Phase 2 ships.

---

### Theme 6: The Strategic Question Is Unanswered (CEO, CFO, CRO)

**Is this a tool Zluri uses, or a product Zluri sells?**

Three agents converged on this from different angles. The CEO framed it as a market opportunity. The CFO flagged the build decision has no formal justification and no payback calculation. The CRO noted there is no expansion motion — the tool generates no revenue and tracks no revenue impact.

This question must be answered before the PRD is scoped. A PRD for an internal tool and a PRD for a product are different documents with different definitions of success.

---

## OPEN ITEMS REQUIRING STAKEHOLDER INPUT

Before the PRD can be written, the following need explicit decisions:

1. **Internal tool vs. product?** → This determines the ambition, investment level, and success metrics for everything else.

2. **Health score formula ownership** → Who defines the formula? CS lead + Head of Data? It needs a business decision, not just an engineering one.

3. **Zluri product data access** → Is there a way to pull customer usage data (active users, license utilization per account) into the CSP? Who owns that API/connection? What is the data sharing policy?

4. **Phase 2 sequencing** → Given the AI loop closure gap, should the next sprint prioritize surfacing AI insights over new integrations (Slack, Gmail, Jira)?

5. **Success plans scope** → Is an implementation tracking entity (milestones, dependencies, blockers) in scope for v1.1, or is it a later phase?

6. **CSM workflow preferences** → Account-centric navigation vs. work-queue navigation — this needs user research or at minimum a CSM preference interview before designing the new dashboard.

---

## CONSOLIDATED PRIORITY STACK

Ordered by impact × urgency. These are recommendations — the user will provide final prioritization.

**Tier 1 — Must resolve before any new features**
1. Computed health score (with Zluri product data feed if accessible)
2. Close the AI loop: extracted insights → structured rows (tasks, risk signals, sentiment history)
3. Input validation on all write routes (security + data integrity)
4. Async sync pattern (Granola and all Phase 2 integrations)
5. `meeting_notes.external_id` unique constraint + `lifecycle_stage` column type fix

**Tier 2 — High-value UX/feature gaps blocking real use**
6. Text search on accounts list
7. Success plan creation UI
8. Note editing
9. Dashboard redesign: work queue instead of status board
10. Replace all `confirm()` dialogs with toast-undo pattern

**Tier 3 — Workflow layer (new capability)**
11. Automated task creation from AI-extracted action items
12. Renewal proximity alerts (30/60/90 day)
13. Playbook framework: attach next actions to risk signal types
14. CSM-scoped portfolio view vs. manager portfolio view

**Tier 4 — Phase 2 integrations (after Tier 1 complete)**
15. Granola sync on a schedule (remove manual trigger)
16. Clari integration (renewal intelligence)
17. Slack signal monitoring
18. Zluri product usage data feed (if confirmed in scope)

**Not prioritized (internal tool framing)**
- Mobile sidebar
- Gmail integration (low signal-to-noise)
- Cmd+K global search (nice to have, not strategic)

---

## WHAT HAPPENS NEXT

1. Stakeholder reviews this document and adds inputs / challenges findings
2. Open items above are answered (or deferred with explicit acknowledgment)
3. PRD is drafted: business and product requirements, MoSCoW prioritization, success metrics
4. TAD is drafted in parallel: system design decisions, API contracts, schema changes, integration architecture
5. Dummy data seeding strategy included in the rollout plan (not the PRD)
