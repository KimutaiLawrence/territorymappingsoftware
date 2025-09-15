'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { Territory, Location, Dataset, User, Role } from '@/types'
import { PaginationState } from '@tanstack/react-table'

// Territories
export function useTerritories(pagination: PaginationState) {
  return useQuery({
    queryKey: ['territories', pagination],
    queryFn: async () => {
      const response = await api.get<{ territories: Territory[], pagination: any }>(
        `/api/territories/?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`
      )
      return response.data
    },
  })
}

export function useCreateTerritory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (territoryData: Omit<Territory, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => 
            api.post('/api/territories/', territoryData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['territories'] })
            queryClient.invalidateQueries({ queryKey: ['map-territories'] })
        },
    })
}

export function useUpdateTerritory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<Territory> }) => 
            api.put(`/api/territories/${id}`, data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['territories'] })
            queryClient.invalidateQueries({ queryKey: ['map-territories'] })
            queryClient.invalidateQueries({ queryKey: ['territory', variables.id] })
        },
    })
}

export function useDeleteTerritory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => api.delete(`/api/territories/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['territories'] })
            queryClient.invalidateQueries({ queryKey: ['map-territories'] })
        },
    })
}

// Current Locations
export function useCurrentLocations(pagination: PaginationState) {
  return useQuery({
    queryKey: ['current-locations', pagination],
    queryFn: async () => {
      const response = await api.get<{ current_locations: Location[], pagination: any }>(
        `/api/current-locations/?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`
      )
      return {
        locations: response.data.current_locations,
        pagination: response.data.pagination
      }
    },
  })
}

// Potential Locations
export function usePotentialLocations(pagination: PaginationState) {
  return useQuery({
    queryKey: ['potential-locations', pagination],
    queryFn: async () => {
      const response = await api.get<{ potential_locations: Location[], pagination: any }>(
        `/api/potential-locations/?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`
      )
      return {
        locations: response.data.potential_locations,
        pagination: response.data.pagination
      }
    },
  })
}

export function useCreateLocation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => 
            api.post('/api/locations/current/', locationData), // Assuming same endpoint for both
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['current-locations'] })
            queryClient.invalidateQueries({ queryKey: ['potential-locations'] })
            queryClient.invalidateQueries({ queryKey: ['map-current-locations'] })
            queryClient.invalidateQueries({ queryKey: ['map-potential-locations'] })
        },
    })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
      type,
    }: {
      id: string
      data: Partial<Location>
      type: 'current' | 'potential'
    }) => api.put(`/api/${type}-locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['potential-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['map-potential-locations'] })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      type,
    }: {
      id: string
      type: 'current' | 'potential'
    }) => api.delete(`/api/${type}-locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-locations'] })
      queryClient.invalidateQueries({ queryKey: ['potential-locations'] })
    },
  })
}

// All Locations
export function useLocations() {
  const currentLocations = useCurrentLocations()
  const potentialLocations = usePotentialLocations()

  const combinedLocations = [
    ...(Array.isArray(currentLocations.data) ? currentLocations.data : []),
    ...(Array.isArray(potentialLocations.data) ? potentialLocations.data : [])
  ];

  return {
    data: combinedLocations,
    isLoading: currentLocations.isLoading || potentialLocations.isLoading,
    error: currentLocations.error || potentialLocations.error,
  }
}

// Datasets
export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: async () => {
      const response = await api.get<{ datasets: Dataset[] }>('/api/datasets/')
      return response.data.datasets
    },
  })
}

// US States
export function useUSStates() {
  return useQuery({
    queryKey: ['us-states'],
    queryFn: async () => {
      const response = await api.get('/api/us-states/?format=geojson&per_page=1000')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Rivers
export function useRivers() {
  return useQuery({
    queryKey: ['rivers'],
    queryFn: async () => {
      const response = await api.get('/api/rivers/?format=geojson&per_page=1000')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Roads
export function useRoads() {
  return useQuery({
    queryKey: ['roads'],
    queryFn: async () => {
      const response = await api.get('/api/roads/?format=geojson&per_page=1000')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

// Map Data Hooks
export function useMapTerritories() {
  return useQuery({
    queryKey: ['map-territories'],
    queryFn: async () => {
      const response = await api.get('/api/territories/?format=geojson&per_page=1000')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export function useMapCurrentLocations() {
  return useQuery({
    queryKey: ['map-current-locations'],
    queryFn: async () => {
      const response = await api.get('/api/current-locations/?format=geojson&per_page=1000')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

export function useMapPotentialLocations() {
  return useQuery({
    queryKey: ['map-potential-locations'],
    queryFn: async () => {
      const response = await api.get('/api/potential-locations/?format=geojson&per_page=1000')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60, // 1 minute
    cacheTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  })
}

// Roles
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.get<{ roles: Role[] }>('/api/roles/')
      return response.data.roles
    },
  })
}

// Users
export function useUsers(pagination: PaginationState) {
  return useQuery({
    queryKey: ['users', pagination],
    queryFn: async () => {
      const response = await api.get<{ users: User[], pagination: any }>(
        `/api/users/?page=${pagination.pageIndex + 1}&per_page=${pagination.pageSize}`
      )
      return response.data
    },
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userData: Partial<User>) => api.post('/api/users/', userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      api.put(`/api/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}