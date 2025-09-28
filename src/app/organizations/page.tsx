'use client'

import React, { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useOrganizations, useCreateOrganization, useUpdateOrganization, useDeleteOrganization } from '@/hooks/use-api'
import { usePagination } from '@/hooks/use-pagination'
import { DataTable } from '@/components/common/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { Organization } from '@/types'
import Loader from '@/components/common/loader'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrganizationForm } from '@/components/organizations/organization-form'

export default function OrganizationsPage() {
  const { pagination, setPagination } = usePagination()
  const { data: orgsData, isLoading } = useOrganizations(pagination)
  const createOrg = useCreateOrganization()
  const updateOrg = useUpdateOrganization()
  const deleteOrg = useDeleteOrganization()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<Organization | undefined>(undefined)

  const handleAdd = () => {
    setSelectedOrg(undefined)
    setIsFormOpen(true)
  }

  const handleEdit = (org: Organization) => {
    setSelectedOrg(org)
    setIsFormOpen(true)
  }

  const handleDelete = async (orgId: string) => {
    if (window.confirm('Are you sure you want to delete this organization? Note: This is only possible if no users are assigned to it.')) {
      await deleteOrg.mutateAsync(orgId)
    }
  }

  const handleFormSubmit = async (data: any) => {
    if (selectedOrg) {
      await updateOrg.mutateAsync({ id: selectedOrg.id, data })
    } else {
      await createOrg.mutateAsync(data)
    }
    setIsFormOpen(false)
  }

  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      accessorKey: 'created_at',
      header: 'Created At',
      cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const organization = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(organization)}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => handleDelete(organization.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const isSubmitting = createOrg.isPending || updateOrg.isPending

  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <DashboardLayout>
        <div className="h-full flex flex-col p-4 space-y-4">
          <div className="flex justify-between items-center shrink-0">
            <h1 className="text-2xl font-bold">Organization Management</h1>
            <Button onClick={handleAdd}>
              <Plus className="mr-2 h-4 w-4" /> Add Organization
            </Button>
          </div>
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Organizations</CardTitle>
              <CardDescription>
                Manage client organizations in the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {isLoading ? (
                <Loader />
              ) : (
                <DataTable
                  columns={columns}
                  data={orgsData?.organizations || []}
                  pageCount={orgsData?.pagination.pages || 0}
                  pagination={pagination}
                  setPagination={setPagination}
                />
              )}
            </CardContent>
          </Card>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedOrg ? 'Edit Organization' : 'Add New Organization'}</DialogTitle>
              </DialogHeader>
              <OrganizationForm
                onSubmit={handleFormSubmit}
                onCancel={() => setIsFormOpen(false)}
                organization={selectedOrg}
                isSubmitting={isSubmitting}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
