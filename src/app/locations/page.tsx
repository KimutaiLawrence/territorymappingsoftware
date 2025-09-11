'use client'

import React, { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useCurrentLocations, useDeleteLocation, useCreateLocation, useUpdateLocation } from '@/hooks/use-api'
import { Location } from '@/types'
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
import { LocationFormModal } from '@/components/locations/location-form-modal'
import { DetailsDialog } from '@/components/common/details-dialog'
import { usePagination } from '@/hooks/use-pagination'
import { useRBAC } from '@/hooks/use-rbac'

export default function LocationsPage() {
  const { pagination, setPagination } = usePagination()
  const { data: locationsData, isLoading: locationsLoading } = useCurrentLocations(pagination)
  const { can, user } = useRBAC()
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const deleteLocation = useDeleteLocation()

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)

  const handleDeleteClick = (location: Location) => {
    setSelectedLocation(location)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (selectedLocation) {
      deleteLocation.mutate({ id: selectedLocation.id, type: 'current' })
      setIsDeleteDialogOpen(false)
      setSelectedLocation(null)
    }
  }

  const handleCreateClick = () => {
    setSelectedLocation(null)
    setIsFormModalOpen(true)
  }

  const handleEditClick = (location: Location) => {
    setSelectedLocation(location)
    setIsFormModalOpen(true)
  }

  const handleViewDetailsClick = (location: Location) => {
    setSelectedLocation(location)
    setIsDetailsModalOpen(true)
  }

  const handleFormSubmit = (data: any) => {
    const formattedData = {
      name: data.name,
      geom: {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      },
      properties: {
        address: data.address,
        city: data.city,
        state_code: data.state_code,
        status: data.status,
        demographics: {
          asian_non_hispanic: data.asian_non_hispanic,
          black_non_hispanic: data.black_non_hispanic,
          hispanic_latino: data.hispanic_latino,
          white_non_hispanic: data.white_non_hispanic,
          other: data.other_demographics,
        },
        economics: {
          average_hourly_wage: data.average_hourly_wage,
          cost_of_living_index: data.cost_of_living_index,
          median_home_value: data.median_home_value,
          unemployment_rate: data.unemployment_rate,
        },
        business_metrics: {
          accessibility_score: data.accessibility_score,
          buying_potential: data.buying_potential,
          competition_level: data.competition_level,
          growth_rate: data.growth_rate,
          market_access_score: data.market_access_score,
          market_potential: data.market_potential,
          priority_level: data.priority_level,
          revenue_potential: data.revenue_potential,
        }
      }
    }
    if (selectedLocation) {
      updateLocation.mutate({ id: selectedLocation.id, data: formattedData, type: 'current' })
    } else {
      createLocation.mutate(formattedData)
    }
    setIsFormModalOpen(false)
    setSelectedLocation(null)
  }

  const columns: ColumnDef<Location>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      header: "City",
      accessorFn: row => row.properties.city,
    },
    {
      header: "State",
      accessorFn: row => row.properties.state_code,
    },
    {
      header: "Status",
      accessorFn: row => row.properties.status,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const location = row.original
   
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
              <DropdownMenuItem onClick={() => handleViewDetailsClick(location)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleEditClick(location)}
                disabled={!can('update', 'location')}
              >
                Edit Location
              </DropdownMenuItem>
              {can('delete', 'location') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDeleteClick(location)}
                  >
                    Delete Location
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
            <h1 className="text-2xl font-bold">Current Locations</h1>
            {can('create', 'location') && (
              <Button onClick={handleCreateClick}>
                <Plus className="mr-2 h-4 w-4" /> Create Location
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            {locationsLoading ? (
              <Loader />
            ) : (
              <DataTable
                columns={columns}
                data={locationsData?.locations || []}
                pageCount={locationsData?.pagination.pages || 0}
                pagination={pagination}
                setPagination={setPagination}
              />
            )}
          </div>
          {selectedLocation && (
            <DeleteConfirmationDialog
              isOpen={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
              onConfirm={handleConfirmDelete}
              title="Are you sure you want to delete this location?"
              description={`This will permanently delete the location "${selectedLocation.name}". This action cannot be undone.`}
            />
          )}
          <LocationFormModal
            isOpen={isFormModalOpen}
            onOpenChange={setIsFormModalOpen}
            onSubmit={handleFormSubmit}
            location={selectedLocation}
            locationType="current"
          />
          <DetailsDialog
            isOpen={isDetailsModalOpen}
            onOpenChange={setIsDetailsModalOpen}
            onEdit={() => handleEditClick(selectedLocation!)}
            item={selectedLocation}
            itemType="location"
            title="Location Details"
          />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
