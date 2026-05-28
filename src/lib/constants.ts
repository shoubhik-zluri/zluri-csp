import type { Sentiment, LifecycleStage, ExecEngagement, RenewalStage, TaskStatus, TaskPriority, TaskVisibility, PlanStatus, ContractType, CustomerType, AccountTier, AccountStatus, ProjectStatus, Segment } from '@/types/database'

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  high_risk: 'High Risk',
  some_risk: 'Some Risk',
  good: 'Good',
}

export const SENTIMENT_COLORS: Record<Sentiment, string> = {
  high_risk: 'bg-red-100 text-red-700 border-red-200',
  some_risk: 'bg-amber-100 text-amber-700 border-amber-200',
  good: 'bg-green-100 text-green-700 border-green-200',
}

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  acquisition: 'Acquisition',
  activation: 'Activation',
  adoption: 'Adoption',
  amplification: 'Amplification',
  advocacy: 'Advocacy',
}

export const LIFECYCLE_STAGE_COLORS: Record<LifecycleStage, string> = {
  acquisition: 'bg-slate-100 text-slate-700',
  activation: 'bg-blue-100 text-blue-700',
  adoption: 'bg-indigo-100 text-indigo-700',
  amplification: 'bg-violet-100 text-violet-700',
  advocacy: 'bg-purple-100 text-purple-700',
}

export const EXEC_ENGAGEMENT_LABELS: Record<ExecEngagement, string> = {
  platform_login: 'Platform Login',
  cadence_with_csm: 'Cadence with CSM',
  qbr_current_quarter: 'QBR Current Quarter',
  meets_cs_leadership: 'Meets CS Leadership',
  personally_escalates: 'Personally Escalates',
  attends_cab: 'Attends CAB',
  requests_report: 'Requests Report',
}

export const RENEWAL_STAGE_LABELS: Record<RenewalStage, string> = {
  not_started: 'Not Started',
  in_discussion: 'In Discussion',
  quote_sent: 'Quote Sent',
  negotiating: 'Negotiating',
  renewed: 'Renewed',
  churned: 'Churned',
  at_risk: 'At Risk',
}

export const RENEWAL_STAGE_COLORS: Record<RenewalStage, string> = {
  not_started: 'bg-slate-100 text-slate-600',
  in_discussion: 'bg-blue-100 text-blue-700',
  quote_sent: 'bg-cyan-100 text-cyan-700',
  negotiating: 'bg-amber-100 text-amber-700',
  renewed: 'bg-green-100 text-green-700',
  churned: 'bg-red-100 text-red-700',
  at_risk: 'bg-orange-100 text-orange-700',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending_review: 'Pending Review',
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending_review: 'bg-amber-100 text-amber-700',
  open: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-400 line-through',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-slate-100 text-slate-600',
  low: 'bg-gray-100 text-gray-500',
}

export const VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  private: 'Private',
  internal: 'Internal',
  external: 'External',
}

export const VISIBILITY_COLORS: Record<TaskVisibility, string> = {
  private: 'bg-slate-100 text-slate-600',
  internal: 'bg-blue-50 text-blue-700',
  external: 'bg-emerald-50 text-emerald-700',
}

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
}

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  monthly: 'Monthly',
  annual: 'Annual',
  'multi-year': 'Multi-Year',
}

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  IGA: 'IGA',
  SMP: 'SMP',
}

export const TIER_LABELS: Record<AccountTier, string> = {
  'Tier 1': 'Tier 1',
  'Tier 2': 'Tier 2',
  'Tier 3': 'Tier 3',
  'Tier 4': 'Tier 4',
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  churned: 'Churned',
}

export const SEGMENT_LABELS: Record<Segment, string> = {
  enterprise: 'Enterprise (1000+ Emp)',
  mid_market: 'Mid Market (250–1000 Emp)',
  smb: 'SMB (1–250 Emp)',
}

// Fixed module options for modules_purchased multi-select
export const MODULE_OPTIONS = [
  'SMP',
  'IVIP',
  'Access Management',
  'Access Request',
  'User Access Review',
] as const

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  on_track:  'On Track',
  delayed:   'Delayed',
  at_risk:   'At Risk',
  completed: 'Completed',
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, { badge: string; bar: string }> = {
  on_track:  { badge: 'bg-green-100 text-green-700', bar: '#176e00' },
  delayed:   { badge: 'bg-blue-100 text-blue-700',   bar: '#004bd8' },
  at_risk:   { badge: 'bg-red-100 text-red-700',     bar: '#af1a25' },
  completed: { badge: 'bg-gray-100 text-gray-600',   bar: '#737687' },
}

export const RISK_SIGNAL_OPTIONS = [
  { value: 'low_usage', label: 'Low Usage' },
  { value: 'champion_left', label: 'Champion Left' },
  { value: 'open_escalation', label: 'Open Escalation' },
  { value: 'no_exec_sponsor', label: 'No Exec Sponsor' },
  { value: 'competitive_threat', label: 'Competitive Threat' },
  { value: 'budget_freeze', label: 'Budget Freeze' },
  { value: 'delayed_implementation', label: 'Delayed Implementation' },
  { value: 'negative_nps', label: 'Negative NPS' },
]

export function getHealthScoreColor(score: number | null): string {
  if (score === null) return 'bg-slate-100 text-slate-500'
  if (score >= 61) return 'bg-green-100 text-green-700'
  if (score >= 31) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export function getHealthScoreBand(score: number | null): string {
  if (score === null) return 'N/A'
  if (score >= 61) return 'Healthy'
  if (score >= 31) return 'At Risk'
  return 'Critical'
}
