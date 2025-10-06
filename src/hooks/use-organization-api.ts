'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Territory, Location } from '@/types'
import { useAuth } from '@/contexts/auth-context'

// Organization-aware API hooks that route to correct endpoints based on user organization

export function useOrganizationUpdateTerritory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Territory> }) => {
      // Route to correct endpoint based on organization
      const endpoint = user?.organization?.name?.toLowerCase() === 'jeddah' 
        ? `/api/jeddah/territories/${id}`
        : `/api/territories/${id}`
      
      console.log(`🔧 Updating territory via ${endpoint} for org: ${user?.organization?.name}`)
      return api.put(endpoint, data)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['territories'] })
      queryClient.invalidateQueries({ queryKey: ['map-territories'] })
      queryClient.invalidateQueries({ queryKey: ['territory', variables.id] })
      // Also invalidate Jeddah-specific queries if applicable
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        queryClient.invalidateQueries({ queryKey: ['jeddah-territories'] })
      }
    },
  })
}

export function useOrganizationCreateTerritory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (data: Partial<Territory>) => {
      // Route to correct endpoint based on organization
      const endpoint = user?.organization?.name?.toLowerCase() === 'jeddah' 
        ? `/api/jeddah/territories`
        : `/api/territories`
      
      console.log(`🔧 Creating territory via ${endpoint} for org: ${user?.organization?.name}`)
      return api.post(endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] })
      queryClient.invalidateQueries({ queryKey: ['map-territories'] })
      // Also invalidate Jeddah-specific queries if applicable
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        queryClient.invalidateQueries({ queryKey: ['jeddah-territories'] })
      }
    },
  })
}

export function useOrganizationDeleteTerritory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (id: string) => {
      // Route to correct endpoint based on organization
      const endpoint = user?.organization?.name?.toLowerCase() === 'jeddah' 
        ? `/api/jeddah/territories/${id}`
        : `/api/territories/${id}`
      
      console.log(`🔧 Deleting territory via ${endpoint} for org: ${user?.organization?.name}`)
      return api.delete(endpoint)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] })
      queryClient.invalidateQueries({ queryKey: ['map-territories'] })
      // Also invalidate Jeddah-specific queries if applicable
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        queryClient.invalidateQueries({ queryKey: ['jeddah-territories'] })
      }
    },
  })
}

export function useOrganizationUpdateLocation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ id, data, type }: { id: string; data: Partial<Location>; type?: 'current' | 'potential' }) => {
      // Route to correct endpoint based on organization
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        // For Jeddah, use customer locations endpoint
        console.log(`🔧 Updating Jeddah customer via /api/jeddah/customers/${id}`)
        return api.put(`/api/jeddah/customers/${id}`, data)
      } else {
        // For HoopTrailer, use current/potential locations
        const endpoint = type === 'potential' 
          ? `/api/potential-locations/${id}`
          : `/api/current-locations/${id}`
        console.log(`🔧 Updating ${type} location via ${endpoint}`)
        return api.put(endpoint, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-potential-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-customer-locations'] })
      // Also invalidate Jeddah-specific queries if applicable
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        queryClient.invalidateQueries({ queryKey: ['jeddah-customers'] })
      }
    },
  })
}

export function useOrganizationCreateLocation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ data, type }: { data: Partial<Location>; type?: 'current' | 'potential' }) => {
      // Route to correct endpoint based on organization
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        // For Jeddah, use customer locations endpoint
        console.log(`🔧 Creating Jeddah customer via /api/jeddah/customers`)
        return api.post(`/api/jeddah/customers`, data)
      } else {
        // For HoopTrailer, use current/potential locations
        const endpoint = type === 'potential' 
          ? `/api/potential-locations`
          : `/api/current-locations`
        console.log(`🔧 Creating ${type} location via ${endpoint}`)
        return api.post(endpoint, data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-potential-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-customer-locations'] })
      // Also invalidate Jeddah-specific queries if applicable
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        queryClient.invalidateQueries({ queryKey: ['jeddah-customers'] })
      }
    },
  })
}

export function useOrganizationDeleteLocation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ id, type }: { id: string; type?: 'current' | 'potential' }) => {
      // Route to correct endpoint based on organization
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        // For Jeddah, use customer locations endpoint
        console.log(`🔧 Deleting Jeddah customer via /api/jeddah/customers/${id}`)
        return api.delete(`/api/jeddah/customers/${id}`)
      } else {
        // For HoopTrailer, use current/potential locations
        const endpoint = type === 'potential' 
          ? `/api/potential-locations/${id}`
          : `/api/current-locations/${id}`
        console.log(`🔧 Deleting ${type} location via ${endpoint}`)
        return api.delete(endpoint)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-potential-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-customer-locations'] })
      // Also invalidate Jeddah-specific queries if applicable
      if (user?.organization?.name?.toLowerCase() === 'jeddah') {
        queryClient.invalidateQueries({ queryKey: ['jeddah-customers'] })
      }
    },
  })
}
