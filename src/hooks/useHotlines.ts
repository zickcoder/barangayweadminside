import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import type { EmergencyHotline } from '@/types'

export function useHotlines() {
  return useQuery({
    queryKey: ['emergency-hotlines'],
    queryFn: async (): Promise<EmergencyHotline[]> => {
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .select('*')
        .order('priority', { ascending: true, nullsFirst: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60000,
  })
}

export function useCreateHotline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (hotline: Omit<EmergencyHotline, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .insert(hotline)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-hotlines'] })
    },
  })
}

export function useUpdateHotline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...hotline }: Partial<EmergencyHotline> & { id: string }) => {
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .update(hotline)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-hotlines'] })
    },
  })
}

export function useDeleteHotline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('emergency_hotlines')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-hotlines'] })
    },
  })
}
