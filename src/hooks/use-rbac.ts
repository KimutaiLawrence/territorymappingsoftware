'use client'

import { useAuth } from '@/contexts/auth-context'

type Action = 'create' | 'read' | 'update' | 'delete'
type Resource = 'territory' | 'location' | 'user' | 'settings'

export function useRBAC() {
  const { user } = useAuth()

  const can = (action: Action, resource: Resource): boolean => {
    if (!user?.role?.name) {
      return false
    }

    const role = user.role.name
    if (role === 'admin') return true
    if (role === 'viewer') {
      return action === 'read'
    }
    if (role === 'editor') {
      if (resource === 'user' || resource === 'settings') return false
      return true // Editors can CRUD territories and locations
    }

    return false
  }

  return { user, can }
}
