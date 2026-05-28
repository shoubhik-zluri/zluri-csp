'use client'

import { mockMcpIntegrations } from '@/lib/mock-data'
import {
  CheckCircle2, RefreshCw, ExternalLink, Plug,
  Mail, MessageSquare, Calendar, Mic, FileText, Bug, Cloud, Layers,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  'gmail':           <Mail className="w-5 h-5" />,
  'slack':           <MessageSquare className="w-5 h-5" />,
  'google-calendar': <Calendar className="w-5 h-5" />,
  'granola':         <Mic className="w-5 h-5" />,
  'notion':          <FileText className="w-5 h-5" />,
  'jira':            <Bug className="w-5 h-5" />,
  'salesforce':      <Cloud className="w-5 h-5" />,
  'hubspot':         <Layers className="w-5 h-5" />,
}

export default function IntegrationsPage() {
  const connected = mockMcpIntegrations.filter(i => i.status === 'connected')
  const disconnected = mockMcpIntegrations.filter(i => i.status === 'disconnected')

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">Integrations</h1>
        <p className="text-[#434655] text-sm">
          These integrations reflect the MCP tools active in your Claude Cowork workspace.
          Connect new tools directly in Cowork — they'll appear here automatically.
        </p>
      </div>

      {/* Cowork connection banner */}
      <div className="bg-blue-600 rounded-2xl p-6 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Plug className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-base">Connected to Claude Cowork</div>
            <div className="text-blue-200 text-sm">jane@zluri.com · Enterprise workspace · {connected.length} MCP tools active</div>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />Sync now
          </button>
          <a href="https://claude.ai" target="_blank" rel="noopener noreferrer"
            className="bg-white text-blue-700 text-xs font-bold px-4 py-2 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5" />Open Cowork
          </a>
        </div>
      </div>

      {/* Connected tools */}
      <div className="mb-8">
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-4">
          Connected ({connected.length})
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {connected.map(integration => (
            <div key={integration.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#dce1ff] flex items-center justify-center text-[#004bd8]">
                  {ICON_MAP[integration.mcp_server] ?? <Plug className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-semibold text-[#1c1b1b] text-sm">{integration.name}</div>
                  <div className="text-xs text-[#434655]">{integration.description}</div>
                  {integration.last_sync && (
                    <div className="text-[10px] text-[#737687] mt-0.5">
                      Last sync: {new Date(integration.last_sync).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#176e00]" />
                <span className="text-xs font-bold text-[#176e00] bg-green-100 px-2 py-0.5 rounded-full">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available tools */}
      <div>
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#434655] mb-4">
          Available via Cowork ({disconnected.length})
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {disconnected.map(integration => (
            <div key={integration.id} className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between opacity-70 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#f0edec] flex items-center justify-center text-[#737687]">
                  {ICON_MAP[integration.mcp_server] ?? <Plug className="w-5 h-5" />}
                </div>
                <div>
                  <div className="font-semibold text-[#1c1b1b] text-sm">{integration.name}</div>
                  <div className="text-xs text-[#434655]">{integration.description}</div>
                </div>
              </div>
              <button className="text-blue-600 text-xs font-bold hover:underline">
                Connect in Cowork
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-[#f0edec] rounded-xl">
        <p className="text-xs text-[#434655] text-center">
          <strong className="text-[#1c1b1b]">How it works:</strong> Integrations are managed through your Claude Cowork MCP settings.
          Once connected in Cowork, the AI assistant in this app automatically gains access to those tools.
          Your credentials stay in Cowork — nothing is stored here.
        </p>
      </div>
    </div>
  )
}
