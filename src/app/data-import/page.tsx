'use client'

import React, { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { ImportForm } from '@/components/data-import/import-form'
import { useIngestAdminBoundaries } from '@/hooks/use-api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function DataImportPage() {
  const ingestMutation = useIngestAdminBoundaries()
  const [result, setResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null)

  const handleFormSubmit = async (data: { country_code: string; organization_id: string }) => {
    setResult(null)
    try {
      const response = await ingestMutation.mutateAsync(data)
      setResult({ status: 'success', message: response.data.message })
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'An unexpected error occurred.'
      setResult({ status: 'error', message: errorMessage })
    }
  }

  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <DashboardLayout>
        <div className="h-full flex flex-col p-4 space-y-4">
          <div className="flex justify-between items-center shrink-0">
            <h1 className="text-2xl font-bold">Data Import</h1>
          </div>
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="shrink-0">
              <CardTitle>Import Administrative Boundaries</CardTitle>
              <CardDescription>
                Import country-level administrative boundaries from DIVA-GIS for a specific organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-6 overflow-y-auto">
              <ImportForm 
                onSubmit={handleFormSubmit}
                isSubmitting={ingestMutation.isPending}
              />
              {result && (
                <Alert variant={result.status === 'success' ? 'default' : 'destructive'} className="mt-6">
                  {result.status === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.status === 'success' ? 'Success' : 'Error'}</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
