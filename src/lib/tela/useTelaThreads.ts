/**
 * useTelaThreads.ts
 * Persistent TELA conversation thread management.
 * Ported from CondoBunk, adapted for TELAOne workspace/Supabase schema.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface TelaThread {
  id: string
  workspace_id: string
  user_id: string
  title: string
  scope: string
  created_at: string
  updated_at: string
}

export interface TelaMessage {
  id: string
  thread_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export function useTelaThreads(workspaceId: string, userId: string) {
  const [threads, setThreads] = useState<TelaThread[]>([])
  const [loading, setLoading] = useState(false)

  const fetchThreads = useCallback(async () => {
    if (!workspaceId || !userId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('tela_threads')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(20)
    if (error) console.error('[tela_threads] fetch error:', error)
    setThreads((data as TelaThread[]) || [])
    setLoading(false)
  }, [workspaceId, userId])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  // Realtime subscription — thread list updates live
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('tela-threads-live')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tela_threads',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchThreads()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchThreads])

  const createThread = useCallback(
    async (title: string, scope = 'global'): Promise<string | null> => {
      if (!workspaceId || !userId) return null
      const { data, error } = await supabase
        .from('tela_threads')
        .insert({ workspace_id: workspaceId, user_id: userId, title, scope })
        .select('id')
        .single()
      if (error) { console.error('[tela_threads] create error:', error); return null }
      await fetchThreads()
      return (data as { id: string }).id
    },
    [workspaceId, userId, fetchThreads]
  )

  const touchThread = useCallback(async (threadId: string) => {
    await supabase
      .from('tela_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId)
  }, [])

  const renameThread = useCallback(async (threadId: string, title: string) => {
    await supabase
      .from('tela_threads')
      .update({ title })
      .eq('id', threadId)
    await fetchThreads()
  }, [fetchThreads])

  const deleteThread = useCallback(async (threadId: string) => {
    await supabase
      .from('tela_threads')
      .delete()
      .eq('id', threadId)
    await fetchThreads()
  }, [fetchThreads])

  return {
    threads,
    loading,
    createThread,
    touchThread,
    renameThread,
    deleteThread,
    refetch: fetchThreads,
  }
}

export function useTelaMessages(threadId: string | null) {
  const [messages, setMessages] = useState<TelaMessage[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMessages = useCallback(async () => {
    if (!threadId) { setMessages([]); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('tela_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
    if (error) console.error('[tela_messages] fetch error:', error)
    setMessages((data as TelaMessage[]) || [])
    setLoading(false)
  }, [threadId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  const saveMessage = useCallback(
    async (role: 'user' | 'assistant', content: string): Promise<string | null> => {
      if (!threadId) return null
      const { data, error } = await supabase
        .from('tela_messages')
        .insert({ thread_id: threadId, role, content })
        .select('id')
        .single()
      if (error) { console.error('[tela_messages] save error:', error); return null }
      return (data as { id: string }).id
    },
    [threadId]
  )

  return { messages, loading, saveMessage, refetch: fetchMessages }
}
