import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/services/supabase'
import { updateIncidentStatus } from '@/services/incidentApi'
import type { IncomingIncident, IncidentStatus } from '@/types'

export function useIncidents() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['incoming-incidents'],
    queryFn: async (): Promise<IncomingIncident[]> => {
      const { data, error } = await supabase
        .from('incoming_incidents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 15000,
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('incidents-realtime-' + Math.random().toString(36).substring(2))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'incoming_incidents',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['incoming-incidents'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

export function useUpdateIncidentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
      updateIncidentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incoming-incidents'] })
    },
  })
}

export function usePendingIncidentsCount() {
  return useQuery({
    queryKey: ['pending-incidents-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('incoming_incidents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending')

      if (error) throw error
      return count ?? 0
    },
    refetchInterval: 30000,
  })
}
