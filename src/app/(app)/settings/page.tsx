'use client'

import { useState, useEffect } from 'react'
import {
  Check, Eye, EyeOff, ExternalLink, Plug, CheckCircle2,
  Mail, MessageSquare, Calendar, Mic, FileText, Bug,
  Save, Bell, BellOff, Key, Plus, Trash2, Copy, AlertTriangle, Info,
} from 'lucide-react'
import CustomFieldsTab from '@/components/settings/CustomFieldsTab'

const PROVIDERS = [
  { id: 'claude-cowork',    label: 'Claude Cowork',    desc: 'Company-wide Claude Teams workspace. Recommended — your MCP integrations are already connected here.' },
  { id: 'anthropic-direct', label: 'Anthropic Direct', desc: 'Use your own Anthropic API key directly. MCP integrations not included.' },
  { id: 'openai',           label: 'OpenAI',           desc: 'Use OpenAI (GPT-4o). Enter your OpenAI API key.' },
  { id: 'gemini',           label: 'Google Gemini',    desc: 'Use Google Gemini Pro. Enter your Google AI Studio key.' },
]

// ─── AI Tab ───────────────────────────────────────────────────────────────────
function AiTab() {
  const [provider, setProvider]    = useState('claude-cowork')
  const [apiKey, setApiKey]        = useState('')
  const [showKey, setShowKey]      = useState(false)
  const [workspaceEmail, setEmail] = useState('jane@zluri.com')
  const [saved, setSaved]          = useState(false)

  useEffect(() => {
    const k = localStorage.getItem('zsp_anthropic_key')
    if (k) setApiKey(k)
    const p = localStorage.getItem('zsp_ai_provider')
    if (p) setProvider(p)
  }, [])

  function save() {
    if (apiKey) localStorage.setItem('zsp_anthropic_key', apiKey)
    else localStorage.removeItem('zsp_anthropic_key')
    localStorage.setItem('zsp_ai_provider', provider)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-base font-bold text-[#1c1b1b] mb-1">AI Provider</h2>
        <p className="text-sm text-[#434655]">Choose which AI powers the assistant in this platform.</p>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map(p => (
          <label key={p.id}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
              provider === p.id ? 'border-blue-600 bg-blue-50/40' : 'border-[#e5e2e1] hover:border-[#c3c5d8]'
            }`}>
            <input type="radio" name="provider" value={p.id} checked={provider === p.id}
              onChange={() => setProvider(p.id)} className="mt-0.5 accent-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-bold text-[#1c1b1b]">{p.label}</div>
              <div className="text-xs text-[#434655] mt-0.5">{p.desc}</div>
            </div>
            {provider === p.id && <Check className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />}
          </label>
        ))}
      </div>

      {provider === 'claude-cowork' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#434655] uppercase tracking-widest mb-2">Cowork Workspace Email</label>
            <input value={workspaceEmail} onChange={e => setEmail(e.target.value)}
              className="w-full border border-[#e5e2e1] rounded-xl px-4 py-2.5 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-600"
              placeholder="you@zluri.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#434655] uppercase tracking-widest mb-2">
              API Key <span className="text-[#737687] normal-case font-normal tracking-normal">(from console.anthropic.com)</span>
            </label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
                className="w-full border border-[#e5e2e1] rounded-xl px-4 py-2.5 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-600 pr-12"
                placeholder="sk-ant-api03-…" />
              <button onClick={() => setShowKey(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737687] hover:text-[#1c1b1b]">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {apiKey && (
              <div className="flex items-center gap-1.5 mt-2 text-[#176e00] text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />Key saved — AI chat is active
              </div>
            )}
            <p className="text-xs text-[#737687] mt-1.5">
              Stored in your browser only. Never sent to Zluri servers.{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Get a key ↗
              </a>
            </p>
          </div>
        </div>
      )}

      {provider !== 'claude-cowork' && (
        <div>
          <label className="block text-xs font-bold text-[#434655] uppercase tracking-widest mb-2">
            {provider === 'openai' ? 'OpenAI API Key' : provider === 'gemini' ? 'Google AI Studio Key' : 'API Key'}
          </label>
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)}
              className="w-full border border-[#e5e2e1] rounded-xl px-4 py-2.5 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-600 pr-12"
              placeholder={provider === 'openai' ? 'sk-…' : provider === 'gemini' ? 'AIza…' : 'Enter API key'} />
            <button onClick={() => setShowKey(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737687] hover:text-[#1c1b1b]">
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-[#737687] mt-1.5">Stored in your browser only.</p>
        </div>
      )}

      <button onClick={save}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">
        {saved ? <><Check className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Settings</>}
      </button>
    </div>
  )
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

const MCP_INTEGRATIONS = [
  { id: 'gmail',    label: 'Gmail',           icon: <Mail className="w-4 h-4" />,        desc: 'Read emails by domain — Claude searches for threads from the account\'s email domain.' },
  { id: 'slack',    label: 'Slack',           icon: <MessageSquare className="w-4 h-4" />, desc: 'Read channel messages — Claude pulls context from mapped Slack channels.' },
  { id: 'gcal',    label: 'Google Calendar',  icon: <Calendar className="w-4 h-4" />,     desc: 'Check upcoming meetings — Claude can look up scheduled calls with this account.' },
  { id: 'granola',  label: 'Granola',         icon: <Mic className="w-4 h-4" />,          desc: 'Sync meeting transcripts — notes are pulled into the account Notes tab.' },
  { id: 'notion',   label: 'Notion',          icon: <FileText className="w-4 h-4" />,     desc: 'Reference account pages — Claude reads the mapped Notion page for context.' },
  { id: 'jira',     label: 'Jira',            icon: <Bug className="w-4 h-4" />,          desc: 'Link support tickets — Claude finds Jira issues for this account by project key or name match.' },
]

function IntegrationsTab() {
  return (
    <div className="max-w-3xl space-y-8">

      {/* Architecture explanation */}
      <div className="bg-[#f0edec] rounded-xl p-5 space-y-3">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-[#434655] mt-0.5 shrink-0" />
          <div className="text-sm text-[#434655] space-y-2">
            <p>
              <strong className="text-[#1c1b1b]">How integrations work in this platform:</strong>
            </p>
            <p>
              Integrations live in your <strong>Claude Desktop / Claude.ai</strong> account — not here. When you connect
              Gmail, Slack, Granola, or Jira in Claude, those tools become available to the Claude MCP server
              (<code className="bg-white px-1 py-0.5 rounded text-xs font-mono">zluri-mcp</code>) that connects your
              Claude to this web app.
            </p>
            <p>
              For each account, you map which channel, domain, project, or folder belongs to that customer in the
              account&apos;s <strong>Integrations tab</strong>. Claude then uses those mappings when you ask it questions.
            </p>
            <p>
              <strong>Granola</strong> is the exception — meeting transcripts are synced directly into the Notes tab
              via the &quot;Sync now&quot; button on each account.
            </p>
          </div>
        </div>
      </div>

      {/* Personal vs team */}
      <div>
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-4">Personal vs. team instance</h3>
        <div className="bg-white rounded-xl shadow-sm divide-y divide-[#f0edec]">
          <div className="p-5">
            <div className="text-sm font-bold text-[#1c1b1b] mb-1">Your personal Claude Desktop</div>
            <p className="text-xs text-[#434655]">
              Has your personal Gmail, Granola, Slack MCPs connected. When you run <code className="bg-[#f0edec] px-1 py-0.5 rounded font-mono text-xs">zluri-mcp</code> here,
              it reads from your personal accounts. This is fine for your own accounts.
            </p>
          </div>
          <div className="p-5">
            <div className="text-sm font-bold text-[#1c1b1b] mb-1">Team / Cowork instance</div>
            <p className="text-xs text-[#434655]">
              To use team-shared MCPs (e.g. a shared Granola workspace, team Slack bot), set up <code className="bg-[#f0edec] px-1 py-0.5 rounded font-mono text-xs">zluri-mcp</code> in
              a team Claude workspace (Claude Teams / Cowork) with MCPs connected to team credentials. The Granola server-side
              sync uses <code className="bg-[#f0edec] px-1 py-0.5 rounded font-mono text-xs">GRANOLA_REFRESH_TOKEN</code> — ask
              your admin to set this on Vercel.
            </p>
          </div>
        </div>
      </div>

      {/* Available integrations */}
      <div>
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-4">Supported integrations</h3>
        <div className="space-y-3">
          {MCP_INTEGRATIONS.map(intg => (
            <div key={intg.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-[#dce1ff] flex items-center justify-center text-[#004bd8] shrink-0">
                {intg.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#1c1b1b] text-sm">{intg.label}</div>
                <div className="text-xs text-[#434655] mt-0.5">{intg.desc}</div>
              </div>
              <div className="shrink-0">
                {intg.id === 'granola' ? (
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <CheckCircle2 className="w-3 h-3" />Server sync
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                    via Claude MCP
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <strong>Configure per-account mappings</strong> in each account&apos;s <strong>Integrations tab</strong> —
        open any account → Integrations to set the Slack channel, Gmail domain, Jira project, and Granola folder for that customer.
        {' '}<a href="/accounts" className="underline font-bold">Go to Accounts →</a>
      </div>
    </div>
  )
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────
interface ApiKey { id: string; name: string; last_used_at: string | null; created_at: string }

function ApiKeysTab() {
  const [keys, setKeys]             = useState<ApiKey[]>([])
  const [loading, setLoading]       = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [generating, setGenerating] = useState(false)
  const [rawKey, setRawKey]         = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/api-keys')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setKeys(d) })
      .finally(() => setLoading(false))
  }, [])

  async function generate() {
    if (!newKeyName.trim()) return
    setGenerating(true)
    const res = await fetch('/api/auth/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName.trim() }),
    })
    const data = await res.json()
    if (data.raw_key) {
      setRawKey(data.raw_key)
      setKeys(k => [{ id: data.id, name: data.name, last_used_at: null, created_at: data.created_at }, ...k])
      setNewKeyName('')
    }
    setGenerating(false)
  }

  async function deleteKey(id: string) {
    setDeletingId(id)
    await fetch(`/api/auth/api-keys?id=${id}`, { method: 'DELETE' })
    setKeys(k => k.filter(x => x.id !== id))
    setDeletingId(null)
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h2 className="text-base font-bold text-[#1c1b1b] mb-1">API Keys for Claude MCP</h2>
        <p className="text-sm text-[#434655]">
          Generate a key so your Claude instance can read and write to Zluri using the{' '}
          <code className="bg-[#f0edec] px-1.5 py-0.5 rounded text-xs font-mono">zluri-mcp</code> server.
          Keys are stored as hashes — the raw key is shown only once.
        </p>
      </div>

      {/* Generate new key */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655]">New key</h3>
        <div className="flex gap-3">
          <input
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && generate()}
            placeholder="e.g. My MacBook Claude"
            className="flex-1 border border-[#e5e2e1] rounded-xl px-4 py-2.5 text-sm text-[#1c1b1b] focus:outline-none focus:border-blue-600"
          />
          <button
            onClick={generate}
            disabled={generating || !newKeyName.trim()}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
            <Plus className="w-4 h-4" />
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {/* Raw key reveal modal */}
      {rawKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            Copy this key now — it won&apos;t be shown again
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono text-[#1c1b1b] break-all">
              {rawKey}
            </code>
            <button onClick={() => copy(rawKey)}
              className="shrink-0 flex items-center gap-1.5 bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-700">
              {copied ? <><Check className="w-3.5 h-3.5" />Copied!</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
            </button>
          </div>
          <p className="text-xs text-amber-600">
            Set <code className="font-mono">ZLURI_API_KEY=&quot;{rawKey.slice(0, 12)}…&quot;</code> in your Claude Desktop config.
          </p>
          <button onClick={() => setRawKey(null)} className="text-xs text-amber-700 font-semibold hover:underline">
            I&apos;ve saved it — dismiss
          </button>
        </div>
      )}

      {/* Existing keys list */}
      <div>
        <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-3">
          Your keys ({keys.length})
        </h3>
        {loading ? (
          <div className="text-sm text-[#737687]">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-[#737687] bg-white rounded-xl p-5 text-center shadow-sm">
            <Key className="w-8 h-8 text-[#c3c5d8] mx-auto mb-2" />
            No API keys yet. Generate one above.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm divide-y divide-[#f0edec]">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-[#434655]" />
                  <div>
                    <div className="text-sm font-semibold text-[#1c1b1b]">{k.name}</div>
                    <div className="text-xs text-[#737687]">
                      Created {new Date(k.created_at).toLocaleDateString()}{' · '}
                      {k.last_used_at
                        ? `Last used ${new Date(k.last_used_at).toLocaleDateString()}`
                        : 'Never used'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteKey(k.id)}
                  disabled={deletingId === k.id}
                  className="text-[#737687] hover:text-red-600 transition-colors disabled:opacity-40 p-2 rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup instructions */}
      <div className="bg-[#f0edec] rounded-xl p-5 text-xs text-[#434655] space-y-2">
        <div className="font-bold text-[#1c1b1b] text-sm">Claude Desktop setup</div>
        <p>Add this to <code className="font-mono">~/.claude/claude_desktop_config.json</code> (or Claude Desktop MCP settings):</p>
        <pre className="bg-white rounded-lg p-3 text-[11px] font-mono text-[#1c1b1b] overflow-x-auto whitespace-pre-wrap">{`{
  "mcpServers": {
    "zluri": {
      "command": "node",
      "args": ["/path/to/zluri-mcp/dist/index.js"],
      "env": {
        "ZLURI_API_KEY": "your_key_here",
        "ZLURI_BASE_URL": "${typeof window !== 'undefined' ? window.location.origin : 'https://zluri-csm.vercel.app'}"
      }
    }
  }
}`}</pre>
        <p>Then run <code className="font-mono bg-white px-1.5 py-0.5 rounded">npm install &amp;&amp; npm run build</code> inside the <code className="font-mono bg-white px-1.5 py-0.5 rounded">zluri-mcp/</code> directory.</p>
      </div>
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
const NOTIF_GROUPS = [
  { label: 'Account Alerts', items: [
    { id: 'risk_change',   label: 'Sentiment changes to High Risk', default: true  },
    { id: 'health_drop',   label: 'Health score drops > 10 points', default: true  },
    { id: 'renewal_30',    label: 'Renewal within 30 days',         default: true  },
    { id: 'renewal_90',    label: 'Renewal within 90 days',         default: false },
  ]},
  { label: 'Tasks', items: [
    { id: 'task_overdue',   label: 'Task becomes overdue',          default: true  },
    { id: 'task_assigned',  label: 'Task assigned to me',           default: true  },
    { id: 'task_comment',   label: 'Comment added to my task',      default: false },
  ]},
  { label: 'AI Insights', items: [
    { id: 'ai_high_risk',  label: 'New High Risk insight detected', default: true  },
    { id: 'ai_expansion',  label: 'Expansion opportunity detected', default: true  },
    { id: 'ai_weekly',     label: 'Weekly AI portfolio summary',    default: false },
  ]},
]

function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_GROUPS.flatMap(g => g.items.map(i => [i.id, i.default])))
  )
  const [saved, setSaved] = useState(false)
  return (
    <div className="max-w-2xl space-y-8">
      {NOTIF_GROUPS.map(group => (
        <div key={group.label}>
          <h3 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-3">{group.label}</h3>
          <div className="bg-white rounded-xl shadow-sm divide-y divide-[#f0edec]">
            {group.items.map(item => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[#f6f3f2] transition-colors">
                <div className="flex items-center gap-3">
                  {prefs[item.id] ? <Bell className="w-4 h-4 text-blue-600" /> : <BellOff className="w-4 h-4 text-[#c3c5d8]" />}
                  <span className="text-sm text-[#1c1b1b]">{item.label}</span>
                </div>
                <button onClick={() => setPrefs(p => ({ ...p, [item.id]: !p[item.id] }))}
                  className={`w-9 h-5 rounded-full relative transition-colors ${prefs[item.id] ? 'bg-blue-600' : 'bg-[#c3c5d8]'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${prefs[item.id] ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500) }}
        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 transition-colors">
        {saved ? <><Check className="w-4 h-4" />Saved!</> : <><Save className="w-4 h-4" />Save Preferences</>}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type SettingsTab = 'ai' | 'integrations' | 'notifications' | 'api-keys' | 'custom-fields'

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('ai')
  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'ai',            label: 'AI Provider'    },
    { id: 'integrations',  label: 'Integrations'   },
    { id: 'custom-fields', label: 'Custom Fields'  },
    { id: 'notifications', label: 'Notifications'  },
    { id: 'api-keys',      label: 'API Keys'       },
  ]
  return (
    <div className="px-8 py-8 max-w-[1100px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">Settings</h1>
        <p className="text-[#434655] text-sm">Manage your AI provider, integrations, and preferences.</p>
      </div>
      <div className="flex gap-8">
        <div className="w-44 shrink-0 space-y-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-[#434655] hover:bg-[#f0edec] hover:text-[#1c1b1b]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-w-0">
          {tab === 'ai'            && <AiTab />}
          {tab === 'integrations'  && <IntegrationsTab />}
          {tab === 'custom-fields' && <CustomFieldsTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'api-keys'      && <ApiKeysTab />}
        </div>
      </div>
    </div>
  )
}
