'use client'

import React, { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useTerritories, useDeleteTerritory, useCreateTerritory, useUpdateTerritory } from '@/hooks/use-api'
import { 
  useOrganizationTerritories, 
  useOrganizationCreateTerritory, 
  useOrganizationUpdateTerritory, 
  useOrganizationDeleteTerritory 
} from '@/hooks/use-organization-tables'
import { Territory } from '@/types'
import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/common/data-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Plus } from "lucide-react"
import Loader from '@/components/common/loader'
import { useAuth } from '@/contexts/auth-context'
import { DeleteConfirmationDialog } from '@/components/common/delete-confirmation-dialog'
import { TerritoryFormModal } from '@/components/territories/territory-form-modal'
import { DetailsDialog } from '@/components/common/details-dialog'
import { DatasetsTable } from '@/components/urimpact/datasets-table'
import { usePagination } from '@/hooks/use-pagination'
import { useRBAC } from '@/hooks/use-rbac'

export default function TerritoriesPage() {
  const { pagination, setPagination } = usePagination()
  const { data: territoriesData, isLoading: territoriesLoading } = useOrganizationTerritories(pagination)
  const { can, user } = useRBAC()
  const userOrg = user?.organization?.name?.toLowerCase()
  const deleteTerritory = useOrganizationDeleteTerritory()
  const createTerritory = useOrganizationCreateTerritory()
  const updateTerritory = useOrganizationUpdateTerritory()
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)

  const handleDeleteClick = (territory: Territory) => {
    setSelectedTerritory(territory)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedTerritory) {
      deleteTerritory.mutate(selectedTerritory.id)
      setIsDeleteDialogOpen(false)
      setSelectedTerritory(null)
    }
  }

  const handleCreateClick = () => {
    setSelectedTerritory(null)
    setIsFormModalOpen(true)
  }

  const handleEditClick = (territory: Territory) => {
    setSelectedTerritory(territory)
    setIsFormModalOpen(true)
  }

  const handleViewDetailsClick = (territory: Territory) => {
    setSelectedTerritory(territory)
    setIsDetailsModalOpen(true)
  }

  const handleFormSubmit = (data: any) => {
    if (selectedTerritory) {
      updateTerritory.mutate({ id: selectedTerritory.id, data })
    } else {
      createTerritory.mutate(data)
    }
    setIsFormModalOpen(false)
    setSelectedTerritory(null)
  }

  const columns: ColumnDef<Territory>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'customer_count',
      header: 'Customer Count',
      cell: ({ row }) => {
        const count = row.original.customer_count || 0
        return count
      },
    },
    {
      accessorKey: 'generation_method',
      header: 'Generation Method',
      cell: ({ row }) => {
        const method = row.original.generation_method || 'Unknown'
        return method
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return date.toLocaleDateString()
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const territory = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewDetailsClick(territory)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEditClick(territory)}
                disabled={!can('update', 'territory')}
              >
                Edit Territory
              </DropdownMenuItem>
              {can('delete', 'territory') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDeleteClick(territory)}
                  >
                    Delete Territory
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="h-full flex flex-col p-4 space-y-4">
          <div className="flex justify-between items-center shrink-0">
            <h1 className="text-2xl font-bold">Territories</h1>
            {can('create', 'territory') && (
              <Button onClick={handleCreateClick}>
                <Plus className="mr-2 h-4 w-4" /> Create Territory
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {userOrg === 'urimpact' ? (
              <DatasetsTable />
            ) : territoriesLoading ? (
              <Loader />
            ) : (
              <DataTable
                columns={columns}
                data={territoriesData?.territories || []}
                pageCount={territoriesData?.pagination.pages || 0}
                pagination={pagination}
                setPagination={setPagination}
              />
            )}
          </div>
          {selectedTerritory && (
            <DeleteConfirmationDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onConfirm={handleConfirmDelete}
              title="Are you sure you want to delete this territory?"
              description={`This will permanently delete the territory "${selectedTerritory.name}". This action cannot be undone.`}
            />
          )}
          <TerritoryFormModal
            isOpen={isFormModalOpen}
            onOpenChange={setIsFormModalOpen}
            onSubmit={handleFormSubmit}
            territory={selectedTerritory}
          />
          <DetailsDialog
            isOpen={isDetailsModalOpen}
            onOpenChange={setIsDetailsModalOpen}
            onEdit={() => handleEditClick(selectedTerritory!)}
            item={selectedTerritory}
            itemType="territory"
            title="Territory Details"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}