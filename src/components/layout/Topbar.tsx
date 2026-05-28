'use client'

import { Search, Bell, MessageSquare } from 'lucide-react'

interface TopbarProps {
  onOpenChat: () => void
}

export default function Topbar({ onOpenChat }: TopbarProps) {
  return (
    <header className="h-14 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm shrink-0 z-30 sticky top-0">
      <div className="relative w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search accounts, tasks, contacts…"
          onClick={onOpenChat}
          readOnly
          className="w-full bg-[#e5e2e1]/60 border-none rounded-full py-2 pl-10 pr-4 text-sm text-slate-600 placeholder:text-slate-400 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">
          ⌘K
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenChat}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask Claude
        </button>
        <button className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 ml-2">
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
