import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/services/supabase'
import type { Alert, BroadcastFormData } from '@/types'

export function useAlerts() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: async (): Promise<Alert[]> => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 30000,
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime-' + Math.random().toString(36).substring(2))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'alerts',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['alerts'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return query
}

export function useBroadcastAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      form,
      incidentId,
    }: {
      form: BroadcastFormData
      incidentId?: string
    }) => {
      const alertPayload = {
        id: crypto.randomUUID(),
        title: form.title,
        preview: form.description.slice(0, 120) + (form.description.length > 120 ? '...' : ''),
        message: form.description,
        priority: form.priority,
        emergency_type: form.emergency_type,
        language: form.language,
        operator: form.operator || 'Administrator',
        incident_id: incidentId,
      }

      const { data: alertData, error: alertError } = await supabase
        .from('alerts')
        .insert(alertPayload)
        .select()
        .single()

      if (alertError) {
        console.error('Supabase Alert Insert Error:', alertError)
        throw new Error(alertError.message || 'Database error occurred')
      }

      // Log to broadcast_logs
      const logPayload = {
        incident_id: incidentId,
        alert_id: alertData.id,
        title: form.title,
        message: form.description,
        language: form.language,
        operator: form.operator || 'Administrator',
        priority: form.priority,
        emergency_type: form.emergency_type,
        channel: form.channel,
        broadcast_time: new Date().toISOString(),
        status: 'SENT',
      }

      const { error: logError } = await supabase.from('broadcast_logs').insert(logPayload)
      if (logError) {
        console.warn('Logging broadcast failed:', logError.message)
      }

      return alertData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['broadcast-logs'] })
    },
  })
}

export function useAlertStats(filter: 'week' | 'month' | 'year' = 'month') {
  return useQuery({
    queryKey: ['alert-stats', filter],
    queryFn: async () => {
      const now = new Date()
      let from: Date

      if (filter === 'week') {
        from = new Date(now)
        from.setDate(from.getDate() - 7)
      } else if (filter === 'month') {
        from = new Date(now.getFullYear(), now.getMonth(), 1)
      } else {
        from = new Date(now.getFullYear(), 0, 1)
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [allAlerts, todayAlerts, monthAlerts] = await Promise.all([
        supabase.from('alerts').select('id, emergency_type, priority, created_at'),
        supabase.from('alerts').select('id').gte('created_at', today.toISOString()),
        supabase.from('alerts').select('id').gte('created_at', new Date(now.getFullYear(), now.getMonth(), 1).toISOString()),
      ])

      const alerts = allAlerts.data || []
      const filtered = alerts.filter(a => new Date(a.created_at) >= from)

      const typeCount: Record<string, number> = {
        FIRE: 0, FLOOD: 0, CRIME: 0, MEDICAL: 0, EARTHQUAKE: 0, OTHER: 0,
      }
      filtered.forEach(a => {
        const t = (a.emergency_type || 'OTHER').toUpperCase()
        if (t in typeCount) typeCount[t]++
        else typeCount.OTHER++
      })

      // Build chart data by time
      const chartData = buildChartData(filtered, filter)

      return {
        total: allAlerts.data?.length ?? 0,
        today: todayAlerts.data?.length ?? 0,
        month: monthAlerts.data?.length ?? 0,
        typeCount,
        chartData,
      }
    },
    staleTime: 60000,
  })
}

function buildChartData(
  alerts: Array<{ created_at: string; emergency_type?: string }>,
  filter: 'week' | 'month' | 'year'
): Array<{ label: string; count: number; date: string }> {
  const map = new Map<string, number>()

  alerts.forEach(a => {
    const date = new Date(a.created_at)
    let key: string

    if (filter === 'week') {
      key = date.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
    } else if (filter === 'month') {
      key = date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    } else {
      key = date.toLocaleDateString('en-PH', { month: 'short' })
    }

    map.set(key, (map.get(key) || 0) + 1)
  })

  return Array.from(map.entries()).map(([label, count]) => ({
    label,
    count,
    date: label,
  }))
}
