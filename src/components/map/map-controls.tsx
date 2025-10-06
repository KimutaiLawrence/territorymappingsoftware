'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { MapLayer, DrawingTool } from '@/types'
import { Button } from '@/components/ui/button'
import { Download, Layers, Pipette, Trash2, Home } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { SaveIcon } from '@/components/ui/save-icon'
import { ColorPicker } from '@/components/ui/color-picker'
import { useSaveLayerOpacity } from '@/hooks/use-layer-opacity'
import { toast } from 'sonner'

interface MapControlsProps {
  layers: MapLayer[]
  onLayerToggle: (id: string) => void
  onLayerOpacityChange: (id: string, opacity: number) => void
  onLayerColorChange: (id: string, color: string) => void
  onTerritoryColorChange?: (territoryId: string, color: string) => void
  drawingTool: DrawingTool
  onDrawingToolChange: (tool: DrawingTool) => void
  onExport: () => void
  onHome: () => void
  className?: string
  isLoading: boolean
  // Jeddah-specific props
  userOrg?: string
  showAllAdminBoundaries?: boolean
  onToggleAllAdminBoundaries?: (show: boolean) => void
}

export function MapControls({
  layers,
  onLayerToggle,
  onLayerOpacityChange,
  onLayerColorChange,
  onTerritoryColorChange,
  drawingTool,
  onDrawingToolChange,
  onExport,
  onHome,
  className,
  isLoading,
  userOrg,
  showAllAdminBoundaries,
  onToggleAllAdminBoundaries,
}: MapControlsProps) {
  const saveLayerOpacity = useSaveLayerOpacity()

  const handleSaveAsDefault = async (layerId: string, opacity: number, color?: string) => {
    console.log(`🔧 Saving layer settings:`, { layerId, opacity, color })
    try {
      await saveLayerOpacity.mutateAsync({
        layerId,
        opacity,
        color,
        isDefault: true
      })
      const message = color 
        ? `✅ Default settings saved: ${(opacity * 100).toFixed(0)}% opacity, ${color} color`
        : `✅ Default opacity saved: ${(opacity * 100).toFixed(0)}%`
      toast.success(message)
    } catch (error) {
      toast.error('❌ Failed to save default settings')
      console.error('Error saving layer settings:', error)
    }
  }
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('flex flex-col h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Map Layers</CardTitle>
            <CardDescription>Toggle layers to show or hide them.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onHome}
            className="ml-2"
          >
            <Home className="h-4 w-4 mr-1" />
            Home
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto">
        {layers.map(layer => (
          <div key={layer.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`switch-${layer.id}`} className="flex items-center space-x-2">
                <Switch
                  id={`switch-${layer.id}`}
                  checked={layer.visible}
                  onCheckedChange={() => onLayerToggle(layer.id)}
                />
                <span>
                  {layer.name}
                  <span className="text-sm text-muted-foreground ml-1">
                    (Total: {layer.data?.features?.length || 0})
                  </span>
                </span>
              </Label>
            </div>
            {layer.visible && (
              <>
                {/* Standard layer controls for non-territory layers */}
                {layer.type !== 'territories' && (
                  <div className="flex items-center space-x-3 pl-8 py-1">
                    {/* Color Box */}
                    <ColorPicker
                      value={layer.color || '#3b82f6'}
                      onChange={(color) => onLayerColorChange(layer.id, color)}
                      size="sm"
                    />
                    
                    {/* Layer Name */}
                    <span className="text-sm text-foreground min-w-0 flex-1 truncate">
                      {layer.name}
                    </span>
                    
                    {/* Opacity Slider */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={[layer.opacity]}
                  onValueChange={([value]) => onLayerOpacityChange(layer.id, value)}
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground w-8">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                    </div>
                    
                    {/* Single Save Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log(`🔧 Save button clicked for ${layer.id}:`, { 
                          opacity: layer.opacity, 
                          color: layer.color,
                          layerType: layer.type 
                        })
                        handleSaveAsDefault(layer.id, layer.opacity, layer.color)
                      }}
                      disabled={saveLayerOpacity.isPending}
                      className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
                      title={`Save current opacity (${(layer.opacity * 100).toFixed(0)}%) and color (${layer.color || '#3b82f6'}) as default for ${layer.name}`}
                    >
                      {saveLayerOpacity.isPending ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                      ) : (
                        <SaveIcon size={12} className="text-muted-foreground hover:text-foreground" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Individual territory controls for territories layer - Compact QGIS style */}
                {layer.type === 'territories' && layer.data?.features && (
                  <div className="pl-8 space-y-1">
                    {layer.data.features.map((territory: any, index: number) => (
                      <div key={territory.id || index} className="flex items-center space-x-2 py-0.5">
                        {/* Tiny Territory Color Box - QGIS style */}
                        <ColorPicker
                          value={territory.properties?.color || '#3b82f6'}
                          onChange={(color) => {
                            console.log(`🔧 Territory color change: ${territory.id} -> ${color}`)
                            // Use the new territory-specific color change handler for live preview
                            if (onTerritoryColorChange) {
                              onTerritoryColorChange(territory.id, color)
                            } else {
                              // Fallback to layer color change
                              onLayerColorChange(layer.id, color)
                            }
                          }}
                          size="xs"
                        />
                        
                        {/* Compact Territory Name */}
                        <span className="text-xs text-foreground min-w-0 flex-1 truncate">
                          {territory.properties?.name || `T${index + 1}`}
                          {territory.properties?.customer_count && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({territory.properties.customer_count})
                            </span>
                          )}
                        </span>
                        
                        {/* Tiny Opacity Slider */}
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={[territory.properties?.opacity || 0.7]}
                            onValueChange={([value]) => {
                              console.log(`🔧 Territory opacity change: ${territory.id} -> ${value}`)
                              // Update the territory opacity in the layer data
                              const updatedFeatures = layer.data.features.map((f: any) => 
                                f.id === territory.id 
                                  ? { ...f, properties: { ...f.properties, opacity: value } }
                                  : f
                              )
                              // Trigger layer update
                              onLayerOpacityChange(layer.id, value)
                            }}
                            className="w-12 h-2"
                          />
                          <span className="text-xs text-muted-foreground w-6 text-center">
                            {Math.round((territory.properties?.opacity || 0.7) * 100)}%
                          </span>
                        </div>
                        
                        {/* Tiny Save Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            console.log(`🔧 Territory save clicked for ${territory.id}:`, { 
                              opacity: territory.properties?.opacity || 0.7, 
                              color: territory.properties?.color || '#3b82f6',
                              territoryId: territory.id 
                            })
                            try {
                              // Save individual territory style to backend
                              await handleSaveAsDefault(layer.id, territory.properties?.opacity || 0.7, territory.properties?.color || '#3b82f6')
                              console.log(`✅ Territory ${territory.id} style saved successfully`)
                            } catch (error) {
                              console.error(`❌ Failed to save territory ${territory.id} style:`, error)
                            }
                          }}
                          disabled={saveLayerOpacity.isPending}
                          className="h-5 w-5 p-0 hover:bg-muted flex-shrink-0"
                          title={`Save ${territory.properties?.name || `Territory ${index + 1}`} style`}
                        >
                          {saveLayerOpacity.isPending ? (
                            <div className="h-2 w-2 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                          ) : (
                            <SaveIcon size={10} className="text-muted-foreground hover:text-foreground" />
                          )}
                        </Button>
                      </div>
                    ))}
              </div>
                )}
              </>
            )}
          </div>
        ))}
        
        {/* Jeddah-specific admin boundary toggle */}
        {userOrg === 'jeddah' && onToggleAllAdminBoundaries && (
          <div className="pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="admin-boundary-toggle" className="flex items-center space-x-2">
                <Switch
                  id="admin-boundary-toggle"
                  checked={showAllAdminBoundaries || false}
                  onCheckedChange={onToggleAllAdminBoundaries}
                />
                <span className="text-sm">
                  Show All Saudi Regions
                </span>
              </Label>
              <p className="text-xs text-muted-foreground pl-8">
                {showAllAdminBoundaries 
                  ? "Showing all 13 Saudi administrative regions" 
                  : "Showing only Jeddah region (Makkah)"
                }
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}