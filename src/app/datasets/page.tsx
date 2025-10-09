'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDatasets } from '@/hooks/use-api'
import { useOrganizationDatasets } from '@/hooks/use-organization-tables'
import { useAuth } from '@/contexts/auth-context'
import { Dataset } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/common/data-table'
import { DatasetsTable } from '@/components/urimpact/datasets-table'
import Loader from '@/components/common/loader'

export default function DatasetsPage() {
  const { user } = useAuth()
  const { data: datasets, isLoading: datasetsLoading } = useOrganizationDatasets()
  const userOrg = user?.organization?.name?.toLowerCase()

  const columns: ColumnDef<Dataset>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'type',
      header: 'Type',
    },
    {
      accessorKey: 'count',
      header: 'Record Count',
    },
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="h-full flex flex-col p-4 space-y-4">
          <h1 className="text-2xl font-bold shrink-0">Datasets</h1>
          <div className="flex-1 overflow-hidden">
            {userOrg === 'urimpact' ? (
              <DatasetsTable />
            ) : datasetsLoading ? (
              <Loader />
            ) : (
              <DataTable columns={columns} data={datasets || []} />
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
