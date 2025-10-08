import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// Urimpact Admin Boundaries
export const useUrimpactAdminBoundaries = () => {
  return useQuery({
    queryKey: ['urimpact-admin-boundaries'],
    queryFn: async () => {
      const response = await api.get('/api/urimpact/admin-boundaries')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useCreateUrimpactAdminBoundary = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/urimpact/admin-boundaries', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-admin-boundaries'] })
    },
  })
}

export const useUpdateUrimpactAdminBoundary = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/urimpact/admin-boundaries/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-admin-boundaries'] })
    },
  })
}

export const useDeleteUrimpactAdminBoundary = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/urimpact/admin-boundaries/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-admin-boundaries'] })
    },
  })
}

// Urimpact Datasets
export const useUrimpactDatasets = () => {
  return useQuery({
    queryKey: ['urimpact-datasets'],
    queryFn: async () => {
      const response = await api.get('/api/urimpact/datasets')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
