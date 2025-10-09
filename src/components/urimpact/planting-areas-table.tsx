'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Eye, MapPin, Calendar, TreePine, Users, DollarSign } from 'lucide-react'
import { usePlantingAreas, useCreatePlantingArea, useUpdatePlantingArea, useDeletePlantingArea } from '@/hooks/use-planting-areas'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import Loader from '@/components/common/loader'

interface PlantingArea {
  id: string
  type: 'Feature'
  geometry: any
  properties: {
    zone_name?: string
    area_hectares?: number
    trees_planted?: number
    species_count?: number
    survival_rate?: number
    implementation_date?: string
    phase?: string
    color?: string
    [key: string]: any
  }
}

export function PlantingAreasTable() {
  const { data: plantingAreasData, isLoading } = usePlantingAreas()
  const createMutation = useCreatePlantingArea()
  const updateMutation = useUpdatePlantingArea()
  const deleteMutation = useDeletePlantingArea()
  const { user } = useAuth()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingArea, setEditingArea] = useState<PlantingArea | null>(null)
  const [formData, setFormData] = useState({
    zone_name: '',
    area_hectares: 0,
    trees_planted: 0,
    species_count: 0,
    survival_rate: 0,
    implementation_date: '',
    phase: '',
    color: '#8b5cf6'
  })

  const plantingAreas = plantingAreasData?.features || []
  
  // Role-based permissions
  const canCreate = user?.role?.name === 'admin' || user?.role?.name === 'superadmin'
  const canEdit = user?.role?.name === 'admin' || user?.role?.name === 'editor' || user?.role?.name === 'superadmin'
  const canDelete = user?.role?.name === 'admin' || user?.role?.name === 'superadmin'
  const canView = user?.role?.name === 'admin' || user?.role?.name === 'editor' || user?.role?.name === 'viewer' || user?.role?.name === 'superadmin'

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
        },
        properties: formData
      })
      setIsCreateOpen(false)
      setFormData({
        zone_name: '',
        area_hectares: 0,
        trees_planted: 0,
        species_count: 0,
        survival_rate: 0,
        implementation_date: '',
        phase: '',
        color: '#8b5cf6'
      })
    } catch (error) {
      console.error('Error creating planting area:', error)
    }
  }

  const handleEdit = (area: PlantingArea) => {
    setEditingArea(area)
    setFormData({
      zone_name: area.properties.zone_name || '',
      area_hectares: area.properties.area_hectares || 0,
      trees_planted: area.properties.trees_planted || 0,
      species_count: area.properties.species_count || 0,
      survival_rate: area.properties.survival_rate || 0,
      implementation_date: area.properties.implementation_date || '',
      phase: area.properties.phase || '',
      color: area.properties.color || '#8b5cf6'
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editingArea) return
    
    try {
      await updateMutation.mutateAsync({
        id: editingArea.id,
        geometry: editingArea.geometry,
        properties: formData
      })
      setIsEditOpen(false)
      setEditingArea(null)
    } catch (error) {
      console.error('Error updating planting area:', error)
    }
  }

  const handleDelete = async (areaId: string) => {
    try {
      await deleteMutation.mutateAsync(areaId)
    } catch (error) {
      console.error('Error deleting planting area:', error)
    }
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Planting Areas</CardTitle>
          <CardDescription>Access denied</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You don't have permission to view planting areas.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5" />
              Planting Areas
            </CardTitle>
            <CardDescription>
              Manage tree planting zones and their environmental impact
            </CardDescription>
          </div>
          {canCreate && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Zone
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Planting Zone</DialogTitle>
                  <DialogDescription>
                    Add a new tree planting zone to the project
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zone_name">Zone Name</Label>
                    <Input
                      id="zone_name"
                      value={formData.zone_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, zone_name: e.target.value }))}
                      placeholder="e.g., Zone A - Date Palm Primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phase">Phase</Label>
                    <Input
                      id="phase"
                      value={formData.phase}
                      onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                      placeholder="e.g., Phase 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area_hectares">Area (hectares)</Label>
                    <Input
                      id="area_hectares"
                      type="number"
                      step="0.01"
                      value={formData.area_hectares}
                      onChange={(e) => setFormData(prev => ({ ...prev, area_hectares: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trees_planted">Trees Planted</Label>
                    <Input
                      id="trees_planted"
                      type="number"
                      value={formData.trees_planted}
                      onChange={(e) => setFormData(prev => ({ ...prev, trees_planted: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="species_count">Species Count</Label>
                    <Input
                      id="species_count"
                      type="number"
                      value={formData.species_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, species_count: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="survival_rate">Survival Rate (%)</Label>
                    <Input
                      id="survival_rate"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.survival_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, survival_rate: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="implementation_date">Implementation Date</Label>
                    <Input
                      id="implementation_date"
                      type="date"
                      value={formData.implementation_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, implementation_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Zone Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Zone'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {plantingAreas.length} planting zones
              </p>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Name</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Trees</TableHead>
                  <TableHead>Survival Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plantingAreas.map((area: PlantingArea) => (
                  <TableRow key={area.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: area.properties.color || '#8b5cf6' }}
                        />
                        <span className="font-medium">{area.properties.zone_name || 'Unnamed Zone'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{area.properties.phase || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{area.properties.area_hectares || 0} ha</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TreePine className="h-4 w-4 text-muted-foreground" />
                        <span>{area.properties.trees_planted || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className={`font-medium ${
                          (area.properties.survival_rate || 0) >= 80 ? 'text-green-600' : 
                          (area.properties.survival_rate || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {area.properties.survival_rate || 0}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(area)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Planting Zone</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{area.properties.zone_name || 'Unnamed Zone'}"? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(area.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Planting Zone</DialogTitle>
            <DialogDescription>
              Update the planting zone information
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_zone_name">Zone Name</Label>
              <Input
                id="edit_zone_name"
                value={formData.zone_name}
                onChange={(e) => setFormData(prev => ({ ...prev, zone_name: e.target.value }))}
                placeholder="e.g., Zone A - Date Palm Primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phase">Phase</Label>
              <Input
                id="edit_phase"
                value={formData.phase}
                onChange={(e) => setFormData(prev => ({ ...prev, phase: e.target.value }))}
                placeholder="e.g., Phase 1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_area_hectares">Area (hectares)</Label>
              <Input
                id="edit_area_hectares"
                type="number"
                step="0.01"
                value={formData.area_hectares}
                onChange={(e) => setFormData(prev => ({ ...prev, area_hectares: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_trees_planted">Trees Planted</Label>
              <Input
                id="edit_trees_planted"
                type="number"
                value={formData.trees_planted}
                onChange={(e) => setFormData(prev => ({ ...prev, trees_planted: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_species_count">Species Count</Label>
              <Input
                id="edit_species_count"
                type="number"
                value={formData.species_count}
                onChange={(e) => setFormData(prev => ({ ...prev, species_count: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_survival_rate">Survival Rate (%)</Label>
              <Input
                id="edit_survival_rate"
                type="number"
                min="0"
                max="100"
                value={formData.survival_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, survival_rate: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_implementation_date">Implementation Date</Label>
              <Input
                id="edit_implementation_date"
                type="date"
                value={formData.implementation_date}
                onChange={(e) => setFormData(prev => ({ ...prev, implementation_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_color">Zone Color</Label>
              <Input
                id="edit_color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Updating...' : 'Update Zone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
