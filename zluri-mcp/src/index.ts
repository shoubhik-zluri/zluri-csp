#!/usr/bin/env node
/**
 * Zluri MCP Server
 * Exposes Zluri CSM platform data to CSM Claude instances via the Model Context Protocol.
 *
 * Setup:
 *   1. npm install && npm run build
 *   2. Add to ~/.claude/claude_desktop_config.json:
 *      {
 *        "mcpServers": {
 *          "zluri": {
 *            "command": "node",
 *            "args": ["/path/to/zluri-mcp/dist/index.js"],
 *            "env": {
 *              "ZLURI_API_KEY": "zsk_your_key_here",
 *              "ZLURI_BASE_URL": "https://zluri-csm.vercel.app"
 *            }
 *          }
 *        }
 *      }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const BASE_URL = process.env.ZLURI_BASE_URL ?? 'https://zluri-csm.vercel.app'
const API_KEY = process.env.ZLURI_API_KEY

if (!API_KEY) {
  console.error('ZLURI_API_KEY environment variable is required')
  process.exit(1)
}

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_KEY}`,
}

async function zluriFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers: { ...headers, ...options?.headers } })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Zluri API error ${res.status}: ${err}`)
  }
  return res.json()
}

const server = new McpServer({
  name: 'zluri',
  version: '1.0.0',
})

// ─── Account tools ───────────────────────────────────────────────────────────

server.tool(
  'list_my_accounts',
  'List all accounts assigned to you as CSM',
  {},
  async () => {
    const accounts = await zluriFetch('/api/accounts')
    const summary = accounts.map((a: Record<string, unknown>) => ({
      id: a.id,
      name: a.name,
      arr: a.arr,
      health_score: a.health_score,
      sentiment: a.sentiment,
      renewal_date: a.renewal_date,
      renewal_stage: a.renewal_stage,
      tier: a.tier,
      status: a.status,
    }))
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
  }
)

server.tool(
  'get_account',
  'Get full details for a specific account by ID',
  { account_id: z.string().describe('The account UUID') },
  async ({ account_id }) => {
    const account = await zluriFetch(`/api/accounts/${account_id}`)
    return { content: [{ type: 'text', text: JSON.stringify(account, null, 2) }] }
  }
)

server.tool(
  'update_account',
  'Update fields on an account (health_score, sentiment, renewal_stage, notes, etc.)',
  {
    account_id: z.string().describe('The account UUID'),
    fields: z.record(z.string(), z.unknown()).describe('Fields to update, e.g. { "health_score": 72, "sentiment": "good" }'),
  },
  async ({ account_id, fields }) => {
    const updated = await zluriFetch(`/api/accounts/${account_id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    })
    return { content: [{ type: 'text', text: `Account updated:\n${JSON.stringify(updated, null, 2)}` }] }
  }
)

server.tool(
  'get_health_summary',
  'Get a portfolio health snapshot: overdue tasks, at-risk accounts, upcoming renewals',
  {},
  async () => {
    const [accounts, tasks] = await Promise.all([
      zluriFetch('/api/accounts'),
      zluriFetch('/api/tasks/all'),
    ])

    const today = new Date().toISOString().split('T')[0]
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

    const overdueTasks = tasks.filter((t: Record<string, unknown>) => t.due_date && (t.due_date as string) < today)
    const atRisk = accounts.filter((a: Record<string, unknown>) => a.sentiment === 'high_risk' || a.health_score !== null && (a.health_score as number) < 31)
    const upcomingRenewals = accounts.filter((a: Record<string, unknown>) =>
      a.renewal_date && (a.renewal_date as string) <= thirtyDays && (a.renewal_date as string) >= today
    )

    const summary = {
      total_accounts: accounts.length,
      at_risk_accounts: atRisk.map((a: Record<string, unknown>) => ({ name: a.name, health: a.health_score, sentiment: a.sentiment })),
      overdue_tasks: overdueTasks.map((t: Record<string, unknown>) => ({ title: t.title, account: (t.account as Record<string, unknown>)?.name, due: t.due_date })),
      upcoming_renewals: upcomingRenewals.map((a: Record<string, unknown>) => ({ name: a.name, renewal_date: a.renewal_date, arr: a.arr })),
    }

    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] }
  }
)

// ─── Task tools ──────────────────────────────────────────────────────────────

server.tool(
  'list_tasks',
  'List your open tasks, optionally filtered by account',
  {
    account_id: z.string().optional().describe('Filter to tasks for a specific account'),
    status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional().describe('Filter by status'),
  },
  async ({ account_id, status }) => {
    let tasks
    if (account_id) {
      const res = await zluriFetch(`/api/tasks?accountId=${account_id}`)
      const all = [...(res.unplanned ?? []), ...(res.plans ?? []).flatMap((p: Record<string, unknown>) => (p.tasks as unknown[]) ?? [])]
      tasks = status ? all.filter((t: Record<string, unknown>) => t.status === status) : all
    } else {
      tasks = await zluriFetch('/api/tasks/all')
      if (status) tasks = tasks.filter((t: Record<string, unknown>) => t.status === status)
    }
    return { content: [{ type: 'text', text: JSON.stringify(tasks, null, 2) }] }
  }
)

server.tool(
  'create_task',
  'Create a new task for an account',
  {
    account_id: z.string().describe('The account UUID'),
    title: z.string().describe('Task title'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    description: z.string().optional().describe('Task description'),
    plan_id: z.string().optional().describe('Success plan UUID to attach this task to'),
  },
  async ({ account_id, title, due_date, description, plan_id }) => {
    const task = await zluriFetch('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ account_id, title, due_date, description, plan_id, status: 'open' }),
    })
    return { content: [{ type: 'text', text: `Task created: ${JSON.stringify(task, null, 2)}` }] }
  }
)

server.tool(
  'complete_task',
  'Mark a task as completed',
  { task_id: z.string().describe('The task UUID') },
  async ({ task_id }) => {
    const task = await zluriFetch(`/api/tasks/${task_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'completed' }),
    })
    return { content: [{ type: 'text', text: `Task completed: ${task.title}` }] }
  }
)

// ─── Notes tools ─────────────────────────────────────────────────────────────

server.tool(
  'list_notes',
  'List meeting notes for an account',
  { account_id: z.string().describe('The account UUID') },
  async ({ account_id }) => {
    const notes = await zluriFetch(`/api/notes?accountId=${account_id}`)
    return { content: [{ type: 'text', text: JSON.stringify(notes, null, 2) }] }
  }
)

server.tool(
  'add_note',
  'Add a meeting note to an account',
  {
    account_id: z.string().describe('The account UUID'),
    content: z.string().describe('Note content in plain text or markdown'),
    title: z.string().optional().describe('Note title / meeting name'),
    meeting_date: z.string().optional().describe('Meeting date in YYYY-MM-DD format (defaults to today)'),
  },
  async ({ account_id, content, title, meeting_date }) => {
    const today = new Date().toISOString().split('T')[0]
    const note = await zluriFetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({
        account_id,
        content,
        title: title ?? 'Meeting note',
        meeting_date: meeting_date ?? today,
        source: 'manual',
        attendees: [],
      }),
    })
    return { content: [{ type: 'text', text: `Note saved: ${JSON.stringify(note, null, 2)}` }] }
  }
)

// ─── Contact tools ───────────────────────────────────────────────────────────

server.tool(
  'list_contacts',
  'List contacts for an account',
  { account_id: z.string().describe('The account UUID') },
  async ({ account_id }) => {
    const contacts = await zluriFetch(`/api/contacts?accountId=${account_id}`)
    return { content: [{ type: 'text', text: JSON.stringify(contacts, null, 2) }] }
  }
)

server.tool(
  'create_contact',
  'Add a contact to an account',
  {
    account_id: z.string().describe('The account UUID'),
    name: z.string().describe('Contact full name'),
    email: z.string().optional().describe('Contact email'),
    role: z.string().optional().describe('Contact role / title'),
    is_primary: z.boolean().optional().describe('Whether this is the primary contact'),
  },
  async ({ account_id, name, email, role, is_primary }) => {
    const contact = await zluriFetch('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ account_id, name, email, role, is_primary: is_primary ?? false }),
    })
    return { content: [{ type: 'text', text: `Contact added: ${JSON.stringify(contact, null, 2)}` }] }
  }
)

// ─── Project tools ───────────────────────────────────────────────────────────

server.tool(
  'list_projects',
  'List projects, optionally filtered by account',
  { account_id: z.string().optional().describe('Filter to a specific account') },
  async ({ account_id }) => {
    const url = account_id ? `/api/projects?accountId=${account_id}` : '/api/projects'
    const projects = await zluriFetch(url)
    return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] }
  }
)

server.tool(
  'create_project',
  'Create a new project for an account',
  {
    account_id: z.string().describe('The account UUID'),
    name: z.string().describe('Project name'),
    status: z.enum(['on_track', 'delayed', 'at_risk', 'completed']).optional().describe('Project status'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    description: z.string().optional().describe('Project description'),
  },
  async ({ account_id, name, status, due_date, description }) => {
    const project = await zluriFetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ account_id, name, status: status ?? 'on_track', due_date, description }),
    })
    return { content: [{ type: 'text', text: `Project created: ${JSON.stringify(project, null, 2)}` }] }
  }
)

// ─── Granola MCP sync ────────────────────────────────────────────────────────

server.tool(
  'sync_granola_notes',
  'Sync meeting notes from your Granola MCP into a Zluri account. Requires Granola MCP to also be connected in this Claude session. Claude will fetch meetings from Granola and save them as notes on the account.',
  {
    account_id: z.string().describe('The Zluri account UUID to save notes into'),
    account_name: z.string().describe('The account name — used to find matching meetings in Granola'),
    days_back: z.number().optional().describe('How many days back to look for meetings (default: 30)'),
  },
  async ({ account_id, account_name, days_back = 30 }) => {
    // This tool can't call Granola MCP directly — only Claude can orchestrate between MCP servers.
    // We return structured instructions that Claude will follow using its available Granola MCP tools.
    const since = new Date(Date.now() - days_back * 86400000).toISOString().split('T')[0]

    return {
      content: [{
        type: 'text',
        text: [
          `## Granola → Zluri sync instructions for "${account_name}"`,
          '',
          `**Account ID:** ${account_id}`,
          `**Account name:** ${account_name}`,
          `**Fetch meetings from:** ${since} to today`,
          '',
          '**Please follow these steps using your available MCP tools:**',
          '',
          '1. Use your **Granola MCP** tools to list or search for meetings related to ' +
            `"${account_name}" since ${since}. Look for meetings where attendees include ` +
            `external (non-Zluri) contacts, or where the meeting title mentions "${account_name}".`,
          '',
          '2. For each matching meeting, extract:',
          '   - Meeting title',
          '   - Meeting date (YYYY-MM-DD)',
          '   - Full notes/transcript content',
          '',
          '3. For each meeting, call **add_note** with:',
          `   - account_id: "${account_id}"`,
          '   - title: the meeting title',
          '   - meeting_date: the meeting date',
          '   - content: the notes/transcript',
          '',
          '4. Report back: how many meetings were found, how many were saved, and list the titles.',
          '',
          '> If no Granola MCP tools are available in this session, ask the user to connect ' +
            'Granola in their Claude settings and try again.',
        ].join('\n'),
      }],
    }
  }
)

// ─── Call Intelligence tools ─────────────────────────────────────────────────

server.tool(
  'create_pending_task',
  'Create a pending task (AI-suggested action item) awaiting CSM review. Call add_note first and pass the returned note_id.',
  {
    note_id: z.string().uuid().describe('ID of the meeting note this task came from'),
    account_id: z.string().uuid().describe('Account UUID'),
    title: z.string().min(1).describe('Task title'),
    description: z.string().optional().describe('Task description or supporting context'),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Due date (YYYY-MM-DD)'),
    task_type: z.enum(['action_item', 'risk', 'expansion']).optional().describe('Task classification'),
    confidence: z.enum(['high', 'medium', 'low']).optional().describe('AI confidence level'),
    justification: z.string().optional().describe('Verbatim excerpt from notes supporting this task'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority (only when explicitly stated in notes)'),
    source_call_id: z.string().optional().describe('External call/doc ID (e.g. Granola doc ID)'),
    assignee_id: z.string().uuid().optional().describe('Profile UUID of the assignee'),
  },
  async (args) => {
    const result = await zluriFetch('/api/pending-tasks', {
      method: 'POST',
      body: JSON.stringify(args),
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'create_sync_run_log',
  'Start a new call sync run. Returns a runId to pass to complete_sync_run_log when done.',
  {
    sources: z.array(z.string()).optional().describe('List of sources to sync (default: ["granola"])'),
  },
  async (args) => {
    const result = await zluriFetch('/api/calls/sync', {
      method: 'POST',
      body: JSON.stringify(args),
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

server.tool(
  'complete_sync_run_log',
  'Mark a sync run as completed or failed, recording final counts.',
  {
    run_id: z.string().uuid().describe('The runId returned from create_sync_run_log'),
    calls_fetched: z.number().int().min(0).optional().describe('Total calls fetched'),
    calls_matched: z.number().int().min(0).optional().describe('Calls matched to accounts'),
    calls_skipped: z.number().int().min(0).optional().describe('Calls skipped (low confidence or no match)'),
    tasks_suggested: z.number().int().min(0).optional().describe('Pending tasks created'),
    status: z.enum(['completed', 'failed']).optional().describe('Final status (default: completed)'),
    error_text: z.string().optional().describe('Error message if status is failed'),
  },
  async ({ run_id, ...rest }) => {
    const result = await zluriFetch(`/api/calls/sync/log/${run_id}`, {
      method: 'PATCH',
      body: JSON.stringify(rest),
    })
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }
)

// ─── /update-calls orchestration ────────────────────────────────────────────

server.tool(
  'update_calls',
  [
    'Orchestrate a full call intelligence sync using available call recording MCP tools.',
    'Primary source: Clari MCP (get_calls_by_date_range, get_call_summary).',
    'Fallback source: Granola MCP (list_meetings, get_meeting_transcript).',
    'For each call: match to an account, save as a note, and queue pending tasks for CSM review.',
    '',
    'Claude MUST execute the following steps using its available MCP tools:',
    '1. Call create_sync_run_log to start a run and get a runId.',
    '2. Fetch calls from Clari (if available) via get_calls_by_date_range for the date range.',
    '   For each Clari call: use account_name to match to a Zluri account via get_account or list_my_accounts.',
    '   If matched: call add_note to save the call as a note (source: clari_copilot).',
    '   If unmatched: call add_note with no account_id — it will appear in Unassigned Calls.',
    '3. Fetch calls from Granola (if available) that are not already saved (check by title + date).',
    '   Match by attendee email domains using the Zluri account email_domain integration setting.',
    '4. For each saved note with an account: call create_pending_task for each action item',
    '   extracted from the call summary (action_items array from get_call_summary).',
    '   Set confidence=high for items with explicit owners/dates; medium for implied; low for uncertain.',
    '   IMPORTANT: Clari timeline field (e.g. "By Saturday") is NOT a due_date — omit due_date unless the date is explicit YYYY-MM-DD.',
    '5. Call complete_sync_run_log with final counts (calls_fetched, calls_matched, tasks_suggested).',
    '6. Report a summary: N calls fetched, N matched, N unassigned, N tasks queued, direct link to /task-review.',
  ].join('\n'),
  {
    account: z.string().optional().describe('Limit sync to a single account name or UUID'),
    last: z.number().int().min(1).max(365).optional().describe('Sync calls from the last N days (default: 7)'),
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Sync calls from this date (YYYY-MM-DD); overrides --last'),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Sync calls up to this date (YYYY-MM-DD); defaults to today'),
    sources: z.array(z.enum(['clari', 'granola'])).optional().describe('Sources to sync (default: ["clari", "granola"])'),
  },
  async ({ account, last = 7, from, to, sources = ['clari', 'granola'] }) => {
    const today = new Date().toISOString().split('T')[0]
    const fromDate = from ?? new Date(Date.now() - last * 86400000).toISOString().split('T')[0]
    const toDate = to ?? today

    return {
      content: [{
        type: 'text',
        text: [
          '## /update-calls orchestration plan',
          '',
          `**Date range:** ${fromDate} to ${toDate}`,
          `**Sources:** ${sources.join(', ')}`,
          account ? `**Account filter:** ${account}` : '**Scope:** all accounts',
          '',
          'Follow these steps using your available MCP tools. If a source MCP is not connected, skip it.',
          '',
          '### Step 1 — Start run log',
          '```',
          `create_sync_run_log({ sources: ${JSON.stringify(sources)} })`,
          '```',
          'Save the returned runId.',
          '',
          ...(sources.includes('clari') ? [
            '### Step 2 — Fetch from Clari',
            `Use \`get_calls_by_date_range\` with from="${fromDate}" to="${toDate}"${account ? ` and filter by account "${account}"` : ''}.`,
            'For each call:',
            '- Call `get_call_summary` to get action_items and deal details.',
            '- Match the call\'s `account_name` to a Zluri account using `list_my_accounts` (fuzzy name match).',
            '- Call `add_note` with:',
            '  - account_id: matched account UUID (or omit if unmatched)',
            '  - title: call title',
            '  - content: full call summary text',
            '  - meeting_date: call date (YYYY-MM-DD)',
            '  - source: "clari_copilot"',
            '  - attendees: participant emails',
            '- Note the returned note.id.',
            '',
          ] : []),
          ...(sources.includes('granola') ? [
            '### Step 3 — Fetch from Granola',
            `Use \`list_meetings\` or \`query_granola_meetings\` for the date range ${fromDate} to ${toDate}.`,
            'Skip any meeting already saved (check by title + date against the account\'s notes).',
            'Match by attendee email domain to accounts (use `list_my_accounts` to find the matching account).',
            'Save each new meeting via `add_note` (source: "granola").',
            '',
          ] : []),
          '### Step 4 — Queue pending tasks',
          'For each saved note that has an account_id:',
          '  - For each action_item from the call summary:',
          '    - Call `create_pending_task` with note_id, account_id, title, confidence, justification.',
          '    - confidence=high: explicit owner + clear action. medium: implied. low: uncertain.',
          '    - NEVER set due_date from prose like "By Friday" — only use explicit YYYY-MM-DD dates.',
          '',
          '### Step 5 — Complete run log',
          '```',
          'complete_sync_run_log({ run_id: <runId>, calls_fetched: N, calls_matched: N, tasks_suggested: N })',
          '```',
          '',
          '### Step 6 — Report',
          'Summarize: N calls fetched, N matched, N unassigned, N tasks queued.',
          'Direct the CSM to /task-review to review AI-suggested tasks.',
          account ? `Unmatched calls for "${account}" will appear at /unassigned-calls.` : '',
        ].filter(Boolean).join('\n'),
      }],
    }
  }
)

// ─── Boot ─────────────────────────────────────────────────────────────────────

async function main() {
  // Validate key on startup
  try {
    const res = await fetch(`${BASE_URL}/api/auth/exchange`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ api_key: API_KEY }),
    })
    if (res.ok) {
      const data = await res.json() as { user?: { full_name?: string } }
      const name = data.user?.full_name ?? 'unknown'
      process.stderr.write(`[zluri-mcp] Authenticated as ${name}\n`)
    } else {
      process.stderr.write(`[zluri-mcp] Warning: API key validation failed (${res.status})\n`)
    }
  } catch {
    process.stderr.write('[zluri-mcp] Warning: Could not reach Zluri API on startup\n')
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('[zluri-mcp] Server running\n')
}

main().catch(console.error)
