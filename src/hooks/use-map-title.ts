'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

export function useMapTitle() {
  const { user } = useAuth()
  const userOrg = user?.organization?.name?.toLowerCase()
  
  return useQuery({
    queryKey: ['map-title', userOrg],
    queryFn: async () => {
      if (userOrg === 'urimpact') {
        const response = await api.get('/api/urimpact/map-title')
        return response.data.title
      }
      return 'Territory Mapper'
    },
    enabled: userOrg === 'urimpact',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSaveMapTitle() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userOrg = user?.organization?.name?.toLowerCase()
  
  return useMutation({
    mutationFn: async (title: string) => {
      if (userOrg === 'urimpact') {
        const response = await api.post('/api/urimpact/map-title', { title })
        return response.data
      }
      return { success: true, title }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-title'] })
    },
  })
}
