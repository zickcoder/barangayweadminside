import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import type { BroadcastLog, IncomingIncident } from '@/types'

export function useBroadcastLogs() {
  return useQuery({
    queryKey: ['broadcast-logs'],
    queryFn: async (): Promise<BroadcastLog[]> => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Map alerts records to the expected BroadcastLog layout format
      return (data || []).map((alert: any) => ({
        id: alert.id,
        incident_id: alert.incident_id || null,
        alert_id: alert.id,
        title: alert.title,
        message: alert.message,
        language: alert.language || 'English',
        operator: alert.operator || 'Administrator',
        priority: alert.priority,
        emergency_type: alert.emergency_type || 'OTHER',
        channel: 'Mobile Application',
        broadcast_time: alert.created_at,
        status: 'SENT',
      }))
    },
    staleTime: 30000,
  })
}

export function useReceivedCommunications() {
  return useQuery({
    queryKey: ['received-communications'],
    queryFn: async (): Promise<IncomingIncident[]> => {
      const { data, error } = await supabase
        .from('incoming_incidents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })
}
