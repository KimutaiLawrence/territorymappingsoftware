import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/auth-context'

export interface LayerOpacitySetting {
  opacity: number
  color?: string
  is_default: boolean
  user_id?: string
}

export interface LayerOpacitySettings {
  [layerId: string]: LayerOpacitySetting
}

export function useLayerOpacitySettings() {
  const { user } = useAuth()
  const userOrg = user?.organization?.name?.toLowerCase()
  
  return useQuery<LayerOpacitySettings>({
    queryKey: ['layer-opacity-settings', userOrg],
    queryFn: async () => {
      try {
        // Use organization-specific endpoint
        let endpoint = '/api/layer-opacity' // Default fallback
        if (userOrg === 'jeddah') {
          endpoint = '/api/jeddah/layer-opacity'
        } else if (userOrg === 'urimpact') {
          // For Urimpact, return empty settings
          return {}
        }
        
        const response = await api.get(endpoint)
        console.log('Layer opacity settings response:', response.data)
        
        // The API returns the settings directly in the response
        // Filter out non-setting fields like 'message' and 'success'
        const { message, success, ...settings } = response.data
        
        console.log('Extracted settings:', settings)
        return settings || {}
      } catch (error) {
        console.error('Error fetching layer opacity settings:', error)
        // Return empty object instead of undefined
        return {}
      }
    },
    enabled: userOrg === 'jeddah', // Only enable for Jeddah users
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useSaveLayerOpacity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ layerId, opacity, color, isDefault = false }: {
      layerId: string
      opacity: number
      color?: string
      isDefault?: boolean
    }) => {
      const response = await api.post('/api/jeddah/layer-opacity', {
        layer_id: layerId,
        opacity,
        color,
        is_default: isDefault
      })
      console.log('Save layer opacity response:', response.data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-opacity-settings'] })
    }
  })
}

export function useDeleteLayerOpacity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (layerId: string) => {
      const response = await api.delete(`/api/jeddah/layer-opacity/${layerId}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-opacity-settings'] })
    }
  })
}

export function useResetLayerOpacity() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/jeddah/layer-opacity/reset')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['layer-opacity-settings'] })
    }
  })
}
