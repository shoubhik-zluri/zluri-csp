'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Building2, FolderKanban,
  Sparkles, Users, Settings, LogOut, Rocket, Upload, CheckSquare,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const adminItems = [
  { href: '/admin/users', label: 'Users',    icon: Users },
  { href: '/import',      label: 'Import',   icon: Upload },
  { href: '/settings',    label: 'Settings', icon: Settings },
]

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

function getInitials(name?: string | null) {
  if (!name) return 'JD'
  return name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAdmin } = useCurrentUser()

  const navItems: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/accounts',  label: 'Accounts',  icon: Building2 },
    { href: '/tasks',     label: 'Tasks',     icon: CheckSquare },
    { href: '/projects',  label: 'Projects',  icon: FolderKanban },
    { href: '/ai-insights', label: 'AI Insights', icon: Sparkles },
  ]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 overflow-hidden bg-slate-900 shadow-2xl z-40">
      <div className="px-6 pt-6 pb-5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Rocket className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-white font-bold text-base tracking-tight leading-none">Zluri CSP</div>
          <div className="text-[10px] uppercase tracking-widest font-semibold mt-0.5 text-slate-500">Internal Tool</div>
        </div>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, badge }) => (
          <Link key={href} href={href}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
              isActive(href)
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
            )}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{label}</span>
            {badge !== undefined && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {badge}
              </span>
            )}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Admin</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive(href)
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                )}>
                <Icon className="w-4 h-4 shrink-0" />{label}
              </Link>
            ))}
          </>
        )}
      </nav>

      <div className="px-2 pb-4 pt-3 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {getInitials(user?.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white truncate">{user?.full_name ?? 'Jane Doe'}</div>
            <div className="text-xs text-slate-500 truncate">{user?.email ?? 'jane@zluri.com'}</div>
          </div>
          <button onClick={handleSignOut} className="text-slate-500 hover:text-slate-300 transition-colors" title="Sign out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
