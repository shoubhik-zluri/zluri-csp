import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedClient } from '@/lib/api-auth'

export async function POST(request: NextRequest) {
  // Accept key from request header (set by UI when user enters key in Settings)
  // Fall back to server env var (team key on Vercel)
  const apiKey = request.headers.get('x-anthropic-key') || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return NextResponse.json({
      content: '**No API key configured.** Go to **Settings → AI Provider** and enter your Anthropic API key, or ask your admin to set `ANTHROPIC_API_KEY` on the Vercel deployment.',
    })
  }

  const { messages } = await request.json()

  // Build system prompt from real DB data
  const auth = await getAuthenticatedClient(request)
  let systemPrompt = buildBasePrompt()

  if (auth) {
    const { supabase, user, profile } = auth
    try {
      // Fetch accounts visible to this user
      let accQuery = supabase
        .from('accounts')
        .select('name, arr, health_score, sentiment, renewal_date, risk_signals, csm:profiles!csm_id(full_name)')
        .order('name')
        .limit(100)
      if (profile?.role !== 'admin') {
        accQuery = accQuery.eq('csm_id', user.id)
      }
      const { data: accounts } = await accQuery

      // Fetch open tasks for this user
      const { data: tasks } = await supabase
        .from('tasks')
        .select('title, status, due_date, account:accounts!account_id(name)')
        .eq('owner_id', user.id)
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
        .limit(50)

      systemPrompt = buildSystemPrompt(profile, accounts ?? [], tasks ?? [])
    } catch {
      // Fall back to base prompt if DB fails
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      const errMsg = data?.error?.message ?? 'Claude API error'
      if (response.status === 401) {
        return NextResponse.json({ content: `**Invalid API key.** Check your Anthropic API key in Settings → AI Provider. (${errMsg})` })
      }
      return NextResponse.json({ content: `**Claude API error:** ${errMsg}` })
    }

    const content = data.content?.[0]?.text ?? 'No response from Claude.'
    return NextResponse.json({ content })
  } catch (err) {
    console.error('Claude API error:', err)
    return NextResponse.json({
      content: 'Failed to reach Claude API. Check your connection and API key.',
    })
  }
}

function buildBasePrompt() {
  return `You are a Customer Success assistant embedded in Zluri CSP, an internal CS platform.
Help the CS team manage accounts, tasks, renewals, and risk. Be concise and actionable.
Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`
}

function buildSystemPrompt(
  profile: { full_name: string | null; role: string } | null,
  accounts: Array<{ name: string; arr: number | null; health_score: number | null; sentiment: string | null; renewal_date: string | null; risk_signals: string[]; csm?: { full_name: string | null } | null }>,
  tasks: Array<{ title: string; status: string; due_date: string | null; account?: { name: string } | null }>
) {
  const name = profile?.full_name ?? 'the user'
  const isAdmin = profile?.role === 'admin'

  const accountLines = accounts.map(a => {
    const csm = (a.csm as { full_name: string | null } | null)?.full_name ?? 'Unassigned'
    const risks = (a.risk_signals ?? []).join(', ') || 'none'
    return `- ${a.name} | ARR: $${((a.arr ?? 0) / 1000).toFixed(0)}K | Health: ${a.health_score ?? 'N/A'} | Pulse: ${a.sentiment ?? 'N/A'} | Renewal: ${a.renewal_date ?? 'N/A'} | CSM: ${csm} | Risks: ${risks}`
  }).join('\n')

  const taskLines = tasks.map(t => {
    const acc = (t.account as { name: string } | null)?.name ?? 'General'
    return `- [${t.status.toUpperCase()}] ${t.title} → ${acc} | Due: ${t.due_date ?? 'N/A'}`
  }).join('\n')

  return `You are a Customer Success assistant embedded in Zluri CSP, an internal CS platform used by Zluri's CS team.

Current user: ${name} (${isAdmin ? 'Admin' : 'CSM'})
Today's date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

LIVE PORTFOLIO DATA (${accounts.length} accounts):
${accountLines || 'No accounts found.'}

OPEN TASKS (${tasks.length}):
${taskLines || 'No open tasks.'}

You can:
- Answer questions about account health, risk, and renewal status
- Help prioritize tasks and accounts
- Draft renewal emails, risk escalations, or QBR summaries
- Identify trends or patterns in the portfolio
- Suggest next steps for at-risk accounts

Be concise, direct, and actionable. Use markdown formatting where helpful.`
}
