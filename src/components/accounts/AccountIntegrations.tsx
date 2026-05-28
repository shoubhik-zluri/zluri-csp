'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, X, Check, Zap, Loader2, Save } from 'lucide-react'

function IntegrationSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-[#f6f3f2] border-b border-[#ebe7e7]">
        <span className="text-xs font-bold tracking-widest uppercase text-[#434655]">{title}</span>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`w-9 h-5 rounded-full relative transition-colors ${on ? 'bg-blue-600' : 'bg-[#c3c5d8]'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-4' : 'left-0.5'}`} />
    </button>
  )
}

interface SyncMcpRowProps {
  label: string
  note: string
}

// For Gmail/Slack/Jira/Notion — syncs happen via Claude MCP, not direct web sync
function SyncMcpRow({ label, note }: SyncMcpRowProps) {
  return (
    <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
      <p className="text-xs text-[#737687]">{note}</p>
      <span className="text-[10px] font-bold bg-[#f0edec] text-[#434655] px-3 py-1.5 rounded-full whitespace-nowrap">
        Syncs via Claude MCP
      </span>
    </div>
  )
}

interface GranolaRowProps {
  accountId: string
  onSynced: () => void
}

function GranolaRow({ accountId, onSynced }: GranolaRowProps) {
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)

  async function triggerSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/integrations/granola/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'GRANOLA_REFRESH_TOKEN not configured') {
          toast.error('Granola not configured on the server. Ask your admin to set GRANOLA_REFRESH_TOKEN.')
        } else {
          toast.error(data.error ?? 'Sync failed')
        }
        return
      }
      const msg = `Synced ${data.synced} note${data.synced !== 1 ? 's' : ''}${data.skipped ? `, skipped ${data.skipped}` : ''}`
      toast.success(msg)
      setLastSync(new Date().toLocaleTimeString())
      onSynced()
    } catch {
      toast.error('Sync failed — check connection')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
      <div className="text-xs text-[#737687]">
        {lastSync ? `Last synced at ${lastSync}` : 'Pull meeting notes from Granola into this account'}
      </div>
      <button
        onClick={triggerSync}
        disabled={syncing}
        className="flex items-center gap-1.5 text-xs font-bold bg-[#1c1b1b] text-white px-3 py-1.5 rounded-lg hover:bg-[#434655] transition-colors disabled:opacity-60"
      >
        {syncing
          ? <><Loader2 className="w-3 h-3 animate-spin" />Syncing…</>
          : <><Zap className="w-3 h-3" />Sync now</>}
      </button>
    </div>
  )
}

interface IntegrationState {
  slack_channel_name: string
  email_domain: string
  jira_project_key: string
  granola_folder_id: string
  notion_page_id: string
}

const EMPTY_STATE: IntegrationState = {
  slack_channel_name: '',
  email_domain: '',
  jira_project_key: '',
  granola_folder_id: '',
  notion_page_id: '',
}

export default function AccountIntegrations({ account }: { account: { id: string; name: string } }) {
  const [fields, setFields] = useState<IntegrationState>(EMPTY_STATE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${account.id}/integrations`)
      const data = await res.json()
      if (res.ok && data) {
        setFields({
          slack_channel_name: data.slack_channel_name ?? '',
          email_domain: data.email_domain ?? '',
          jira_project_key: data.jira_project_key ?? '',
          granola_folder_id: data.granola_folder_id ?? '',
          notion_page_id: data.notion_page_id ?? '',
        })
      }
    } finally {
      setLoading(false)
    }
  }, [account.id])

  useEffect(() => { load() }, [load])

  function update(key: keyof IntegrationState, value: string) {
    setFields(f => ({ ...f, [key]: value }))
  }

  async function saveSection(section: string, patch: Partial<IntegrationState>) {
    setSaving(section)
    try {
      const res = await fetch(`/api/accounts/${account.id}/integrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!res.ok) { toast.error('Failed to save'); return }
      toast.success('Saved')
      setSaved(section)
      setTimeout(() => setSaved(null), 2000)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#737687]" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#434655]">
        Map <strong className="text-[#1c1b1b]">{account.name}</strong> to your connected tools.
        Claude uses these mappings to surface relevant context when you ask questions about this account.
      </p>

      {/* Slack */}
      <IntegrationSection title="Slack">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Channel name</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#737687]">#</span>
            <input
              value={fields.slack_channel_name.replace(/^#/, '')}
              onChange={e => update('slack_channel_name', e.target.value)}
              placeholder={`${account.name.toLowerCase().replace(/\s+/g, '-')}-cs`}
              className="flex-1 border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
          </div>
          <p className="text-xs text-[#737687] mt-1.5">Claude will read messages from this channel when you ask about {account.name}.</p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
          <SyncMcpRow label="Slack" note="Slack reads happen via your Claude MCP connection — no manual sync needed." />
          <button
            onClick={() => saveSection('slack', { slack_channel_name: fields.slack_channel_name })}
            disabled={saving === 'slack'}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec] transition-colors ml-3"
          >
            {saving === 'slack' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'slack' ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
            {saved === 'slack' ? 'Saved' : 'Save'}
          </button>
        </div>
      </IntegrationSection>

      {/* Gmail */}
      <IntegrationSection title="Gmail">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Email domain</label>
          <input
            value={fields.email_domain}
            onChange={e => update('email_domain', e.target.value)}
            placeholder={`${account.name.toLowerCase().replace(/\s+/g, '')}.com`}
            className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          />
          <p className="text-xs text-[#737687] mt-1.5">Claude searches for emails from this domain when looking for context about {account.name}.</p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
          <SyncMcpRow label="Gmail" note="Email reads happen via your Claude Gmail MCP — no manual sync needed." />
          <button
            onClick={() => saveSection('gmail', { email_domain: fields.email_domain })}
            disabled={saving === 'gmail'}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec] transition-colors ml-3"
          >
            {saving === 'gmail' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'gmail' ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
            {saved === 'gmail' ? 'Saved' : 'Save'}
          </button>
        </div>
      </IntegrationSection>

      {/* Jira */}
      <IntegrationSection title="Jira">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Project key</label>
          <input
            value={fields.jira_project_key}
            onChange={e => update('jira_project_key', e.target.value.toUpperCase())}
            placeholder="CUST"
            className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 font-mono"
          />
          <p className="text-xs text-[#737687] mt-1.5">
            Jira tickets in this project will be linked to {account.name}. Claude also fuzzy-matches by account name.
          </p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
          <SyncMcpRow label="Jira" note="Jira reads happen via your Claude Jira MCP — no manual sync needed." />
          <button
            onClick={() => saveSection('jira', { jira_project_key: fields.jira_project_key })}
            disabled={saving === 'jira'}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec] transition-colors ml-3"
          >
            {saving === 'jira' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'jira' ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
            {saved === 'jira' ? 'Saved' : 'Save'}
          </button>
        </div>
      </IntegrationSection>

      {/* Granola */}
      <IntegrationSection title="Granola">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Folder name or ID</label>
          <input
            value={fields.granola_folder_id}
            onChange={e => update('granola_folder_id', e.target.value)}
            placeholder={account.name}
            className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          />
          <p className="text-xs text-[#737687] mt-1.5">
            Meeting transcripts from this Granola folder will sync as notes on this account.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => saveSection('granola', { granola_folder_id: fields.granola_folder_id })}
            disabled={saving === 'granola'}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec] transition-colors"
          >
            {saving === 'granola' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'granola' ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
            {saved === 'granola' ? 'Saved' : 'Save'}
          </button>
        </div>
        <GranolaRow accountId={account.id} onSynced={load} />
      </IntegrationSection>

      {/* Notion */}
      <IntegrationSection title="Notion">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Page URL or ID</label>
          <input
            value={fields.notion_page_id}
            onChange={e => update('notion_page_id', e.target.value)}
            placeholder="https://notion.so/…"
            className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          />
          <p className="text-xs text-[#737687] mt-1.5">Claude will reference this Notion page for account context.</p>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#f0edec]">
          <SyncMcpRow label="Notion" note="Notion reads happen via your Claude Notion MCP — no manual sync needed." />
          <button
            onClick={() => saveSection('notion', { notion_page_id: fields.notion_page_id })}
            disabled={saving === 'notion'}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec] transition-colors ml-3"
          >
            {saving === 'notion' ? <Loader2 className="w-3 h-3 animate-spin" /> : saved === 'notion' ? <Check className="w-3 h-3 text-green-600" /> : <Save className="w-3 h-3" />}
            {saved === 'notion' ? 'Saved' : 'Save'}
          </button>
        </div>
      </IntegrationSection>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <strong>How Claude uses these:</strong> When you open AI Insights for this account, Claude automatically reads
        the mapped Slack channel, Gmail domain, Jira project, and Notion page via your connected MCP tools — no manual
        sync required for those. Granola meeting notes are synced directly into the Notes tab.
      </div>
    </div>
  )
}
