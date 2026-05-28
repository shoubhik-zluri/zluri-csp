'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CheckSquare, Plus, X, RefreshCw, Check, Zap, Clock } from 'lucide-react'

const TABS = ['Overview', 'Contacts', 'Tasks', 'Notes', 'Integrations']

// ─── Account-level Integration Mapping ───────────────────────────────────────

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

function SyncRow({ id }: { id: string }) {
  const [autoSync, setAutoSync] = useState(true)
  const [interval, setInterval] = useState(24)
  const [syncing, setSyncing]   = useState(false)
  const [saved, setSaved]       = useState(false)
  return (
    <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[#f0edec]">
      <label className="flex items-center gap-2 cursor-pointer">
        <button onClick={() => setAutoSync(v => !v)}
          className={`w-9 h-5 rounded-full relative transition-colors ${autoSync ? 'bg-blue-600' : 'bg-[#c3c5d8]'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${autoSync ? 'left-4' : 'left-0.5'}`} />
        </button>
        <span className="text-xs font-semibold text-[#1c1b1b]">Auto-sync</span>
      </label>
      {autoSync && (
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#737687]" />
          <span className="text-xs text-[#434655]">Every</span>
          <select value={interval} onChange={e => setInterval(Number(e.target.value))}
            className="border border-[#e5e2e1] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-blue-600">
            {[24, 48, 72].map(h => <option key={h} value={h}>{h}h</option>)}
          </select>
          <span className="text-[10px] text-[#737687]">min 24h</span>
        </div>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
          className="text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec] flex items-center gap-1">
          {saved ? <><Check className="w-3 h-3 text-green-600" />Saved</> : 'Save'}
        </button>
        <button onClick={() => { setSyncing(true); setTimeout(() => setSyncing(false), 1800) }}
          disabled={syncing}
          className="flex items-center gap-1.5 text-xs font-bold bg-[#1c1b1b] text-white px-3 py-1.5 rounded-lg hover:bg-[#434655] transition-colors disabled:opacity-60">
          <Zap className={`w-3 h-3 ${syncing ? 'animate-pulse' : ''}`} />
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
      </div>
    </div>
  )
}

function AccountIntegrations({ account }: { account: any }) {
  const slug = account.name.toLowerCase().replace(/\s+/g, '-')

  // Slack — multiple channels
  const [slackChannels, setSlackChannels] = useState([`#${slug}-cs`])
  function addSlackChannel()     { setSlackChannels(c => [...c, '']) }
  function removeSlackChannel(i: number) { setSlackChannels(c => c.filter((_, idx) => idx !== i)) }
  function updateSlackChannel(i: number, v: string) { setSlackChannels(c => c.map((ch, idx) => idx === i ? v : ch)) }

  // Gmail — multiple labels
  const [gmailLabels, setGmailLabels] = useState([account.name])
  function addGmailLabel()     { setGmailLabels(l => [...l, '']) }
  function removeGmailLabel(i: number) { setGmailLabels(l => l.filter((_, idx) => idx !== i)) }
  function updateGmailLabel(i: number, v: string) { setGmailLabels(l => l.map((lb, idx) => idx === i ? v : lb)) }

  // Jira — fuzzy match + custom field placeholders
  const [jiraAccountField, setJiraAccountField] = useState('')
  const [jiraDomainField, setJiraDomainField]   = useState('')

  // Granola / Notion
  const [granolaFolder, setGranolaFolder] = useState('')
  const [notionPage, setNotionPage]       = useState('')

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#434655]">
        Map this account to your connected tools. Claude uses these mappings to surface relevant context from Gmail, Slack, Jira, and Granola when you ask questions about <strong className="text-[#1c1b1b]">{account.name}</strong>.
      </p>

      {/* Slack */}
      <IntegrationSection title="Slack">
        <div className="space-y-2">
          {slackChannels.map((ch, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-[#737687]">#</span>
              <input value={ch.replace(/^#/, '')} onChange={e => updateSlackChannel(i, '#' + e.target.value)}
                placeholder={`${slug}-cs`}
                className="flex-1 border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
              {slackChannels.length > 1 && (
                <button onClick={() => removeSlackChannel(i)} className="text-[#737687] hover:text-[#af1a25]">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addSlackChannel}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mt-1">
            <Plus className="w-3.5 h-3.5" />Add channel
          </button>
        </div>
        <SyncRow id={`slack-${account.id}`} />
      </IntegrationSection>

      {/* Gmail */}
      <IntegrationSection title="Gmail">
        <div>
          <p className="text-xs text-[#434655] mb-3">
            Map Gmail labels to this account. Claude will search these labels when looking for emails related to {account.name}.
          </p>
          <div className="space-y-2">
            {gmailLabels.map((lb, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={lb} onChange={e => updateGmailLabel(i, e.target.value)}
                  placeholder={account.name}
                  className="flex-1 border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
                {gmailLabels.length > 1 && (
                  <button onClick={() => removeGmailLabel(i)} className="text-[#737687] hover:text-[#af1a25]">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addGmailLabel}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 mt-1">
              <Plus className="w-3.5 h-3.5" />Add label
            </button>
          </div>
        </div>
        <SyncRow id={`gmail-${account.id}`} />
      </IntegrationSection>

      {/* Jira */}
      <IntegrationSection title="Jira">
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
            <strong>Fuzzy match:</strong> Jira tickets are automatically linked to this account by matching the account name
            (<strong>{account.name}</strong>) against ticket summaries and descriptions. You can also configure custom field IDs
            below to enable exact matching — field IDs will be configured during integration setup.
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">
                Account Name Field ID
                <span className="ml-1 text-[#737687] normal-case font-normal tracking-normal">(configured during setup)</span>
              </label>
              <input value={jiraAccountField} onChange={e => setJiraAccountField(e.target.value)}
                placeholder="customfield_10001"
                className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 bg-[#f6f3f2]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">
                Domain / Org Field ID
                <span className="ml-1 text-[#737687] normal-case font-normal tracking-normal">(configured during setup)</span>
              </label>
              <input value={jiraDomainField} onChange={e => setJiraDomainField(e.target.value)}
                placeholder="customfield_10002"
                className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600 bg-[#f6f3f2]" />
            </div>
          </div>
        </div>
        <SyncRow id={`jira-${account.id}`} />
      </IntegrationSection>

      {/* Granola */}
      <IntegrationSection title="Granola">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Folder ID or Name</label>
          <input value={granolaFolder} onChange={e => setGranolaFolder(e.target.value)}
            placeholder={account.name}
            className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
          <p className="text-xs text-[#737687] mt-1.5">
            Claude will pull meeting transcripts from this Granola folder when you ask about past meetings for {account.name}.
          </p>
        </div>
        <SyncRow id={`granola-${account.id}`} />
      </IntegrationSection>

      {/* Notion */}
      <IntegrationSection title="Notion">
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1.5">Page ID or URL</label>
          <input value={notionPage} onChange={e => setNotionPage(e.target.value)}
            placeholder="https://notion.so/…"
            className="w-full border border-[#e5e2e1] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-600" />
        </div>
        <SyncRow id={`notion-${account.id}`} />
      </IntegrationSection>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AccountTabs({ account, contacts, notes, tasks, projects }: {
  account: any; contacts: any[]; notes: any[]; tasks: any[]; projects: any[]
}) {
  const [tab, setTab] = useState('Overview')

  return (
    <div>
      <nav className="flex border-b border-[#e5e2e1] mb-6">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              'px-6 py-4 text-sm font-medium transition-all border-b-2 -mb-px',
              tab === t
                ? 'text-blue-600 border-blue-600 font-semibold'
                : 'text-[#434655] border-transparent hover:text-[#1c1b1b] hover:bg-[#f6f3f2]'
            )}>
            {t}
          </button>
        ))}
      </nav>

      {tab === 'Overview' && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-5">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-[#1c1b1b]">Account Details</h3>
                <button className="text-blue-600 text-xs font-bold hover:underline">Edit Fields</button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-2">Lifecycle Stage</div>
                  <div className="flex flex-wrap gap-2">
                    {['Onboarding', 'Growth', 'Steady State', 'Renewal', 'Advocacy'].map(s => (
                      <span key={s} className={cn('px-3 py-1 text-xs font-semibold rounded-full',
                        s === (Array.isArray(account.lifecycle_stage) ? account.lifecycle_stage[0] : account.lifecycle_stage)
                          ? 'bg-[#dce1ff] text-[#003baf]' : 'bg-[#f0edec] text-[#434655]')}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Exec Engagement', account.exec_engagement],
                    ['Renewal Stage', account.renewal_stage],
                    ['Contract Type', account.contract_type],
                    ['CSM Owner', account.csm_name],
                  ].map(([label, value]) => (
                    <div key={label} className="p-3 bg-[#f6f3f2] rounded-xl">
                      <div className="text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-1">{label}</div>
                      <div className="text-sm font-bold text-[#1c1b1b]">{value}</div>
                    </div>
                  ))}
                </div>
                {account.risk_signals.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-[#434655] mb-2">Risk Signals</div>
                    <div className="flex flex-wrap gap-2">
                      {account.risk_signals.map((s: string) => (
                        <span key={s} className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-[#93000a] text-[10px] font-bold uppercase tracking-wide rounded-full border border-red-100">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />{s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-span-7">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold text-[#1c1b1b] mb-1">Handover Checklist</h3>
              <p className="text-xs text-[#434655] mb-5">Track the Sales-to-CS transition</p>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { title: 'Pre-Handover', items: ['Signed MSA Uploaded', 'Discovery Notes Synced', 'AE Transition Meeting', 'Risk Assessment Form', 'CRM Account Map Clear'] },
                  { title: 'Onboarding', items: ['Kickoff Call Completed', 'Success Plan Shared', 'Admin Users Provisioned', 'Integrations Live', 'First QBR Scheduled'] },
                ].map(group => (
                  <div key={group.title}>
                    <div className="text-[10px] font-bold tracking-widest uppercase text-blue-600 border-b border-blue-100 pb-2 mb-3">{group.title}</div>
                    <div className="space-y-2.5">
                      {group.items.map((item, i) => (
                        <label key={item} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" defaultChecked={i < 3} className="rounded text-blue-600 w-4 h-4" />
                          <span className="text-sm text-[#1c1b1b]">{item}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'Contacts' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#1c1b1b]">Contacts ({contacts.length})</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors">Add Contact</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead><tr className="bg-[#f6f3f2]/60">
                {['Name', 'Email', 'Role', 'Type', ''].map(h => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#434655]">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-[#f0edec]">
                {contacts.length === 0
                  ? <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-[#434655]">No contacts yet. Add the first one.</td></tr>
                  : contacts.map(c => (
                  <tr key={c.id} className="hover:bg-[#f6f3f2] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#dce1ff] flex items-center justify-center text-[#004bd8] text-xs font-bold">
                          {(c.name ?? 'U').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="font-semibold text-[#1c1b1b] text-sm">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#434655]">{c.email}</td>
                    <td className="px-6 py-4 text-sm text-[#1c1b1b]">{c.role}</td>
                    <td className="px-6 py-4">
                      <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                        c.is_primary ? 'bg-green-100 text-green-700' : 'bg-[#e5e2e1] text-[#434655]')}>
                        {c.is_primary ? 'Primary' : 'Secondary'}
                      </span>
                    </td>
                    <td className="px-6 py-4"><button className="text-[#737687] hover:text-[#1c1b1b] text-sm">···</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Tasks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#1c1b1b]">Tasks ({tasks.length})</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors">Add Task</button>
          </div>
          {projects.length > 0 && projects.map(p => {
            const planTasks = tasks.filter(t => t.plan_id === p.id)
            return (
              <div key={p.id} className="bg-white rounded-xl shadow-sm mb-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0edec]">
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                    <div>
                      <div className="font-bold text-[#1c1b1b] text-sm">{p.name}</div>
                      <div className="text-xs text-[#434655]">Due {p.due_date} · {p.owner_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-1.5 bg-[#e5e2e1] rounded-full">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.round(p.tasks_done/p.tasks_total*100)}%` }} />
                    </div>
                    <span className="text-xs text-[#434655]">{p.tasks_done}/{p.tasks_total}</span>
                  </div>
                </div>
                <div className="p-3 space-y-1">
                  {planTasks.map(t => (
                    <div key={t.id} className={cn('flex items-center gap-3 p-3 rounded-xl', t.status === 'overdue' ? 'bg-red-50' : 'bg-[#f6f3f2]')}>
                      <input type="checkbox" className="rounded text-blue-600 w-4 h-4" />
                      <span className="text-sm font-medium text-[#1c1b1b] flex-1">{t.title}</span>
                      <span className={cn('text-xs font-semibold', t.status === 'overdue' ? 'text-[#af1a25]' : 'text-[#434655]')}>
                        {t.status === 'overdue' ? 'Overdue' : `Due ${t.due_date}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {tasks.filter(t => !t.plan_id).map(t => (
            <div key={t.id} className={cn('flex items-center gap-3 p-4 rounded-xl mb-2', t.status === 'overdue' ? 'bg-red-50 border border-red-100' : 'bg-white shadow-sm')}>
              <input type="checkbox" className="rounded text-blue-600 w-4 h-4" />
              <span className="text-sm font-medium text-[#1c1b1b] flex-1">{t.title}</span>
              <span className={cn('text-xs font-semibold', t.status === 'overdue' ? 'text-[#af1a25]' : 'text-[#434655]')}>
                {t.status === 'overdue' ? 'Overdue' : `Due ${t.due_date}`}
              </span>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-[#434655] text-center py-8">No tasks yet.</p>}
        </div>
      )}

      {tab === 'Notes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-[#1c1b1b]">Meeting Notes ({notes.length})</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors">Add Note</button>
          </div>
          <div className="space-y-4">
            {notes.length === 0
              ? <p className="text-sm text-[#434655] text-center py-8">No notes yet. Log the first meeting.</p>
              : notes.map(n => (
              <div key={n.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-[#1c1b1b]">{n.title}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-[#e5e2e1] text-[#434655] px-2 py-0.5 rounded-full">{n.source}</span>
                    <span className="text-xs text-[#434655]">{n.meeting_date}</span>
                  </div>
                </div>
                <p className="text-sm text-[#434655] leading-relaxed">{n.content}</p>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#f0edec]">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">
                    {(n.owner_name ?? 'U')[0]}
                  </div>
                  <span className="text-xs text-[#434655]">{n.owner_name ?? 'Unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'Integrations' && (
        <AccountIntegrations account={account} />
      )}
    </div>
  )
}
