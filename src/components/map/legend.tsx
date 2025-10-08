'use client'

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapLayer } from '@/types'
import { Circle, Square } from 'lucide-react'

interface LegendProps {
  layers: MapLayer[]
}

const getLegendData = (layer: MapLayer) => {
  if (layer.type === 'population-analysis') {
    return [
      { color: '#f7fcfd', label: '0 - 100k' },
      { color: '#e0ecf4', label: '100k - 500k' },
      { color: '#bfd3e6', label: '500k - 1M' },
      { color: '#9ebcda', label: '1M - 2.5M' },
      { color: '#8c96c6', label: '2.5M - 5M' },
      { color: '#8856a7', label: '> 5M' },
    ]
  }

  if (layer.type === 'expansion-analysis') {
    return [
      { color: '#2ca25f', label: 'Rank 1 (Top Priority)' },
      { color: '#fdae61', label: 'Rank 2 (High Priority)' },
      { color: '#de2d26', label: 'Rank 3 (Medium Priority)' },
      { color: '#cccccc', label: 'Other' },
    ]
  }

  return []
}

export function Legend({ layers }: LegendProps) {
  const [visibleLayers, setVisibleLayers] = useState<MapLayer[]>([])

  useEffect(() => {
    setVisibleLayers(
      layers.filter(
        l =>
          l.visible &&
          (l.type.includes('analysis') ||
            l.type.includes('location') ||
            l.type === 'territories' ||
            l.type === 'customer-locations' ||
            l.type === 'admin-boundaries' ||
            l.type === 'imported-geojson' ||
            l.id.startsWith('planting-area-'))
      )
    )
  }, [layers])

  const legendLayers = visibleLayers.filter(l => getLegendData(l).length > 0 || l.type.includes('location') || l.type === 'territories' || l.type === 'customer-locations' || l.type === 'admin-boundaries' || l.type === 'imported-geojson' || l.id.startsWith('planting-area-'))

  if (legendLayers.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-[80px] right-4 z-10 w-48">
      <Card className="bg-background/75 backdrop-blur-sm">
        <CardHeader className="p-2">
          <CardTitle className="text-xs text-center">Legend</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          {legendLayers.map(layer => (
            <div key={layer.id} className="mb-2 last:mb-0">
              {/* Only show layer name for analysis layers with data */}
              {getLegendData(layer).length > 0 && (
                <h3 className="font-semibold text-xs mb-1 text-center">{layer.name}</h3>
              )}
              
              {/* Show legend data for analysis layers */}
              {getLegendData(layer).map(item => (
                <div key={item.label} className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.label}</span>
                </div>
              ))}
              
              {/* Show simple icons for location and territory layers without redundant labels */}
              {layer.type === 'current-locations' && (
                <div className="flex items-center space-x-2">
                  <Circle className="h-3 w-3 text-green-500 fill-current" />
                  <span className="text-xs">Current Locations</span>
                </div>
              )}
              {layer.type === 'potential-locations' && (
                <div className="flex items-center space-x-2">
                  <Circle className="h-3 w-3 text-amber-500 fill-current" />
                  <span className="text-xs">Potential Locations</span>
                </div>
              )}
              {layer.type === 'territories' && (
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Square className="h-3 w-3 text-blue-500 fill-current opacity-50" />
                    <span className="text-xs font-medium">Territories</span>
                  </div>
                  
                  {/* Smart territory display logic - Show individual territories if ≤7, default layer if >7 */}
                  {(() => {
                    const territoryCount = layer.data?.features?.length || 0
                    const maxIndividualTerritories = 7
                    
                    // If 7 or fewer territories, show individual territories
                    if (territoryCount <= maxIndividualTerritories && territoryCount > 0) {
                      return (
                        <div className="space-y-1">
                          {layer.data?.features?.map((feature: any, index: number) => (
                            <div key={feature.id || index} className="flex items-center space-x-2 ml-4">
                              <div
                                className="w-3 h-3 rounded border"
                                style={{ 
                                  backgroundColor: feature.properties?.color || '#3b82f6',
                                  opacity: feature.properties?.opacity || 0.7
                                }}
                              />
                              <span className="text-xs">
                                {feature.properties?.name || `Territory ${index + 1}`}
                                {feature.properties?.customer_count && (
                                  <span className="text-gray-500 ml-1">
                                    ({feature.properties.customer_count})
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    } else {
                      // If more than 7 territories, show default layer only
                      return (
                        <div className="flex items-center space-x-2 ml-4">
                          <div
                            className="w-3 h-3 rounded border"
                            style={{ 
                              backgroundColor: layer.color || '#3b82f6',
                              opacity: layer.opacity || 0.7
                            }}
                          />
                          <span className="text-xs">
                            {territoryCount > 0 ? `${territoryCount} Territories` : 'Territories'}
                          </span>
                        </div>
                      )
                    }
                  })()}
                </div>
              )}
              {layer.type === 'customer-locations' && (
                <div className="flex items-center space-x-2">
                  <Circle className="h-3 w-3 text-red-500 fill-current" />
                  <span className="text-xs">Customer Locations</span>
                </div>
              )}
              {layer.type === 'admin-boundaries' && (
                <div className="flex items-center space-x-2">
                  <Square className="h-3 w-3 text-blue-500 fill-current opacity-30" />
                  <span className="text-xs">Administrative Boundaries</span>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
