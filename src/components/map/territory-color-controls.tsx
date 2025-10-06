'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ColorPicker } from '@/components/ui/color-picker'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Palette, 
  Save, 
  RotateCcw,
  MapPin,
  Users,
  Eye,
  EyeOff
} from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface Territory {
  id: string
  name: string
  color: string
  opacity: number
  stroke_color: string
  stroke_width: number
  is_visible: boolean
  customer_count?: number
}

interface TerritoryColorControlsProps {
  territories: Territory[]
  onTerritoryUpdate?: (territory: Territory) => void
  onBulkUpdate?: (territories: Territory[]) => void
  userOrg?: string
}

export function TerritoryColorControls({ 
  territories, 
  onTerritoryUpdate, 
  onBulkUpdate,
  userOrg 
}: TerritoryColorControlsProps) {
  const [localTerritories, setLocalTerritories] = useState<Territory[]>(territories)
  const [selectedTerritory, setSelectedTerritory] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setLocalTerritories(territories)
  }, [territories])

  const handleTerritoryStyleChange = (territoryId: string, field: keyof Territory, value: any) => {
    setLocalTerritories(prev => 
      prev.map(territory => 
        territory.id === territoryId 
          ? { ...territory, [field]: value }
          : territory
      )
    )
  }

  const handleSaveTerritoryStyle = async (territoryId: string) => {
    const territory = localTerritories.find(t => t.id === territoryId)
    if (!territory) return

    setIsUpdating(true)
    try {
      const response = await api.put(`/api/jeddah/territories/${territoryId}/style`, {
        color: territory.color,
        opacity: territory.opacity,
        stroke_color: territory.stroke_color,
        stroke_width: territory.stroke_width,
        is_visible: territory.is_visible
      })

      if (response.data.success) {
        toast.success('Territory style updated successfully')
        onTerritoryUpdate?.(territory)
      }
    } catch (error) {
      console.error('Error updating territory style:', error)
      toast.error('Failed to update territory style')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleBulkSave = async () => {
    setIsUpdating(true)
    try {
      const response = await api.put('/api/jeddah/territories/bulk-style', {
        territories: localTerritories.map(territory => ({
          id: territory.id,
          color: territory.color,
          opacity: territory.opacity,
          stroke_color: territory.stroke_color,
          stroke_width: territory.stroke_width,
          is_visible: territory.is_visible
        }))
      })

      if (response.data.success) {
        toast.success(`Updated styling for ${localTerritories.length} territories`)
        onBulkUpdate?.(localTerritories)
      }
    } catch (error) {
      console.error('Error updating territories style:', error)
      toast.error('Failed to update territories style')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleResetToDefaults = () => {
    const defaultColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#f97316', '#06b6d4', '#84cc16', '#ec4899', '#6b7280'
    ]

    setLocalTerritories(prev => 
      prev.map((territory, index) => ({
        ...territory,
        color: defaultColors[index % defaultColors.length],
        opacity: 0.7,
        stroke_color: '#ffffff',
        stroke_width: 2.0,
        is_visible: true
      }))
    )
  }

  const selectedTerritoryData = selectedTerritory 
    ? localTerritories.find(t => t.id === selectedTerritory)
    : null

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Territory Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Territory List */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Territory</Label>
            <div className="grid gap-2 max-h-40 overflow-y-auto">
              {localTerritories.map((territory) => (
                <div
                  key={territory.id}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedTerritory === territory.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedTerritory(territory.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: territory.color }}
                    />
                    <div>
                      <div className="font-medium text-sm">{territory.name}</div>
                      {territory.customer_count && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {territory.customer_count} customers
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {territory.is_visible ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <Badge variant={territory.is_visible ? "default" : "secondary"}>
                      {territory.is_visible ? 'Visible' : 'Hidden'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Individual Territory Controls */}
          {selectedTerritoryData && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="font-medium">Styling for {selectedTerritoryData.name}</span>
                </div>

                {/* Color Controls */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Fill Color</Label>
                    <ColorPicker
                      value={selectedTerritoryData.color}
                      onChange={(color) => handleTerritoryStyleChange(selectedTerritoryData.id, 'color', color)}
                      size="sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Border Color</Label>
                    <ColorPicker
                      value={selectedTerritoryData.stroke_color}
                      onChange={(color) => handleTerritoryStyleChange(selectedTerritoryData.id, 'stroke_color', color)}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Opacity Controls */}
                <div className="space-y-2">
                  <Label className="text-sm">Opacity: {Math.round(selectedTerritoryData.opacity * 100)}%</Label>
                  <Slider
                    value={[selectedTerritoryData.opacity]}
                    onValueChange={([value]) => handleTerritoryStyleChange(selectedTerritoryData.id, 'opacity', value)}
                    min={0}
                    max={1}
                    step={0.1}
                    className="w-full"
                  />
                </div>

                {/* Stroke Width */}
                <div className="space-y-2">
                  <Label className="text-sm">Border Width: {selectedTerritoryData.stroke_width}px</Label>
                  <Slider
                    value={[selectedTerritoryData.stroke_width]}
                    onValueChange={([value]) => handleTerritoryStyleChange(selectedTerritoryData.id, 'stroke_width', value)}
                    min={0}
                    max={10}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Visibility</Label>
                  <div className="flex items-center gap-2">
                    {selectedTerritoryData.is_visible ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTerritoryStyleChange(selectedTerritoryData.id, 'is_visible', !selectedTerritoryData.is_visible)}
                    >
                      {selectedTerritoryData.is_visible ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={() => handleSaveTerritoryStyle(selectedTerritoryData.id)}
                  disabled={isUpdating}
                  className="w-full"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isUpdating ? 'Saving...' : 'Save Territory Style'}
                </Button>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          <div className="space-y-3">
            <Separator />
            <div className="flex gap-2">
              <Button
                onClick={handleBulkSave}
                disabled={isUpdating}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                Save All Changes
              </Button>
              <Button
                onClick={handleResetToDefaults}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
