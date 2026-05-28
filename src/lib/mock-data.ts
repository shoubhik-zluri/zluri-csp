// ─── Mock Data for Local MVP ─────────────────────────────────────────────────

export const mockUser = {
  id: 'user-jane-doe',
  email: 'jane@zluri.com',
  full_name: 'Jane Doe',
  role: 'admin' as const,
  avatar_url: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

export const mockAccounts = [
  {
    id: 'acc-1',
    org_id: 'acme-corp',
    name: 'Acme Corp Global',
    arr: 1200000,
    renewal_date: '2026-05-12',
    contract_type: 'Annual',
    csm_id: 'user-jane-doe',
    csm_name: 'Jane Doe',
    health_score: 84,
    sentiment: 'good' as const,
    lifecycle_stage: 'Growth & Expansion',
    exec_engagement: 'Bi-Weekly Sync',
    renewal_stage: 'Proposal Sent',
    risk_signals: ['Champion Left'],
    tier: 'Enterprise',
    contacts_count: 3,
    open_tasks: 2,
  },
  {
    id: 'acc-2',
    org_id: 'starlight-sys',
    name: 'Starlight Systems',
    arr: 1250000,
    renewal_date: '2026-04-04',
    contract_type: 'Annual',
    csm_id: 'user-anna',
    csm_name: 'Anna Martinez',
    health_score: 78,
    sentiment: 'good' as const,
    lifecycle_stage: 'Steady State',
    exec_engagement: 'Monthly Sync',
    renewal_stage: 'Discovery',
    risk_signals: [],
    tier: 'Strategic',
    contacts_count: 2,
    open_tasks: 3,
  },
  {
    id: 'acc-3',
    org_id: 'velocity-tech',
    name: 'Velocity Tech',
    arr: 780000,
    renewal_date: '2026-08-15',
    contract_type: 'Annual',
    csm_id: 'user-jordan',
    csm_name: 'Jordan Singh',
    health_score: 52,
    sentiment: 'high_risk' as const,
    lifecycle_stage: 'Recovery',
    exec_engagement: 'No Engagement',
    renewal_stage: 'Not Started',
    risk_signals: ['Champion Left', 'Low Adoption', 'No Exec Sponsor'],
    tier: 'Growth',
    contacts_count: 1,
    open_tasks: 5,
  },
  {
    id: 'acc-4',
    org_id: 'quantum-dyn',
    name: 'Quantum Dynamics',
    arr: 2100000,
    renewal_date: '2026-06-01',
    contract_type: 'Multi-Year',
    csm_id: 'user-jane-doe',
    csm_name: 'Jane Doe',
    health_score: 91,
    sentiment: 'good' as const,
    lifecycle_stage: 'Advocacy',
    exec_engagement: 'Weekly Sync',
    renewal_stage: 'Not Started',
    risk_signals: [],
    tier: 'Enterprise',
    contacts_count: 4,
    open_tasks: 1,
  },
  {
    id: 'acc-5',
    org_id: 'meridian-health',
    name: 'Meridian Health',
    arr: 890000,
    renewal_date: '2026-04-19',
    contract_type: 'Annual',
    csm_id: 'user-sam',
    csm_name: 'Sam Kim',
    health_score: 71,
    sentiment: 'some_risk' as const,
    lifecycle_stage: 'Onboarding',
    exec_engagement: 'Monthly Sync',
    renewal_stage: 'Discovery',
    risk_signals: ['Slow Onboarding'],
    tier: 'Mid-Market',
    contacts_count: 2,
    open_tasks: 4,
  },
  {
    id: 'acc-6',
    org_id: 'neon-ventures',
    name: 'Neon Ventures',
    arr: 540000,
    renewal_date: '2026-09-20',
    contract_type: 'Annual',
    csm_id: 'user-anna',
    csm_name: 'Anna Martinez',
    health_score: 48,
    sentiment: 'high_risk' as const,
    lifecycle_stage: 'Recovery',
    exec_engagement: 'No Engagement',
    renewal_stage: 'Not Started',
    risk_signals: ['No Exec Sponsor', 'Open Escalation'],
    tier: 'SMB',
    contacts_count: 1,
    open_tasks: 3,
  },
  {
    id: 'acc-7',
    org_id: 'peak-analytics',
    name: 'Peak Analytics',
    arr: 420000,
    renewal_date: '2026-07-10',
    contract_type: 'Annual',
    csm_id: 'user-jordan',
    csm_name: 'Jordan Singh',
    health_score: 59,
    sentiment: 'high_risk' as const,
    lifecycle_stage: 'Recovery',
    exec_engagement: 'Introductory Meeting',
    renewal_stage: 'Not Started',
    risk_signals: ['Open Escalation', 'Low NPS'],
    tier: 'SMB',
    contacts_count: 2,
    open_tasks: 2,
  },
]

export const mockTasks = [
  {
    id: 'task-1',
    account_id: 'acc-1',
    account_name: 'Acme Corp Global',
    title: 'Send QBR deck to exec team',
    description: 'Prepare and send the Q1 2026 QBR deck to Mark Reynolds and Sarah Lee.',
    due_date: '2026-03-24',
    status: 'overdue' as const,
    owner_id: 'user-jane-doe',
    owner_name: 'Jane Doe',
    plan_id: 'plan-1',
  },
  {
    id: 'task-2',
    account_id: 'acc-2',
    account_name: 'Starlight Systems',
    title: 'Follow up on renewal proposal',
    description: 'Check in with Anna on the status of the renewal proposal sent last week.',
    due_date: '2026-04-10',
    status: 'open' as const,
    owner_id: 'user-jane-doe',
    owner_name: 'Jane Doe',
    plan_id: null,
  },
  {
    id: 'task-3',
    account_id: 'acc-3',
    account_name: 'Velocity Tech',
    title: 'Update risk signals and escalation plan',
    description: 'Review the current risk signals and update the escalation plan for Velocity Tech.',
    due_date: '2026-04-12',
    status: 'open' as const,
    owner_id: 'user-jane-doe',
    owner_name: 'Jane Doe',
    plan_id: null,
  },
  {
    id: 'task-4',
    account_id: 'acc-4',
    account_name: 'Quantum Dynamics',
    title: 'Schedule exec alignment call',
    description: 'Set up the quarterly executive alignment call with the Quantum Dynamics leadership team.',
    due_date: '2026-04-15',
    status: 'open' as const,
    owner_id: 'user-jane-doe',
    owner_name: 'Jane Doe',
    plan_id: 'plan-3',
  },
  {
    id: 'task-5',
    account_id: 'acc-1',
    account_name: 'Acme Corp Global',
    title: 'Negotiate renewal contract terms',
    description: 'Discuss expanded seat count and updated pricing with Acme Corp.',
    due_date: '2026-04-25',
    status: 'open' as const,
    owner_id: 'user-jane-doe',
    owner_name: 'Jane Doe',
    plan_id: 'plan-1',
  },
]

export const mockContacts = {
  'acc-1': [
    { id: 'c-1', account_id: 'acc-1', name: 'Mark Reynolds', email: 'mark.r@acmecorp.com', role: 'VP Engineering', is_primary: true },
    { id: 'c-2', account_id: 'acc-1', name: 'Sarah Lee', email: 'slee@acmecorp.com', role: 'CTO', is_primary: false },
    { id: 'c-3', account_id: 'acc-1', name: 'Tom Walsh', email: 't.walsh@acmecorp.com', role: 'IT Admin', is_primary: false },
  ],
  'acc-2': [
    { id: 'c-4', account_id: 'acc-2', name: 'Priya Sharma', email: 'priya@starlightsys.com', role: 'Head of IT', is_primary: true },
    { id: 'c-5', account_id: 'acc-2', name: 'James Park', email: 'jpark@starlightsys.com', role: 'CEO', is_primary: false },
  ],
}

export const mockNotes = {
  'acc-1': [
    {
      id: 'n-1', account_id: 'acc-1', title: 'Renewal Strategy Call',
      content: 'Discussed contract renewal scope. Mark confirmed intent to expand to 500 seats. Sarah raised concern about data residency — follow up with legal. Next call in 2 weeks.',
      meeting_date: '2026-03-20', source: 'Manual', owner_name: 'Jane Doe',
    },
    {
      id: 'n-2', account_id: 'acc-1', title: 'QBR — Q1 2026',
      content: 'Strong adoption metrics presented. DAU up 18% QoQ. Exec sponsor (Mark) very engaged. Identified 2 expansion opportunities: Slack integration and Jira connector. Action items assigned to Tom.',
      meeting_date: '2026-03-05', source: 'Granola', owner_name: 'Jane Doe',
    },
  ],
  'acc-2': [
    {
      id: 'n-3', account_id: 'acc-2', title: 'Renewal Discovery Call',
      content: 'Priya wants to add 2 more departments. Discussing a 2-year contract. Budget approval needed from CEO. Follow up end of April.',
      meeting_date: '2026-03-18', source: 'Manual', owner_name: 'Anna Martinez',
    },
  ],
}

export const mockProjects = [
  {
    id: 'plan-1', account_id: 'acc-1', account_name: 'Acme Corp Global',
    name: 'Q1 2026 Renewal Plan', status: 'in_progress' as const,
    owner_id: 'user-jane-doe', owner_name: 'Jane Doe',
    start_date: '2026-01-15', due_date: '2026-04-30', tasks_total: 18, tasks_done: 12,
  },
  {
    id: 'plan-2', account_id: 'acc-3', account_name: 'Velocity Tech',
    name: 'Churn Prevention Sprint', status: 'at_risk' as const,
    owner_id: 'user-jordan', owner_name: 'Jordan Singh',
    start_date: '2026-02-01', due_date: '2026-04-01', tasks_total: 10, tasks_done: 3,
  },
  {
    id: 'plan-3', account_id: 'acc-4', account_name: 'Quantum Dynamics',
    name: 'Expansion: Slack + Jira', status: 'on_track' as const,
    owner_id: 'user-jane-doe', owner_name: 'Jane Doe',
    start_date: '2026-02-15', due_date: '2026-05-15', tasks_total: 20, tasks_done: 17,
  },
  {
    id: 'plan-4', account_id: 'acc-5', account_name: 'Meridian Health',
    name: 'Onboarding Accelerator', status: 'in_progress' as const,
    owner_id: 'user-sam', owner_name: 'Sam Kim',
    start_date: '2026-03-01', due_date: '2026-04-15', tasks_total: 20, tasks_done: 9,
  },
  {
    id: 'plan-5', account_id: 'acc-2', account_name: 'Starlight Systems',
    name: 'Executive Alignment Program', status: 'on_track' as const,
    owner_id: 'user-anna', owner_name: 'Anna Martinez',
    start_date: '2026-03-15', due_date: '2026-06-01', tasks_total: 11, tasks_done: 6,
  },
]

export const mockEmailTemplates = [
  {
    id: 'et-1', category: 'Renewal', name: 'Renewal Kickoff Email',
    subject: "Let's kick off your renewal — [Account Name]",
    body: `Hi [Contact First Name],

I hope Q1 has been going well for the team at [Account Name]!

As we approach your renewal in [Renewal Month], I wanted to reach out to kick off the conversation and make sure we're set up for another strong year together.

Over the past year, your team has achieved [Key Win 1] and [Key Win 2] — and I'd love to build on that momentum.

Can we find 30 minutes next week to review renewal terms and discuss what the next chapter looks like?

[CSM Name]
Customer Success · Zluri`,
    variables: ['Account Name', 'Contact First Name', 'Renewal Month', 'Key Win 1', 'Key Win 2', 'CSM Name'],
  },
  {
    id: 'et-2', category: 'Onboarding', name: 'Welcome & Kickoff',
    subject: 'Welcome to Zluri, [Account Name] — let\'s get started',
    body: `Hi [Contact First Name],

Welcome to Zluri! We're excited to partner with [Account Name] and help your team get the most out of your SaaS stack.

Your kickoff call is scheduled for [Kickoff Date]. I've attached a brief pre-read and your personalised success plan.

In the meantime, feel free to reach out if you have any questions.

[CSM Name]
Customer Success · Zluri`,
    variables: ['Contact First Name', 'Account Name', 'Kickoff Date', 'CSM Name'],
  },
  {
    id: 'et-3', category: 'Risk', name: 'Re-engagement Outreach',
    subject: 'Checking in — quick question for you',
    body: `Hi [Contact First Name],

I noticed we haven't connected in a little while and wanted to check in on how things are going at [Account Name].

I also saw that [Feature Name] might be a good fit for the workflow challenges you mentioned on our last call — happy to walk through it in a quick 20-minute session.

Would [Date Option 1] or [Date Option 2] work for a catch-up?

[CSM Name]`,
    variables: ['Contact First Name', 'Account Name', 'Feature Name', 'Date Option 1', 'Date Option 2', 'CSM Name'],
  },
  {
    id: 'et-4', category: 'QBR', name: 'QBR Invite & Agenda',
    subject: 'Q[Quarter] Business Review — [Account Name] · [QBR Date]',
    body: `Hi [Contact First Name],

I'd like to invite you to our Q[Quarter] Business Review on [QBR Date].

Agenda:
1. Health Score & Adoption Review (10 min)
2. Key Wins & Milestones (10 min)
3. Roadmap Alignment (15 min)
4. Renewal Discussion (10 min)
5. Q&A

Calendar invite to follow. Let me know if the timing works.

[CSM Name]`,
    variables: ['Contact First Name', 'Account Name', 'Quarter', 'QBR Date', 'CSM Name'],
  },
]

export const mockAiInsights = [
  {
    id: 'ai-1', type: 'high_risk', account_id: 'acc-3', account_name: 'Velocity Tech',
    title: 'Login frequency dropped 40% in 30 days',
    detail: 'Active users declined from 142 to 86. Combined with the recent champion departure, this signals elevated churn risk ahead of the August renewal.',
    suggested_action: 'Schedule re-engagement call with new IT lead within 7 days',
    detected_at: '2026-04-06',
  },
  {
    id: 'ai-2', type: 'expansion', account_id: 'acc-4', account_name: 'Quantum Dynamics',
    title: 'Power user cluster identified — 18 users at seat limit',
    detail: 'Three teams are hitting the seat cap weekly. Expansion to 500 seats could add ~$140K ARR and prevents frustration-driven churn.',
    suggested_action: 'Propose seat expansion at next QBR',
    detected_at: '2026-04-05',
  },
  {
    id: 'ai-3', type: 'advocacy', account_id: 'acc-1', account_name: 'Acme Corp Global',
    title: 'NPS score jumped from 7 to 9 post-QBR',
    detail: 'Mark Reynolds and 2 other contacts submitted 9/10 scores. This is an ideal moment to request a G2 review or customer case study.',
    suggested_action: 'Request G2 review and nominate for Customer Advisory Board',
    detected_at: '2026-04-04',
  },
  {
    id: 'ai-4', type: 'high_risk', account_id: 'acc-6', account_name: 'Neon Ventures',
    title: 'No executive sponsor identified — renewal in 165 days',
    detail: 'There is no exec contact mapped to this account. With renewal approaching and sentiment at risk, this is a significant gap.',
    suggested_action: 'Request warm intro to C-suite from your AE',
    detected_at: '2026-04-03',
  },
]

export const mockUsers = [
  { id: 'user-jane-doe', email: 'jane@zluri.com', full_name: 'Jane Doe', role: 'admin', accounts: 42, last_active: 'Today', status: 'active' },
  { id: 'user-anna', email: 'anna@zluri.com', full_name: 'Anna Martinez', role: 'member', accounts: 28, last_active: 'Yesterday', status: 'active' },
  { id: 'user-jordan', email: 'jordan@zluri.com', full_name: 'Jordan Singh', role: 'member', accounts: 31, last_active: '2026-04-06', status: 'active' },
  { id: 'user-sam', email: 'sam@zluri.com', full_name: 'Sam Kim', role: 'viewer', accounts: 0, last_active: '2026-03-20', status: 'inactive' },
]

// MCP integrations reflecting Cowork instance connectors
export const mockMcpIntegrations = [
  { id: 'mcp-gmail', name: 'Gmail', icon: 'mail', status: 'connected', description: 'Read threads, create drafts', last_sync: '2026-04-08T08:00:00Z', mcp_server: 'gmail' },
  { id: 'mcp-slack', name: 'Slack', icon: 'chat', status: 'connected', description: 'Search channels, send messages', last_sync: '2026-04-08T07:45:00Z', mcp_server: 'slack' },
  { id: 'mcp-gcal', name: 'Google Calendar', icon: 'calendar_today', status: 'connected', description: 'View and create events', last_sync: '2026-04-08T08:00:00Z', mcp_server: 'google-calendar' },
  { id: 'mcp-granola', name: 'Granola', icon: 'mic', status: 'connected', description: 'Meeting transcripts and summaries', last_sync: '2026-04-07T22:00:00Z', mcp_server: 'granola' },
  { id: 'mcp-notion', name: 'Notion', icon: 'description', status: 'disconnected', description: 'Pages, databases, docs', last_sync: null, mcp_server: 'notion' },
  { id: 'mcp-jira', name: 'Jira', icon: 'bug_report', status: 'disconnected', description: 'Issues, projects, sprints', last_sync: null, mcp_server: 'jira' },
  { id: 'mcp-salesforce', name: 'Salesforce', icon: 'cloud', status: 'disconnected', description: 'Accounts, opportunities, contacts', last_sync: null, mcp_server: 'salesforce' },
  { id: 'mcp-hubspot', name: 'HubSpot', icon: 'hub', status: 'disconnected', description: 'CRM, contacts, deals', last_sync: null, mcp_server: 'hubspot' },
]
