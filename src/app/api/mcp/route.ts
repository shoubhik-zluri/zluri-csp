/**
 * Remote MCP endpoint — implements MCP JSON-RPC 2.0 over HTTP (stateless).
 *
 * Authentication: ?key=zsk_... query param OR Authorization: Bearer zsk_...
 *
 * Claude Desktop: paste https://zluri-csm.vercel.app/api/mcp?key=YOUR_KEY
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import crypto from 'node:crypto'

export const maxDuration = 60

// ─── Auth ────────────────────────────────────────────────────────────────────

async function resolveApiKey(request: NextRequest): Promise<{ userId: string; baseUrl: string } | null> {
  const { searchParams } = new URL(request.url)
  const keyFromQuery = searchParams.get('key')
  const authHeader = request.headers.get('authorization')
  const keyFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  const rawKey = keyFromQuery ?? keyFromHeader

  if (!rawKey) return null

  const hashed = crypto.createHash('sha256').update(rawKey).digest('hex')
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('api_keys')
    .select('id, user_id')
    .eq('key_hash', hashed)
    .single()

  if (!data) return null

  // Update last_used_at without blocking
  supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zluri-csm.vercel.app'
  return { userId: data.user_id, baseUrl }
}

// ─── Internal API helper ──────────────────────────────────────────────────────

function makeApiFetch(rawKey: string, baseUrl: string) {
  return async function apiFetch(path: string, options?: RequestInit) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text}`)
    }
    return res.json()
  }
}

// ─── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'list_my_accounts',
    description: 'List all accounts assigned to you as CSM',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_account',
    description: 'Get full details for a specific account by ID',
    inputSchema: {
      type: 'object',
      properties: { account_id: { type: 'string', description: 'Account UUID' } },
      required: ['account_id'],
    },
  },
  {
    name: 'update_account',
    description: 'Update fields on an account (health_score, sentiment, renewal_stage, notes, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        fields: { type: 'object', description: 'Fields to update e.g. { "health_score": 72, "sentiment": "good" }' },
      },
      required: ['account_id', 'fields'],
    },
  },
  {
    name: 'get_health_summary',
    description: 'Get a portfolio health snapshot: overdue tasks, at-risk accounts, upcoming renewals',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_tasks',
    description: 'List open tasks, optionally filtered by account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string', description: 'Filter to a specific account' },
        status: { type: 'string', enum: ['pending_review', 'open', 'in_progress', 'completed', 'cancelled'] },
      },
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task for an account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        title: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD' },
        description: { type: 'string' },
        plan_id: { type: 'string' },
      },
      required: ['account_id', 'title'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as completed',
    inputSchema: {
      type: 'object',
      properties: { task_id: { type: 'string' } },
      required: ['task_id'],
    },
  },
  {
    name: 'list_notes',
    description: 'List meeting notes for an account',
    inputSchema: {
      type: 'object',
      properties: { account_id: { type: 'string' } },
      required: ['account_id'],
    },
  },
  {
    name: 'add_note',
    description: 'Add a meeting note to an account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        content: { type: 'string' },
        title: { type: 'string' },
        meeting_date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['account_id', 'content'],
    },
  },
  {
    name: 'list_contacts',
    description: 'List contacts for an account',
    inputSchema: {
      type: 'object',
      properties: { account_id: { type: 'string' } },
      required: ['account_id'],
    },
  },
  {
    name: 'create_contact',
    description: 'Add a contact to an account',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        is_primary: { type: 'boolean' },
      },
      required: ['account_id', 'name'],
    },
  },
  {
    name: 'list_pending_tasks',
    description: 'List AI-suggested pending tasks awaiting CSM review, optionally filtered by account',
    inputSchema: {
      type: 'object',
      properties: { account_id: { type: 'string' } },
    },
  },
]

// ─── Tool handlers ────────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>, apiFetch: ReturnType<typeof makeApiFetch>): Promise<string> {
  const today = new Date().toISOString().split('T')[0]
  const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]

  switch (name) {
    case 'list_my_accounts': {
      const accounts = await apiFetch('/api/accounts')
      return JSON.stringify(accounts.map((a: Record<string, unknown>) => ({
        id: a.id, name: a.name, arr: a.arr, health_score: a.health_score,
        sentiment: a.sentiment, renewal_date: a.renewal_date,
        renewal_stage: a.renewal_stage, tier: a.tier, status: a.status,
      })), null, 2)
    }

    case 'get_account': {
      const account = await apiFetch(`/api/accounts/${args.account_id}`)
      return JSON.stringify(account, null, 2)
    }

    case 'update_account': {
      const updated = await apiFetch(`/api/accounts/${args.account_id}`, {
        method: 'PATCH',
        body: JSON.stringify(args.fields),
      })
      return `Account updated:\n${JSON.stringify(updated, null, 2)}`
    }

    case 'get_health_summary': {
      const [accounts, tasks] = await Promise.all([
        apiFetch('/api/accounts'),
        apiFetch('/api/tasks/all'),
      ])
      const overdue = tasks.filter((t: Record<string, unknown>) => t.due_date && (t.due_date as string) < today)
      const atRisk = accounts.filter((a: Record<string, unknown>) => a.sentiment === 'high_risk' || ((a.health_score as number) ?? 100) < 31)
      const renewals = accounts.filter((a: Record<string, unknown>) =>
        a.renewal_date && (a.renewal_date as string) <= thirtyDays && (a.renewal_date as string) >= today
      )
      return JSON.stringify({
        total_accounts: accounts.length,
        at_risk_accounts: atRisk.map((a: Record<string, unknown>) => ({ name: a.name, health: a.health_score, sentiment: a.sentiment })),
        overdue_tasks: overdue.map((t: Record<string, unknown>) => ({ title: t.title, account: (t.account as Record<string, unknown>)?.name, due: t.due_date })),
        upcoming_renewals: renewals.map((a: Record<string, unknown>) => ({ name: a.name, renewal_date: a.renewal_date, arr: a.arr })),
      }, null, 2)
    }

    case 'list_tasks': {
      if (args.account_id) {
        const res = await apiFetch(`/api/tasks?accountId=${args.account_id}`)
        const all = [...(res.unplanned ?? []), ...(res.plans ?? []).flatMap((p: Record<string, unknown>) => (p.tasks as unknown[]) ?? [])]
        const filtered = args.status ? all.filter((t: Record<string, unknown>) => t.status === args.status) : all
        return JSON.stringify(filtered, null, 2)
      }
      const tasks = await apiFetch('/api/tasks/all')
      return JSON.stringify(args.status ? tasks.filter((t: Record<string, unknown>) => t.status === args.status) : tasks, null, 2)
    }

    case 'create_task': {
      const task = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(args),
      })
      return `Task created:\n${JSON.stringify(task, null, 2)}`
    }

    case 'complete_task': {
      const task = await apiFetch(`/api/tasks/${args.task_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      })
      return `Task completed: ${(task as Record<string, unknown>).title}`
    }

    case 'list_notes': {
      const notes = await apiFetch(`/api/notes?accountId=${args.account_id}`)
      return JSON.stringify(notes, null, 2)
    }

    case 'add_note': {
      const note = await apiFetch('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          account_id: args.account_id,
          content: args.content,
          title: args.title ?? 'Meeting note',
          meeting_date: args.meeting_date ?? today,
          source: 'manual',
          attendees: [],
        }),
      })
      return `Note saved: ${JSON.stringify(note, null, 2)}`
    }

    case 'list_contacts': {
      const contacts = await apiFetch(`/api/contacts?accountId=${args.account_id}`)
      return JSON.stringify(contacts, null, 2)
    }

    case 'create_contact': {
      const contact = await apiFetch('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({ ...args, is_primary: args.is_primary ?? false }),
      })
      return `Contact added: ${JSON.stringify(contact, null, 2)}`
    }

    case 'list_pending_tasks': {
      const url = args.account_id ? `/api/pending-tasks?accountId=${args.account_id}` : '/api/pending-tasks/all'
      const tasks = await apiFetch(url)
      return JSON.stringify(tasks, null, 2)
    }

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

// ─── JSON-RPC handler ─────────────────────────────────────────────────────────

function jsonRpc(id: unknown, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result })
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } })
}

// ─── Route handlers ───────────────────────────────────────────────────────────

function unauthorized() {
  return NextResponse.json(
    { error: 'unauthorized', error_description: 'Invalid or missing API key' },
    { status: 401, headers: { 'WWW-Authenticate': 'Bearer' } }
  )
}

export async function GET(request: NextRequest) {
  const auth = await resolveApiKey(request)
  if (!auth) return unauthorized()

  // Return server info for discovery
  return NextResponse.json({
    name: 'zluri',
    version: '1.0.0',
    description: 'Zluri CSM platform MCP server',
    tools: TOOLS.map(t => t.name),
  })
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rawKey = searchParams.get('key') ?? request.headers.get('authorization')?.slice(7) ?? ''

  const auth = await resolveApiKey(request)
  if (!auth) return unauthorized()

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  const { id, method, params } = body as { id: unknown; method: string; params?: Record<string, unknown> }

  if (method === 'initialize') {
    return jsonRpc(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'zluri', version: '1.0.0' },
    })
  }

  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 204 })
  }

  if (method === 'tools/list') {
    return jsonRpc(id, { tools: TOOLS })
  }

  if (method === 'tools/call') {
    const toolName = (params?.name as string) ?? ''
    const toolArgs = (params?.arguments ?? {}) as Record<string, unknown>
    const apiFetch = makeApiFetch(rawKey, auth.baseUrl)

    try {
      const text = await callTool(toolName, toolArgs, apiFetch)
      return jsonRpc(id, { content: [{ type: 'text', text }] })
    } catch (err) {
      return jsonRpc(id, {
        content: [{ type: 'text', text: err instanceof Error ? err.message : String(err) }],
        isError: true,
      })
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`)
}
