'use client'

import { useAuth } from '@/contexts/auth-context'
import { useCallback } from 'react'

type Action = 'create' | 'read' | 'update' | 'delete'
type Resource = 'user' | 'territory' | 'location' | 'organization' | 'settings' | 'gis'

const permissions = {
  admin: {
    user: ['create', 'read', 'update', 'delete'],
    territory: ['create', 'read', 'update', 'delete'],
    location: ['create', 'read', 'update', 'delete'],
    organization: [],
    settings: ['read', 'update'],
    gis: ['create', 'read', 'update', 'delete'],
  },
  editor: {
    user: [],
    territory: ['create', 'read', 'update', 'delete'],
    location: ['create', 'read', 'update', 'delete'],
    organization: [],
    settings: [],
    gis: ['create', 'read', 'update'],
  },
  viewer: {
    user: [],
    territory: ['read'],
    location: ['read'],
    organization: [],
    settings: [],
    gis: ['read'],
  },
  superadmin: {
    user: ['create', 'read', 'update', 'delete'],
    territory: ['create', 'read', 'update', 'delete'],
    location: ['create', 'read', 'update', 'delete'],
    organization: ['create', 'read', 'update', 'delete'],
    settings: ['read', 'update'],
    gis: ['create', 'read', 'update', 'delete'],
  }
}

export function useRBAC() {
  const { user } = useAuth()

  const can = useCallback(
    (action: Action, resource: Resource) => {
      if (!user?.role) {
        return false
      }
      
      // Superadmin can do everything
      if (user.is_superadmin || user.role.name === 'superadmin') {
        return true
      }

      const role = user.role.name as keyof typeof permissions
      return permissions[role]?.[resource]?.includes(action) || false
    },
    [user]
  )

  return { can }
}
