'use client'

import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useDatasets } from '@/hooks/use-api'
import { Dataset } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/common/data-table'
import Loader from '@/components/common/loader'

export default function DatasetsPage() {
  const { data: datasets, isLoading: datasetsLoading } = useDatasets()

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
            {datasetsLoading ? (
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
