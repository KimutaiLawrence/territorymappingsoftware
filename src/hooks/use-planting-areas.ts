import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export interface PlantingArea {
  id: string
  type: 'Feature'
  geometry: any
  properties: {
    zone_name?: string
    color?: string
    [key: string]: any
  }
}

export interface PlantingAreasResponse {
  type: 'FeatureCollection'
  features: PlantingArea[]
}

export function usePlantingAreas() {
  return useQuery<PlantingAreasResponse>({
    queryKey: ['planting-areas'],
    queryFn: async () => {
      const response = await api.get('/api/urimpact/map-geojson')
      return response.data
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreatePlantingArea() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { geometry: any; properties?: any }) => {
      const response = await api.post('/api/urimpact/map-geojson', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planting-areas'] })
      toast.success('Planting area created successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to create planting area', {
        description: error.response?.data?.error || 'An unexpected error occurred.',
      })
    },
  })
}

export function useUpdatePlantingArea() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { id: string; geometry?: any; properties?: any }) => {
      const response = await api.put('/api/urimpact/map-geojson', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planting-areas'] })
      toast.success('Planting area updated successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to update planting area', {
        description: error.response?.data?.error || 'An unexpected error occurred.',
      })
    },
  })
}

export function useDeletePlantingArea() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/urimpact/map-geojson?id=${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planting-areas'] })
      toast.success('Planting area deleted successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to delete planting area', {
        description: error.response?.data?.error || 'An unexpected error occurred.',
      })
    },
  })
}
