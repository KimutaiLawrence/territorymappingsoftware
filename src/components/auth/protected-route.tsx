'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import Loader from '@/components/common/loader'

type RoleName = 'admin' | 'editor' | 'viewer'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: RoleName[]
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  const isAuthorized =
    !allowedRoles ||
    (user?.role?.name && allowedRoles.includes(user.role.name as RoleName))

  useEffect(() => {
    if (isLoading) {
      return // Wait until loading is finished
    }

    if (!isAuthenticated) {
      router.push('/login')
    } else if (!isAuthorized) {
      router.push('/unauthorized')
    }
  }, [isLoading, isAuthenticated, isAuthorized, router])

  if (isLoading || !isAuthenticated || !isAuthorized) {
    return <Loader />
  }

  return <>{children}</>
}