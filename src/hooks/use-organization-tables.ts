'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Territory, Location, Dataset } from '@/types'
import { PaginationState } from '@tanstack/react-table'
import { useAuth } from '@/contexts/auth-context'

// Organization-aware table data hooks

export function useOrganizationTerritories(pagination: PaginationState) {
  const { user } = useAuth()
  const userOrg = user?.organization?.name?.toLowerCase()
  
  return useQuery({
    queryKey: ['organization-territories', pagination, userOrg],
    queryFn: async () => {
      if (userOrg === 'jeddah') {
        // Jeddah territories endpoint returns GeoJSON format
        const response = await api.get('/api/jeddah/territories')
        const data = response.data
        
        // Transform GeoJSON features to table format
        const territories = data.features?.map((feature: any) => ({
          id: feature.id,
          name: feature.properties.name,
          description: feature.properties.description || '',
          created_at: feature.properties.created_at,
          customer_count: feature.properties.customer_count || 0,
          generation_method: feature.properties.generation_method || '',
          target_size: feature.properties.target_size || 0,
          center: feature.properties.center,
          geom: feature.geometry
        })) || []
        
        return {
          territories,
          pagination: {
            page: 1,
            pages: 1,
            per_page: territories.length,
            total: data.total || territories.length
          }
        }
      } else {
        // HoopTrailer territories endpoint returns standard format
        const response = await api.get(`/api/territories/?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`)
        return response.data
      }
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useOrganizationLocations(pagination: PaginationState) {
  const { user } = useAuth()
  const userOrg = user?.organization?.name?.toLowerCase()
  
  return useQuery({
    queryKey: ['organization-locations', pagination, userOrg],
    queryFn: async () => {
      if (userOrg === 'jeddah') {
        // Jeddah customers endpoint returns GeoJSON format
        const response = await api.get(`/api/jeddah/customers?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`)
        const data = response.data
        
        // Transform GeoJSON features to table format
        const locations = data.features?.map((feature: any) => ({
          id: feature.id,
          name: feature.properties.name,
          created_at: feature.properties.created_at,
          latitude: feature.properties.latitude,
          longitude: feature.properties.longitude,
          original_name: feature.properties.original_name,
          geom: feature.geometry,
          // Add default properties for compatibility
          properties: {
            city: 'Jeddah',
            state_code: 'SA',
            status: 'active',
            ...feature.properties
          }
        })) || []
        
        return {
          locations,
          pagination: data.pagination || {
            page: pagination.pageIndex + 1,
            pages: 1,
            per_page: pagination.pageSize,
            total: locations.length
          }
        }
      } else {
        // HoopTrailer current locations endpoint
        const response = await api.get(`/api/current-locations/?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`)
        return {
          locations: response.data.current_locations || [],
          pagination: response.data.pagination || { page: 1, pages: 1, per_page: 10, total: 0 }
        }
      }
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

export function useOrganizationDatasets() {
  const { user } = useAuth()
  const userOrg = user?.organization?.name?.toLowerCase()
  
  return useQuery({
    queryKey: ['organization-datasets', userOrg],
    queryFn: async () => {
      if (userOrg === 'jeddah') {
        // Jeddah datasets endpoint
        const response = await api.get('/api/jeddah/datasets')
        const data = response.data
        
        // Transform to standard format
        const datasets = data.datasets?.map((dataset: any) => ({
          id: dataset.id,
          name: dataset.name,
          type: dataset.type,
          count: dataset.count,
          description: dataset.description
        })) || []
        
        return datasets
      } else if (userOrg === 'urimpact') {
        // Urimpact datasets endpoint
        const response = await api.get('/api/urimpact/datasets')
        return response.data.datasets || []
      } else {
        // HoopTrailer datasets endpoint
        const response = await api.get('/api/datasets/')
        return response.data.datasets || []
      }
    },
    staleTime: 1000 * 60, // 1 minute
  })
}

// Organization-aware CRUD mutations
export function useOrganizationCreateTerritory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (data: Partial<Territory>) => {
      const userOrg = user?.organization?.name?.toLowerCase()
      const endpoint = userOrg === 'jeddah' 
        ? '/api/jeddah/territories'
        : '/api/territories'
      
      return api.post(endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-territories'] })
    },
  })
}

export function useOrganizationUpdateTerritory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Territory> }) => {
      const userOrg = user?.organization?.name?.toLowerCase()
      const endpoint = userOrg === 'jeddah' 
        ? `/api/jeddah/territories/${id}`
        : `/api/territories/${id}`
      
      return api.put(endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-territories'] })
    },
  })
}

export function useOrganizationDeleteTerritory() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (id: string) => {
      const userOrg = user?.organization?.name?.toLowerCase()
      const endpoint = userOrg === 'jeddah' 
        ? `/api/jeddah/territories/${id}`
        : `/api/territories/${id}`
      
      return api.delete(endpoint)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-territories'] })
    },
  })
}

export function useOrganizationCreateLocation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (data: Partial<Location>) => {
      const userOrg = user?.organization?.name?.toLowerCase()
      const endpoint = userOrg === 'jeddah' 
        ? '/api/jeddah/customers'
        : '/api/current-locations'
      
      return api.post(endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-locations'] })
    },
  })
}

export function useOrganizationUpdateLocation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Location> }) => {
      const userOrg = user?.organization?.name?.toLowerCase()
      const endpoint = userOrg === 'jeddah' 
        ? `/api/jeddah/customers/${id}`
        : `/api/current-locations/${id}`
      
      return api.put(endpoint, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-locations'] })
    },
  })
}

export function useOrganizationDeleteLocation() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: (id: string) => {
      const userOrg = user?.organization?.name?.toLowerCase()
      const endpoint = userOrg === 'jeddah' 
        ? `/api/jeddah/customers/${id}`
        : `/api/current-locations/${id}`
      
      return api.delete(endpoint)
    },
    onSuccess: () => {
      // Invalidate all organization-locations queries (with any pagination/userOrg)
      queryClient.invalidateQueries({ queryKey: ['organization-locations'] })
      // Also invalidate map queries to update the map
      queryClient.invalidateQueries({ queryKey: ['map-current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-customer-locations'] })
    },
  })
}
