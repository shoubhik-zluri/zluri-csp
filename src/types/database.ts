// Auto-generated types will replace this file once you run:
// npx supabase gen types typescript --project-id <id> > src/types/database.ts
//
// Until then, this manual definition is used.

export type Role = 'admin' | 'member' | 'viewer' | 'collaborator'
export type ContractType = 'monthly' | 'annual' | 'multi-year'
export type Sentiment = 'high_risk' | 'some_risk' | 'good'
export type CustomerType = 'IGA' | 'SMP'
export type AccountTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4'
export type AccountStatus = 'active' | 'churned'
export type Segment = 'enterprise' | 'mid_market' | 'smb'
export type ProjectStatus = 'on_track' | 'delayed' | 'at_risk' | 'completed'
export type LifecycleStage = 'acquisition' | 'activation' | 'adoption' | 'amplification' | 'advocacy'
export type ExecEngagement =
  | 'platform_login'
  | 'cadence_with_csm'
  | 'qbr_current_quarter'
  | 'meets_cs_leadership'
  | 'personally_escalates'
  | 'attends_cab'
  | 'requests_report'
export type RenewalStage =
  | 'not_started'
  | 'in_discussion'
  | 'quote_sent'
  | 'negotiating'
  | 'renewed'
  | 'churned'
  | 'at_risk'
export type CustomFieldType = 'text' | 'number' | 'date' | 'single_select' | 'multi_select'

export interface CustomFieldDefinition {
  id: string
  name: string
  field_type: CustomFieldType
  options: string[]
  is_required: boolean
  position: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskView {
  id: string
  user_id: string
  name: string
  view_mode: 'list' | 'table'
  config: Record<string, unknown>
  is_default: boolean
  workspace_id: string | null
  created_at: string
  updated_at: string
}

export interface CustomFieldValue {
  id: string
  task_id: string
  field_id: string
  value: unknown
  created_at: string
  updated_at: string
}

export type TaskStatus = 'pending_review' | 'open' | 'in_progress' | 'completed' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskVisibility = 'private' | 'internal' | 'external'
export type PlanStatus = 'active' | 'completed' | 'archived'
export type NoteSource = 'manual' | 'granola' | 'google_meet' | 'zoom' | 'clari_copilot'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Account {
  id: string
  org_id: string
  name: string
  arr: number | null
  renewal_date: string | null
  contract_type: ContractType | null
  csm_id: string | null
  health_score: number | null
  sentiment: Sentiment | null
  lifecycle_stage: LifecycleStage[] | null
  exec_engagement: ExecEngagement[] | null
  renewal_stage: RenewalStage | null
  risk_signals: string[]
  industry: string | null
  region: string | null
  employee_count: number | null
  website: string | null
  notes: string | null
  // Extended fields (Phase B)
  customer_since: string | null
  contract_renewal_date: string | null
  partner_sourced: boolean
  partner_name: string | null
  associated_ae: string | null
  associated_cse: string | null
  customer_type: CustomerType | null
  tier: AccountTier | null
  multiyear_contract: boolean
  modules_purchased: string[]
  status: AccountStatus
  segment: Segment | null
  created_at: string
  updated_at: string
  // Joined fields
  csm?: Profile | null
}

export interface Contact {
  id: string
  account_id: string
  name: string
  email: string | null
  role: string[] | null
  is_primary: boolean
  linkedin_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface SuccessPlan {
  id: string
  account_id: string
  name: string
  description: string | null
  owner_id: string | null
  due_date: string | null
  status: PlanStatus
  created_at: string
  updated_at: string
  owner?: Profile | null
  tasks?: Task[]
}

export interface Task {
  id: string
  account_id: string | null
  plan_id: string | null
  project_id: string | null
  title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  priority: TaskPriority | null
  visibility: TaskVisibility
  parent_task_id: string | null
  owner_id: string | null
  created_by: string | null
  sort_order: number | null
  section: string | null
  task_number: number | null
  created_at: string
  updated_at: string
  owner?: Profile | null
  account?: Pick<Account, 'id' | 'name'> | null
  project?: Pick<Project, 'id' | 'name'> | null
}

export interface TaskComment {
  id: string
  task_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
  author?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>
}

export interface ChecklistItem {
  id: string
  task_id: string
  text: string
  is_checked: boolean
  position: number
  created_at: string
  updated_at: string
}

export interface StructuredActionItem {
  title: string
  assignee_name: string | null
  due_date: string | null
  confidence?: ConfidenceLevel | null
  justification?: string | null
  priority?: 'low' | 'medium' | 'high' | null
}

export interface MeetingInsights {
  summary: string
  actionItems: (StructuredActionItem | string)[]
  riskSignals: string[]
  sentimentHint: 'positive' | 'neutral' | 'negative' | null
  mom?: string | null
  expansionSignals?: string[]
}

export interface NoteMetadata {
  insights?: MeetingInsights
  matchInfo?: { confidence: string; matchedOn: string | null }
  granola_id?: string
}

export type MatchConfidence = 'high' | 'medium' | 'low' | 'none'

export type CallLogFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'ad_hoc'

export interface MeetingNote {
  id: string
  account_id: string | null
  title: string | null
  content: string
  meeting_date: string
  source: NoteSource
  attendees: string[]
  external_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  metadata: NoteMetadata | null
  match_confidence: MatchConfidence | null
  match_reasons: string[] | null
  frequency: CallLogFrequency | null
  transcript: string | null
  created_by_profile?: Profile | null
}

export interface AccountIntegrations {
  id: string
  account_id: string
  slack_channel_id: string | null
  slack_channel_name: string | null
  granola_folder_id: string | null
  email_domain: string | null
  jira_project_key: string | null
  notion_page_id: string | null
  clari_account_id: string | null
  salesforce_id: string | null
  granola_last_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  account_id: string
  name: string
  description: string | null
  status: ProjectStatus
  owner_id: string | null
  start_date: string | null
  due_date: string | null
  tasks_total: number
  tasks_done: number
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined
  account?: { id: string; name: string } | null
  owner?: { id: string; full_name: string | null; avatar_url: string | null } | null
}

export interface TaskDependencyEntry {
  dep_id: string
  id: string
  title: string
  status: TaskStatus
  due_date: string | null
  priority: TaskPriority | null
  visibility: TaskVisibility
  task_number: number | null
}

export interface ImportLog {
  id: string
  imported_by: string | null
  filename: string | null
  total_rows: number
  inserted_rows: number
  updated_rows: number
  error_rows: number
  errors: ImportError[]
  created_at: string
}

export interface ImportError {
  row: number
  field?: string
  message: string
}

export interface PendingTask {
  id: string
  account_id: string
  note_id: string | null
  title: string
  assignee_name_raw: string | null
  assignee_id: string | null
  due_date: string | null
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  updated_at: string
  description?: string | null
  task_type: 'action_item' | 'risk' | 'expansion'
  confidence?: ConfidenceLevel | null
  justification?: string | null
  priority?: 'low' | 'medium' | 'high' | null
  reference_task_id?: string | null
  source_call_id?: string | null
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  note?: { title: string | null; meeting_date: string } | null
  account?: { name: string } | null
}

export interface SyncRunLog {
  id: string
  triggered_by: string | null
  trigger_type: 'manual' | 'scheduled' | 'mcp'
  sources: string[]
  status: 'running' | 'completed' | 'failed'
  calls_fetched: number
  calls_matched: number
  calls_skipped: number
  calls_unmatched: number
  tasks_suggested: number
  error_text: string | null
  started_at: string
  completed_at: string | null
  updated_at: string
  triggered_by_profile?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// Stub for Supabase generated types — replaced by supabase gen types
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile> }
      accounts: { Row: Account; Insert: Omit<Account, 'id' | 'created_at' | 'updated_at' | 'csm'>; Update: Partial<Account> }
      contacts: { Row: Contact; Insert: Omit<Contact, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Contact> }
      success_plans: { Row: SuccessPlan; Insert: Omit<SuccessPlan, 'id' | 'created_at' | 'updated_at' | 'owner' | 'tasks'>; Update: Partial<SuccessPlan> }
      tasks: { Row: Task; Insert: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'owner' | 'account'>; Update: Partial<Task> }
      meeting_notes: { Row: MeetingNote; Insert: Omit<MeetingNote, 'id' | 'created_at' | 'updated_at' | 'created_by_profile' | 'metadata'> & { metadata?: NoteMetadata }; Update: Partial<MeetingNote> }
      account_integrations: { Row: AccountIntegrations; Insert: Omit<AccountIntegrations, 'id' | 'created_at' | 'updated_at'>; Update: Partial<AccountIntegrations> }
      import_logs: { Row: ImportLog; Insert: Omit<ImportLog, 'id' | 'created_at'>; Update: Partial<ImportLog> }
    }
  }
}
