'use client'

import { useState } from 'react'
import { mockEmailTemplates } from '@/lib/mock-data'
import { Plus, Mail, Languages, X, Copy, Check, Loader2 } from 'lucide-react'

const categoryColors: Record<string, string> = {
  Renewal: 'bg-blue-100 text-blue-700',
  Onboarding: 'bg-green-100 text-green-700',
  Risk: 'bg-red-100 text-red-700',
  QBR: 'bg-gray-100 text-gray-700',
  Expansion: 'bg-purple-100 text-purple-700',
}

// ─── Translation languages ────────────────────────────────────────────────────

const LANGUAGES = [
  { group: 'Spanish',     options: [
    { id: 'es-mx', label: 'Spanish — Mexico (MX)'  },
    { id: 'es-cl', label: 'Spanish — Chile (CL)'   },
    { id: 'es-es', label: 'Spanish — Spain (ES)'   },
  ]},
  { group: 'Portuguese',  options: [
    { id: 'pt-br', label: 'Portuguese — Brazil (BR)'   },
    { id: 'pt-pt', label: 'Portuguese — Portugal (PT)' },
  ]},
  { group: 'Other top business languages', options: [
    { id: 'fr',    label: 'French'   },
    { id: 'de',    label: 'German'   },
    { id: 'ja',    label: 'Japanese' },
    { id: 'zh',    label: 'Chinese (Simplified)' },
    { id: 'ar',    label: 'Arabic'   },
    { id: 'hi',    label: 'Hindi'    },
  ]},
]

const LANG_NAMES: Record<string, string> = {
  'es-mx': 'Mexican Spanish', 'es-cl': 'Chilean Spanish', 'es-es': 'Spain Spanish',
  'pt-br': 'Brazilian Portuguese', 'pt-pt': 'European Portuguese',
  'fr': 'French', 'de': 'German', 'ja': 'Japanese',
  'zh': 'Simplified Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
}

// ─── Translation modal ────────────────────────────────────────────────────────

interface Template { id: string; name: string; subject: string; body: string; variables: string[] }

function TranslateModal({ template, onClose }: { template: Template; onClose: () => void }) {
  const [selectedLang, setSelectedLang] = useState('es-mx')
  const [translating, setTranslating]   = useState(false)
  const [result, setResult]             = useState<{ subject: string; body: string } | null>(null)
  const [copied, setCopied]             = useState(false)
  const [error, setError]               = useState('')

  async function translate() {
    setTranslating(true)
    setResult(null)
    setError('')
    const langName = LANG_NAMES[selectedLang]
    const storedKey = localStorage.getItem('zsp_anthropic_key')
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (storedKey) headers['x-anthropic-key'] = storedKey

    const prompt = `Translate the following email template to ${langName}. Keep all template variables in square brackets (e.g. [Account Name]) exactly as-is — do not translate them. Maintain the professional tone and CS context. Return ONLY the translated content in this exact format:

SUBJECT: <translated subject>

BODY:
<translated body>

---
Subject to translate: ${template.subject}

Body to translate:
${template.body}`

    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers,
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const text: string = data.content ?? ''
      const subjectMatch = text.match(/SUBJECT:\s*(.+)/i)
      const bodyMatch    = text.match(/BODY:\s*([\s\S]+?)(?:---|$)/i)
      if (subjectMatch && bodyMatch) {
        setResult({ subject: subjectMatch[1].trim(), body: bodyMatch[1].trim() })
      } else {
        setResult({ subject: template.subject, body: text })
      }
    } catch {
      setError('Translation failed. Check your API key in Settings → AI Provider.')
    } finally {
      setTranslating(false)
    }
  }

  function copyResult() {
    if (!result) return
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0edec]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 flex items-center justify-center">
              <Languages className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-[#1c1b1b] text-sm">Translate Template</div>
              <div className="text-xs text-[#737687]">{template.name}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#737687] hover:text-[#1c1b1b]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Language selector */}
          <div>
            <label className="block text-xs font-bold tracking-widest uppercase text-[#434655] mb-3">Target Language</label>
            <div className="space-y-4">
              {LANGUAGES.map(group => (
                <div key={group.group}>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-2">{group.group}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {group.options.map(opt => (
                      <label key={opt.id}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedLang === opt.id ? 'border-blue-600 bg-blue-50/40' : 'border-[#e5e2e1] hover:border-[#c3c5d8]'
                        }`}>
                        <input type="radio" name="lang" value={opt.id} checked={selectedLang === opt.id}
                          onChange={() => setSelectedLang(opt.id)} className="accent-blue-600" />
                        <span className="text-sm font-medium text-[#1c1b1b]">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest uppercase text-[#176e00]">
                  Translated to {LANG_NAMES[selectedLang]}
                </span>
                <button onClick={copyResult}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#434655] hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-[#f0edec]">
                  {copied ? <><Check className="w-3.5 h-3.5 text-green-600" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy all</>}
                </button>
              </div>
              <div className="bg-[#f6f3f2] rounded-xl p-4 space-y-3">
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1">Subject</div>
                  <div className="text-sm font-semibold text-[#1c1b1b]">{result.subject}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-[#737687] mb-1">Body</div>
                  <pre className="text-xs text-[#434655] whitespace-pre-wrap font-sans leading-relaxed">{result.body}</pre>
                </div>
              </div>
              <p className="text-[10px] text-[#737687]">
                Template variables like [Account Name] are preserved. Review before sending.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-[#af1a25]">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#f0edec] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-semibold text-[#434655] border border-[#c3c5d8] hover:bg-[#f0edec]">
            Close
          </button>
          <button onClick={translate} disabled={translating}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {translating
              ? <><Loader2 className="w-4 h-4 animate-spin" />Translating…</>
              : <><Languages className="w-4 h-4" />Translate</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const [translateTarget, setTranslateTarget] = useState<Template | null>(null)

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#1c1b1b] mb-1">Email Templates</h1>
          <p className="text-[#434655] text-sm">Reusable templates for common CS touchpoints · Ask Claude to generate or customise</p>
        </div>
        <button className="bg-blue-600 text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm shadow-blue-500/20">
          <Plus className="w-4 h-4" />New Template
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {mockEmailTemplates.map(t => (
          <div key={t.id} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full ${categoryColors[t.category] ?? 'bg-gray-100 text-gray-700'}`}>
                {t.category}
              </span>
              <Mail className="w-4 h-4 text-[#737687]" />
            </div>
            <div>
              <h3 className="font-bold text-[#1c1b1b] mb-1">{t.name}</h3>
              <p className="text-xs text-[#434655] mb-3">{t.subject}</p>
              <div className="bg-[#f6f3f2] rounded-xl p-4 text-xs text-[#434655] font-mono leading-relaxed max-h-28 overflow-hidden relative">
                {t.body.slice(0, 200)}…
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#f6f3f2] to-transparent" />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.variables.map(v => (
                <span key={v} className="bg-[#dce1ff] text-[#003baf] text-[10px] font-semibold px-2 py-0.5 rounded">[{v}]</span>
              ))}
            </div>
            <div className="flex gap-2 mt-auto pt-3 border-t border-[#f0edec]">
              <button className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-full hover:bg-blue-700 transition-colors">
                Use Template
              </button>
              <button
                onClick={() => setTranslateTarget(t)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#434655] border border-[#c3c5d8] hover:bg-[#f0edec] transition-colors">
                <Languages className="w-3.5 h-3.5" />Translate
              </button>
              <button className="px-4 py-2 rounded-full text-xs font-semibold text-[#434655] border border-[#c3c5d8] hover:bg-[#f0edec] transition-colors">
                Edit
              </button>
            </div>
          </div>
        ))}

        <button className="bg-[#f6f3f2] rounded-xl p-6 flex flex-col items-center justify-center gap-3 text-[#434655] hover:bg-[#ebe7e7] transition-colors border-2 border-dashed border-[#c3c5d8]/60 min-h-[200px]">
          <Plus className="w-7 h-7 text-[#737687]" />
          <span className="text-sm font-semibold">New Template</span>
        </button>
      </div>

      {translateTarget && (
        <TranslateModal template={translateTarget} onClose={() => setTranslateTarget(null)} />
      )}
    </div>
  )
}
