'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

export function useCurrentUser() {
  const [user, setUser] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { setIsLoading(false); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setUser(data ?? null)
      setIsLoading(false)
    }

    load()
  }, [])

  return {
    user,
    isLoading,
    isAdmin: user?.role === 'admin',
    isMember: user?.role === 'member',
    isViewer: user?.role === 'viewer',
  }
}
