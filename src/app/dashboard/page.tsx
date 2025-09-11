'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { MapInterface } from '@/components/map/map-interface'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="h-full w-full">
          <MapInterface />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}