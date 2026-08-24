import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabase'
import type { EmergencyHotline } from '@/types'

export const getSeedDefaultHotlines = () => [
  { id: crypto.randomUUID(), category: 'POLICE', name: 'PCP Barangay 178', phone_number: '(02) 8961-1050', is_local: true },
  { id: crypto.randomUUID(), category: 'POLICE', name: 'National Police', phone_number: '911', is_local: false },
  { id: crypto.randomUUID(), category: 'FIRE', name: 'Caloocan Fire Station', phone_number: '(02) 8361-2741', is_local: true },
  { id: crypto.randomUUID(), category: 'FIRE', name: 'Bureau of Fire Protection', phone_number: '911', is_local: false },
  { id: crypto.randomUUID(), category: 'AMBULANCE', name: 'Barangay 178 Rescue', phone_number: '(02) 8961-1234', is_local: true },
  { id: crypto.randomUUID(), category: 'AMBULANCE', name: 'National Red Cross', phone_number: '143', is_local: false },
  { id: crypto.randomUUID(), category: 'HOSPITAL', name: 'Caloocan City Medical Center', phone_number: '(02) 8351-5060', is_local: true },
  { id: crypto.randomUUID(), category: 'BARANGAY', name: 'Barangay 178 Hall', phone_number: '(02) 8961-1000', is_local: true },
]

export function useHotlines() {
  return useQuery({
    queryKey: ['emergency-hotlines'],
    queryFn: async (): Promise<EmergencyHotline[]> => {
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .select('*')

      if (error) {
        console.error('Fetch hotlines error:', error)
        throw new Error(error.message || 'Failed to fetch hotlines')
      }
      return data || []
    },
    staleTime: 0,
  })
}

export function useCreateHotline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (hotline: Omit<EmergencyHotline, 'id' | 'created_at'>) => {
      const payload = {
        id: crypto.randomUUID(),
        category: hotline.category,
        name: hotline.name,
        phone_number: hotline.phone_number,
        is_local: Boolean(hotline.is_local),
      }
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .insert(payload)
        .select()

      if (error) {
        console.error('Supabase Create Hotline Error:', error)
        throw new Error(error.message || 'Failed to insert hotline')
      }
      if (!data || data.length === 0) {
        throw new Error('Supabase RLS policy prevented inserting new hotline.')
      }
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-hotlines'] })
    },
  })
}

export function useSeedDefaultHotlines() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const defaults = getSeedDefaultHotlines()
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .insert(defaults)
        .select()

      if (error) {
        console.error('Supabase Seed Hotlines Error:', error)
        throw new Error(error.message || 'Failed to seed default hotlines')
      }
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
    mutationFn: async ({ id, category, name, phone_number, is_local }: Partial<EmergencyHotline> & { id: string }) => {
      const payload: Record<string, any> = {}
      if (category !== undefined) payload.category = category
      if (name !== undefined) payload.name = name
      if (phone_number !== undefined) payload.phone_number = phone_number
      if (is_local !== undefined) payload.is_local = Boolean(is_local)

      const { data, error } = await supabase
        .from('emergency_hotlines')
        .update(payload)
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase Update Hotline Error:', error)
        throw new Error(error.message || 'Failed to update hotline')
      }

      if (!data || data.length === 0) {
        throw new Error('Supabase RLS policy or permission blocked updating this hotline.')
      }

      return data[0]
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
      const { data, error } = await supabase
        .from('emergency_hotlines')
        .delete()
        .eq('id', id)
        .select()

      if (error) {
        console.error('Supabase Delete Hotline Error:', error)
        throw new Error(error.message || 'Failed to delete hotline')
      }

      if (!data || data.length === 0) {
        throw new Error('Supabase RLS policy or permission blocked deleting this hotline.')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-hotlines'] })
    },
  })
}
