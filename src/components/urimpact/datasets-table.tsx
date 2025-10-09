'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MapPin, TreePine, Users, Database, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Loader from '@/components/common/loader'

interface Dataset {
  id: string
  name: string
  type: string
  count: number
  description: string
  lastUpdated: string
  status: 'active' | 'inactive'
}

export function DatasetsTable() {
  const { data: adminBoundaries, isLoading: adminLoading } = useQuery({
    queryKey: ['urimpact-admin-boundaries'],
    queryFn: async () => {
      const response = await api.get('/api/urimpact/admin-boundaries')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const { data: plantingAreas, isLoading: plantingLoading } = useQuery({
    queryKey: ['planting-areas'],
    queryFn: async () => {
      const response = await api.get('/api/urimpact/map-geojson')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const isLoading = adminLoading || plantingLoading

  const datasets: Dataset[] = [
    {
      id: 'saudi-boundaries',
      name: 'Saudi Arabia Administrative Boundaries',
      type: 'Administrative',
      count: adminBoundaries?.features?.length || 0,
      description: 'Administrative boundaries for all Saudi Arabia regions',
      lastUpdated: '2025-01-09',
      status: 'active'
    },
    {
      id: 'planting-areas',
      name: 'Tree Planting Zones',
      type: 'Environmental',
      count: plantingAreas?.features?.length || 0,
      description: 'Tree planting zones for Majmaah University project',
      lastUpdated: '2025-01-09',
      status: 'active'
    }
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Administrative':
        return <MapPin className="h-4 w-4 text-blue-600" />
      case 'Environmental':
        return <TreePine className="h-4 w-4 text-green-600" />
      default:
        return <Database className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Administrative':
        return 'bg-blue-100 text-blue-800'
      case 'Environmental':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Datasets
        </CardTitle>
        <CardDescription>
          Available datasets for Urimpact organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {datasets.length} datasets available
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dataset</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{dataset.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {dataset.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(dataset.type)}
                        <Badge className={getTypeColor(dataset.type)}>
                          {dataset.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{dataset.count.toLocaleString()}</span>
                        <span className="text-muted-foreground text-sm">features</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={dataset.status === 'active' ? 'default' : 'secondary'}
                        className={dataset.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {dataset.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{dataset.lastUpdated}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
