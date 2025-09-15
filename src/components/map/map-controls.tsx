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

interface MapControlsProps {
  layers: MapLayer[]
  onLayerToggle: (id: string) => void
  onLayerOpacityChange: (id: string, opacity: number) => void
  drawingTool: DrawingTool
  onDrawingToolChange: (tool: DrawingTool) => void
  onExport: () => void
  onHome: () => void
  className?: string
  isLoading: boolean
}

export function MapControls({
  layers,
  onLayerToggle,
  onLayerOpacityChange,
  drawingTool,
  onDrawingToolChange,
  onExport,
  onHome,
  className,
  isLoading,
}: MapControlsProps) {
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
              <div className="flex items-center space-x-2 pl-8">
                <span className="text-xs text-muted-foreground">Opacity</span>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  defaultValue={[layer.opacity]}
                  onValueChange={([value]) => onLayerOpacityChange(layer.id, value)}
                />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}