# Account Data Import

Account data is loaded via a CSV upload through the app's admin import tool. There is no automated sync from ChurnZero or Salesforce yet — this is a manual process.

---

## How to Access the Import Tool

1. Log in with an **admin** account
2. Go to **Settings → Import** (or navigate to `/import`)
3. Upload your CSV file
4. Map columns (the app auto-detects most ChurnZero export headers)
5. Review the preview
6. Click **Import**

---

## CSV Format

The importer accepts ChurnZero export format directly. It auto-maps these headers:

| Your CSV Column | Maps to |
|-----------------|---------|
| `name` / `Account Name` / `Customer` | Account name |
| `csm_email` / `CSM Owner Email` | CSM assignment (matched to platform users by email) |
| `csm_name` / `CSM` / `Account Owner` | CSM name (fallback if email not found) |
| `arr` / `Annual Recurring Revenue` | ARR |
| `renewal_date` / `Contract Renewal` | Renewal date |
| `health_score` / `ChurnScore` | Health score |
| `sentiment` / `CSM Pulse` | Risk level |
| `lifecycle_stage` / `5A Stage` | Lifecycle stage |
| `tier` / `Account Tier` | Account tier |
| `region` / `Geo` | Region |
| `industry` / `Vertical` | Industry |
| `customer_type` | IGA vs SMP etc. |
| `modules_purchased` | Products/modules |
| `status` / `Account Status` | Active / churned etc. |
| `employee_count` / `Headcount` | Company size |
| `email_domain` | Used for Granola call matching |

The full list of supported column patterns is in `src/lib/csv/parser.ts`.

---

## CSM-to-Account Mapping

The app resolves CSM assignment from the CSV by:

1. **Email match (preferred):** If the CSV has a `csm_email` column, it looks up that email in the platform's user list and assigns `owner_id`
2. **Name match (fallback):** If only `csm_name` is present, it tries to match by full name

**For this to work correctly:**
- All CSMs must have accounts in the platform BEFORE you import
- Their email addresses must match exactly (case-insensitive)
- Ask Shrikant to create user accounts for the full team if not done

---

## Import Behaviour

- **Upsert by `org_id`:** If a CSV row has an `org_id` matching an existing account, it updates rather than creates a duplicate
- **New accounts:** Created fresh
- **CSM match fail:** Account is imported but left unassigned (visible in admin panel)
- **Errors:** Shown per-row after import. Download the error report to fix and re-import

---

## Is the Data Current?

**Ask Shrikant:**
- When was the last import done?
- Is there a saved CSV export that's the source of truth?
- Are all CSM assignments correct?

The app has no real-time ChurnZero sync. Every time CSM assignments or account data changes in ChurnZero, you need to re-import.

---

## Re-importing (Updating Existing Data)

Safe to re-import — rows are upserted by `org_id` so no duplicates are created.

```
Workflow:
1. Export from ChurnZero (Accounts → Export)
2. Go to app → Settings → Import
3. Upload → review mapping → import
4. Check error report
```

---

## What's Not in the CSV (Manual Entry Only)

- **Projects** — created manually per account in the app
- **Tasks** — created manually or via AI suggestions from call logs
- **Notes** — synced from Granola, not via CSV
- **Health score overrides** — set manually in account detail
