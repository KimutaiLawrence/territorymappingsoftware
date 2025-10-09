import { UserManagement } from '@/components/urimpact/user-management'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function UserManagementPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <UserManagement />
      </div>
    </DashboardLayout>
  )
}
