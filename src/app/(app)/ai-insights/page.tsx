import { mockAiInsights } from '@/lib/mock-data'
import Link from 'next/link'
import { TrendingUp, AlertTriangle, Heart, Lightbulb } from 'lucide-react'

const typeConfig = {
  high_risk: { icon: AlertTriangle, color: 'text-[#af1a25]', bg: 'bg-red-50', border: 'border-[#af1a25]', badge: 'bg-red-100 text-[#93000a]', label: 'High Risk' },
  expansion: { icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-500', badge: 'bg-blue-100 text-blue-800', label: 'Expansion' },
  advocacy: { icon: Heart, color: 'text-[#176e00]', bg: 'bg-green-50', border: 'border-[#176e00]', badge: 'bg-green-100 text-green-800', label: 'Advocacy' },
}

export default function AiInsightsPage() {
  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">AI Insights</h1>
        <p className="text-[#434655] text-sm">Proactive signals detected across your portfolio — review and act.</p>
      </div>

      <div className="space-y-4">
        {mockAiInsights.map(insight => {
          const cfg = typeConfig[insight.type as keyof typeof typeConfig]
          const Icon = cfg.icon
          return (
            <div key={insight.id}
              className={`bg-white rounded-xl shadow-sm p-6 border-l-4 ${cfg.border}`}>
              <div className="flex items-start justify-between gap-6">
                <div className="flex gap-4 flex-1">
                  <div className={`${cfg.bg} p-2.5 rounded-xl flex-shrink-0 self-start`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[#434655]">{insight.account_name} · Detected {insight.detected_at}</span>
                    </div>
                    <h3 className="font-bold text-[#1c1b1b] mb-1.5">{insight.title}</h3>
                    <p className="text-sm text-[#434655] leading-relaxed">{insight.detail}</p>
                    <div className="flex items-start gap-2 mt-3">
                      <Lightbulb className="w-3.5 h-3.5 text-[#737687] mt-0.5 shrink-0" />
                      <span className="text-xs font-semibold text-[#1c1b1b]">{insight.suggested_action}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Link href={`/accounts/${insight.account_id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors text-center">
                    Take Action
                  </Link>
                  <button className="text-[#434655] text-xs font-semibold px-4 py-2 rounded-full hover:bg-[#f0edec] transition-colors">
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
