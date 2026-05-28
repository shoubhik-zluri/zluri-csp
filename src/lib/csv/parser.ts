import type { AccountStatus, AccountTier, ContractType, CustomerType, ExecEngagement, LifecycleStage, RenewalStage, Segment, Sentiment } from '@/types/database'

// Maps common CSV header patterns to internal DB field names
// Supports ChurnZero export headers out of the box
export const COLUMN_MAPPINGS: Array<{ patterns: RegExp; field: string }> = [
  { patterns: /^(org_id|organization_id|account_id|external_id|churnzero_id|cz_id)$/i, field: 'org_id' },
  { patterns: /^(name|company|account[\s_]?name|customer[\s_]?name|customer)$/i, field: 'name' },
  { patterns: /^(arr|annual[\s_]?recurring[\s_]?revenue|annual[\s_]?revenue|mrr_x12)$/i, field: 'arr' },
  { patterns: /^(renewal[\s_]?date|contract[\s_]?renewal|renew[\s_]?date|expiry[\s_]?date)$/i, field: 'renewal_date' },
  { patterns: /^(contract[\s_]?type|plan[\s_]?type|subscription[\s_]?type|billing[\s_]?cycle)$/i, field: 'contract_type' },
  { patterns: /^(csm[\s_]?email|csm[\s_]?owner[\s_]?email|owner[\s_]?email)$/i, field: 'csm_email' },
  { patterns: /^(csm|csm[\s_]?name|csm[\s_]?owner|account[\s_]?owner|customer[\s_]?success[\s_]?manager|owner)$/i, field: 'csm_name' },
  { patterns: /^(health|health[\s_]?score|churn[\s_]?score|churnscore|cs[\s_]?score)$/i, field: 'health_score' },
  { patterns: /^(pulse|csm[\s_]?pulse|sentiment|risk[\s_]?level|account[\s_]?health)$/i, field: 'sentiment' },
  { patterns: /^(stage|lifecycle[\s_]?stage|5a[\s_]?stage|customer[\s_]?stage|journey[\s_]?stage)$/i, field: 'lifecycle_stage' },
  { patterns: /^(renewal[\s_]?stage|renewal[\s_]?status|opp[\s_]?stage)$/i, field: 'renewal_stage' },
  { patterns: /^(industry|vertical|sector)$/i, field: 'industry' },
  { patterns: /^(region|territory|geo|geography)$/i, field: 'region' },
  { patterns: /^(employee[\s_]?count|employees|company[\s_]?size|headcount)$/i, field: 'employee_count' },
  { patterns: /^(website|domain|url|company[\s_]?url)$/i, field: 'website' },
  { patterns: /^(notes|account[\s_]?notes|comments|description)$/i, field: 'notes' },
  // Extended account fields
  { patterns: /^(customer[\s_]?since|customer[\s_]?start[\s_]?date|go[\s_]?live[\s_]?date|start[\s_]?date)$/i, field: 'customer_since' },
  { patterns: /^(contract[\s_]?renewal[\s_]?date|contract[\s_]?end[\s_]?date)$/i, field: 'contract_renewal_date' },
  { patterns: /^(partner[\s_]?sourced|partner[\s_]?led|is[\s_]?partner)$/i, field: 'partner_sourced' },
  { patterns: /^(partner[\s_]?name|partner|reseller)$/i, field: 'partner_name' },
  { patterns: /^(ae|account[\s_]?executive|ae[\s_]?name|associated[\s_]?ae)$/i, field: 'associated_ae' },
  { patterns: /^(cse|customer[\s_]?solutions[\s_]?engineer|associated[\s_]?cse|se[\s_]?name)$/i, field: 'associated_cse' },
  { patterns: /^(customer[\s_]?type|product[\s_]?type|iga[\s_]?smp|type)$/i, field: 'customer_type' },
  { patterns: /^(tier|account[\s_]?tier|customer[\s_]?tier|segment[\s_]?tier)$/i, field: 'tier' },
  { patterns: /^(multi[\s_]?year|multiyear[\s_]?contract|multi[\s_]?year[\s_]?deal)$/i, field: 'multiyear_contract' },
  { patterns: /^(modules|modules[\s_]?purchased|products|product[\s_]?list|subscriptions)$/i, field: 'modules_purchased' },
  { patterns: /^(status|account[\s_]?status|customer[\s_]?status|active[\s_]?status)$/i, field: 'status' },
  { patterns: /^(segment|market[\s_]?segment|account[\s_]?segment)$/i, field: 'segment' },
  { patterns: /^(exec[\s_]?engagement|executive[\s_]?engagement|exec[\s_]?sponsor[\s_]?activity)$/i, field: 'exec_engagement' },
  // Integration mapping fields
  { patterns: /^(slack[\s_]?channel|slack[\s_]?channel[\s_]?name)$/i, field: 'slack_channel_name' },
  { patterns: /^(email[\s_]?domain|customer[\s_]?domain)$/i, field: 'email_domain' },
  { patterns: /^(jira[\s_]?project|jira[\s_]?key|jira[\s_]?project[\s_]?key)$/i, field: 'jira_project_key' },
]

export function autoMapColumn(header: string): string | null {
  for (const { patterns, field } of COLUMN_MAPPINGS) {
    if (patterns.test(header.trim())) return field
  }
  return null
}

export function buildAutoMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const header of headers) {
    const field = autoMapColumn(header)
    if (field) mapping[header] = field
  }
  return mapping
}

// Value normalizers

const SENTIMENT_MAP: Record<string, Sentiment> = {
  'high risk': 'high_risk',
  'high_risk': 'high_risk',
  'highrisk': 'high_risk',
  'red': 'high_risk',
  'at risk': 'high_risk',
  'some risk': 'some_risk',
  'some_risk': 'some_risk',
  'somerisk': 'some_risk',
  'yellow': 'some_risk',
  'amber': 'some_risk',
  'good': 'good',
  'green': 'good',
  'healthy': 'good',
}

const LIFECYCLE_MAP: Record<string, LifecycleStage> = {
  'acquisition': 'acquisition',
  'activate': 'activation',
  'activation': 'activation',
  'adopt': 'adoption',
  'adoption': 'adoption',
  'amplify': 'amplification',
  'amplification': 'amplification',
  'advocate': 'advocacy',
  'advocacy': 'advocacy',
}

const RENEWAL_STAGE_MAP: Record<string, RenewalStage> = {
  'not started': 'not_started',
  'not_started': 'not_started',
  'in discussion': 'in_discussion',
  'in_discussion': 'in_discussion',
  'discussing': 'in_discussion',
  'quote sent': 'quote_sent',
  'quote_sent': 'quote_sent',
  'quoted': 'quote_sent',
  'negotiating': 'negotiating',
  'negotiation': 'negotiating',
  'renewed': 'renewed',
  'closed won': 'renewed',
  'churned': 'churned',
  'lost': 'churned',
  'closed lost': 'churned',
  'at risk': 'at_risk',
  'at_risk': 'at_risk',
}

const CONTRACT_TYPE_MAP: Record<string, ContractType> = {
  'monthly': 'monthly',
  'month': 'monthly',
  'month-to-month': 'monthly',
  'annual': 'annual',
  'annually': 'annual',
  'yearly': 'annual',
  '1 year': 'annual',
  'multi-year': 'multi-year',
  'multiyear': 'multi-year',
  'multi year': 'multi-year',
  '2 year': 'multi-year',
  '3 year': 'multi-year',
}

const CUSTOMER_TYPE_MAP: Record<string, CustomerType> = {
  'iga': 'IGA',
  'smp': 'SMP',
}

const TIER_MAP: Record<string, AccountTier> = {
  'tier 1': 'Tier 1',
  'tier1': 'Tier 1',
  'tier 2': 'Tier 2',
  'tier2': 'Tier 2',
  'tier 3': 'Tier 3',
  'tier3': 'Tier 3',
  'tier 4': 'Tier 4',
  'tier4': 'Tier 4',
}

const ACCOUNT_STATUS_MAP: Record<string, AccountStatus> = {
  'active': 'active',
  'churned': 'churned',
  'inactive': 'churned',
  'lost': 'churned',
  'closed lost': 'churned',
  'closed': 'churned',
}

const SEGMENT_MAP: Record<string, Segment> = {
  'enterprise': 'enterprise',
  'enterprise (1000+ emp)': 'enterprise',
  'enterprise+': 'enterprise',
  'large enterprise': 'enterprise',
  '1000+': 'enterprise',
  'mid market': 'mid_market',
  'mid-market': 'mid_market',
  'mid_market': 'mid_market',
  'mid market (250-1000 emp)': 'mid_market',
  'midmarket': 'mid_market',
  '250-1000': 'mid_market',
  'smb': 'smb',
  'smb (1-250 emp)': 'smb',
  'small business': 'smb',
  'small': 'smb',
  '1-250': 'smb',
}

const EXEC_ENGAGEMENT_MAP: Record<string, ExecEngagement> = {
  'platform login': 'platform_login',
  'platform_login': 'platform_login',
  'cadence with csm': 'cadence_with_csm',
  'cadence_with_csm': 'cadence_with_csm',
  'qbr current quarter': 'qbr_current_quarter',
  'qbr_current_quarter': 'qbr_current_quarter',
  'qbr': 'qbr_current_quarter',
  'meets cs leadership': 'meets_cs_leadership',
  'meets_cs_leadership': 'meets_cs_leadership',
  'personally escalates': 'personally_escalates',
  'personally_escalates': 'personally_escalates',
  'attends cab': 'attends_cab',
  'attends_cab': 'attends_cab',
  'cab': 'attends_cab',
  'requests report': 'requests_report',
  'requests_report': 'requests_report',
}

export function normalizeValue(field: string, raw: string): { value: unknown; error?: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { value: null }

  switch (field) {
    case 'arr': {
      const cleaned = trimmed.replace(/[$,\s]/g, '')
      const num = parseFloat(cleaned)
      if (isNaN(num)) return { value: null, error: `"${raw}" is not a valid number` }
      return { value: num }
    }
    case 'health_score': {
      const num = parseInt(trimmed)
      if (isNaN(num) || num < 0 || num > 100)
        return { value: null, error: `"${raw}" must be a number 0–100` }
      return { value: num }
    }
    case 'employee_count': {
      const num = parseInt(trimmed.replace(/,/g, ''))
      if (isNaN(num)) return { value: null, error: `"${raw}" is not a valid number` }
      return { value: num }
    }
    case 'renewal_date': {
      const date = new Date(trimmed)
      if (isNaN(date.getTime())) return { value: null, error: `"${raw}" is not a valid date` }
      return { value: date.toISOString().split('T')[0] }
    }
    case 'sentiment': {
      // Support numeric values: 1–33 = high_risk, 34–66 = some_risk, 67–100 = good
      const num = parseFloat(trimmed)
      if (!isNaN(num)) {
        if (num <= 33) return { value: 'high_risk' }
        if (num <= 66) return { value: 'some_risk' }
        return { value: 'good' }
      }
      const mapped = SENTIMENT_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" is not a valid sentiment value` }
      return { value: mapped }
    }
    case 'lifecycle_stage': {
      // Support comma-separated values e.g. "Adoption, Amplification"
      const parts = trimmed.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
      const mapped = parts.map((p) => LIFECYCLE_MAP[p]).filter(Boolean) as LifecycleStage[]
      if (mapped.length === 0) return { value: null, error: `"${raw}" is not a valid lifecycle stage` }
      return { value: mapped }
    }
    case 'renewal_stage': {
      const mapped = RENEWAL_STAGE_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" is not a valid renewal stage` }
      return { value: mapped }
    }
    case 'contract_type': {
      const mapped = CONTRACT_TYPE_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" is not a valid contract type` }
      return { value: mapped }
    }
    case 'customer_since':
    case 'contract_renewal_date': {
      const date = new Date(trimmed)
      if (isNaN(date.getTime())) return { value: null, error: `"${raw}" is not a valid date` }
      return { value: date.toISOString().split('T')[0] }
    }
    case 'partner_sourced':
    case 'multiyear_contract': {
      const lower = trimmed.toLowerCase()
      if (['true', 'yes', '1', 'y'].includes(lower)) return { value: true }
      if (['false', 'no', '0', 'n'].includes(lower)) return { value: false }
      return { value: null, error: `"${raw}" must be yes/no or true/false` }
    }
    case 'customer_type': {
      const mapped = CUSTOMER_TYPE_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" must be IGA or SMP` }
      return { value: mapped }
    }
    case 'tier': {
      const mapped = TIER_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" must be Tier 1–4` }
      return { value: mapped }
    }
    case 'modules_purchased': {
      const parts = trimmed.split(/[,;]+/).map((s) => s.trim()).filter(Boolean)
      return { value: parts }
    }
    case 'status': {
      const mapped = ACCOUNT_STATUS_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" must be active or churned` }
      return { value: mapped }
    }
    case 'segment': {
      const mapped = SEGMENT_MAP[trimmed.toLowerCase()]
      if (!mapped) return { value: null, error: `"${raw}" must be Enterprise, Mid Market, or SMB` }
      return { value: mapped }
    }
    case 'exec_engagement': {
      // Support comma-separated multi-values e.g. "Platform Login, Attends CAB"
      const parts = trimmed.split(/[,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean)
      const mapped = parts.map((p) => EXEC_ENGAGEMENT_MAP[p]).filter(Boolean) as ExecEngagement[]
      if (mapped.length === 0) return { value: null, error: `"${raw}" is not a valid exec engagement value` }
      return { value: mapped }
    }
    default:
      return { value: trimmed }
  }
}

export const REQUIRED_FIELDS = ['name'] as const
export const IDENTIFIER_FIELDS = ['org_id', 'name'] as const

export const DB_FIELD_LABELS: Record<string, string> = {
  org_id: 'Organization ID *',
  name: 'Account Name *',
  arr: 'ARR',
  renewal_date: 'Renewal Date',
  contract_type: 'Contract Type',
  csm_email: 'CSM Email',
  csm_name: 'CSM Name',
  health_score: 'Health Score',
  sentiment: 'CSM Pulse',
  lifecycle_stage: 'Lifecycle Stage',
  renewal_stage: 'Renewal Stage',
  industry: 'Industry',
  region: 'Region',
  employee_count: 'Employee Count',
  website: 'Website',
  notes: 'Notes',
  customer_since: 'Customer Since',
  contract_renewal_date: 'Contract Renewal Date',
  partner_sourced: 'Partner Sourced',
  partner_name: 'Partner Name',
  associated_ae: 'Associated AE',
  associated_cse: 'Associated CSE',
  customer_type: 'Customer Type (IGA/SMP)',
  tier: 'Tier',
  multiyear_contract: 'Multi-Year Contract',
  modules_purchased: 'Modules Purchased',
  status: 'Account Status',
  exec_engagement: 'Exec Engagement',
  segment: 'Segment',
  slack_channel_name: 'Slack Channel',
  email_domain: 'Email Domain',
  jira_project_key: 'Jira Project Key',
  skip: '— Skip this column —',
}
