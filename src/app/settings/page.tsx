'use client'

import React, { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/use-api'
import { useAuth } from '@/contexts/auth-context'
import Loader from '@/components/common/loader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { UserForm } from '@/components/settings/user-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { User } from '@/types'
import { usePagination } from '@/hooks/use-pagination'
import { DataTable } from '@/components/common/data-table'
import { ColumnDef } from '@tanstack/react-table'
import { useRBAC } from '@/hooks/use-rbac'

export default function SettingsPage() {
  const { user } = useAuth()
  const { can } = useRBAC()
  const { pagination, setPagination } = usePagination()
  const { data: usersData, isLoading } = useUsers(pagination)
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | undefined>(undefined)

  const handleAddUser = () => {
    setSelectedUser(undefined)
    setIsFormOpen(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsFormOpen(true)
  }

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser.mutateAsync(userId)
    }
  }

  const handleFormSubmit = async (data: any) => {
    if (selectedUser) {
      await updateUser.mutateAsync({ id: selectedUser.id, data })
    } else {
      await createUser.mutateAsync(data)
    }
    setIsFormOpen(false)
  }
  
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'full_name',
      header: 'Name',
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'role.name',
      header: 'Role',
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleEditUser(user)}
                disabled={!can('update', 'user')}
              >
                Edit User
              </DropdownMenuItem>
              {can('delete', 'user') && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => handleDeleteUser(user.id)}
                >
                  Delete User
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
  
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="h-full flex flex-col p-4 space-y-4">
          <div className="flex justify-between items-center shrink-0">
            <h1 className="text-2xl font-bold">User Management</h1>
            {can('create', 'user') && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add User
              </Button>
            )}
          </div>
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage users and their roles.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {isLoading ? (
                <Loader />
              ) : (
                <DataTable
                  columns={columns}
                  data={usersData?.users || []}
                  pageCount={usersData?.pagination.pages || 0}
                  pagination={pagination}
                  setPagination={setPagination}
                />
              )}
            </CardContent>
          </Card>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{selectedUser ? 'Edit User' : 'Add User'}</DialogTitle>
              </DialogHeader>
              <UserForm
                onSubmit={handleFormSubmit}
                user={selectedUser}
                onCancel={() => setIsFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
