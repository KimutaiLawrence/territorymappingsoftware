import { ProtectedRoute } from '@/components/auth/protected-route'
import { PlantingAreasTable } from '@/components/urimpact/planting-areas-table'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function PlantingAreasPage() {
  return (
    <ProtectedRoute allowedRoles={['admin', 'superadmin', 'editor', 'viewer']}>
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <PlantingAreasTable />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
