'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import { MapContainer } from './map-container'
import { MapControls } from './map-controls'
import { Territory, Location, MapLayer, Basemap, DrawingTool } from '@/types'
import {
  useUSStates,
  useRivers,
  useRoads,
  useMapTerritories,
  useMapCurrentLocations,
  useMapPotentialLocations,
} from '@/hooks/use-api'
import { FeatureCollection } from 'geojson'
import { BasemapSwitcher } from './basemap-switcher'
import { Legend } from './legend' // Import the new Legend component
import bbox from '@turf/bbox'
import pointsWithinPolygon from '@turf/points-within-polygon'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { drawStyles } from '@/lib/draw-styles'
import { Satellite, Square, Waypoints, Layers, Map, Moon } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { HorizontalToolbar } from './horizontal-toolbar'
import { TerritoryFormModal } from '../territories/territory-form-modal'
import { LocationFormModal } from '../locations/location-form-modal'
import { useCreateTerritory, useUpdateTerritory, useCreateLocation, useUpdateLocation } from '@/hooks/use-api'
import { PrintComposer } from './print-composer'
import { exportMapAsPDF } from '@/lib/pdf-export'


const googleHybridStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'google-hybrid': {
      type: 'raster',
      tiles: ['https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'],
      tileSize: 256,
      attribution: 'Source: Google Maps',
    },
  },
  layers: [
    {
      id: 'google-hybrid-layer',
      type: 'raster',
      source: 'google-hybrid',
    },
  ],
}

const googleRoadsStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'google-roads': {
      type: 'raster',
      tiles: ['https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}'],
      tileSize: 256,
      attribution: 'Source: Google Maps',
    },
  },
  layers: [
    {
      id: 'google-roads-layer',
      type: 'raster',
      source: 'google-roads',
    },
  ],
}

const basemaps: Basemap[] = [
  {
    id: 'google-roads',
    name: 'Google Roads',
    style: googleRoadsStyle,
    icon: <Map className="h-5 w-5" />,
  },
  {
    id: 'google-hybrid',
    name: 'Google Hybrid',
    style: googleHybridStyle,
    icon: <Satellite className="h-5 w-5" />,
  },
  {
    id: 'stadia-alidade-smooth',
    name: 'Stadia Smooth',
    style: 'https://tiles.stadiamaps.com/styles/alidade_smooth.json',
    icon: <Map className="h-5 w-5" />,
  },
  {
    id: 'osm-bright',
    name: 'Bright',
    style: 'https://api.maptiler.com/maps/bright/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    icon: <Waypoints className="h-8 w-8" />,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    style: 'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    icon: <Satellite className="h-8 w-8" />,
  },
  {
    id: 'topo',
    name: 'Topo',
    style: 'https://api.maptiler.com/maps/topo/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    icon: <Square className="h-8 w-8" />,
  },
  {
    id: 'carto-dark',
    name: 'Carto Dark',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    icon: <Moon className="h-5 w-5" />,
  },
]

interface MapInterfaceProps {
  onTerritoryCreate?: (territory: Omit<Territory, 'id' | 'created_at' | 'updated_at'>) => void
  onLocationCreate?: (location: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => void
}

const transformTerritoriesToGeoJSON = (territories: Territory[]): FeatureCollection => ({
        type: 'FeatureCollection',
        features: territories.map(territory => ({
          type: 'Feature',
          id: territory.id,
    geometry: territory.geom,
          properties: {
            name: territory.name,
            description: territory.description,
            color: territory.color || '#3b82f6',
          },
  })),
})

const transformLocationsToGeoJSON = (locations: Location[]): FeatureCollection => ({
        type: 'FeatureCollection',
  features: locations.map(location => ({
          type: 'Feature',
          id: location.id,
    geometry: location.geom,
          properties: {
            name: location.name,
      ...location.properties,
          },
        })),
})

const createPopulationAnalysisLayer = (
  locations: FeatureCollection,
  states: FeatureCollection
): FeatureCollection => {
  if (!locations?.features || !states?.features) {
    return { type: 'FeatureCollection', features: [] }
  }

  // Ensure we only process point features from the locations
  const pointFeatures = locations.features.filter(
    feature => feature?.geometry?.type === 'Point'
  )

  if (pointFeatures.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  const points = {
    type: 'FeatureCollection',
    features: pointFeatures,
  } as FeatureCollection

  const statesWithPopulation = states.features.map(state => {
    const pointsInState = pointsWithinPolygon(points, state)
    const totalPopulation = pointsInState.features.reduce(
      (acc, point) => acc + (point.properties?.population || 0),
      0
    )

    return {
      ...state,
      properties: {
        ...state.properties,
        totalPopulation,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features: statesWithPopulation,
  }
}

const createExpansionAnalysisLayer = (
  locations: FeatureCollection,
  states: FeatureCollection
): FeatureCollection => {
  if (!locations?.features || !states?.features) {
    return { type: 'FeatureCollection', features: [] }
  }

  const analysis = states.features.map(state => {
    const pointsInState = pointsWithinPolygon(
      {
        type: 'FeatureCollection',
        features: locations.features.filter(
          f => f?.geometry?.type === 'Point'
        ),
      },
      state
    )

    let totalPopulation = 0
    let marketPotential = 0
    let competition = 0
    let count = 0

    pointsInState.features.forEach(point => {
      totalPopulation += point.properties?.population || 0
      marketPotential += point.properties?.business_metrics?.market_potential || 0
      const competitionLevel =
        point.properties?.business_metrics?.competition_level
      if (competitionLevel === 'high') competition += 3
      if (competitionLevel === 'medium') competition += 2
      if (competitionLevel === 'low') competition += 1
      count++
    })

    const score =
      count > 0
        ? (totalPopulation / 100000) * 0.4 +
          (marketPotential / count) * 0.4 -
          (competition / count) * 0.2
        : 0

    return {
      ...state,
          properties: {
        ...state.properties,
        expansionScore: score,
        locationsCount: count,
      },
    }
  })

  const sortedStates = analysis.sort(
    (a, b) => b.properties.expansionScore - a.properties.expansionScore
  )
  const top3States = sortedStates.slice(0, 3).map(s => s.properties?.STATE_ABBR)

  const featuresWithRank = analysis.map(feature => {
    const rank = top3States.indexOf(feature.properties.STATE_ABBR)
    return {
      ...feature,
      properties: {
        ...feature.properties,
        expansionRank: rank !== -1 ? rank + 1 : 0,
      },
    }
  })

  return {
    type: 'FeatureCollection',
    features: featuresWithRank,
  }
}


export function MapInterface({ onTerritoryCreate, onLocationCreate }: MapInterfaceProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const drawRef = useRef<MapboxDraw | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [isDrawingToolReady, setIsDrawingToolReady] = useState(false)
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('none')
  const [editingFeature, setEditingFeature] = useState<any>(null)
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isPrintComposerOpen, setIsPrintComposerOpen] = useState(false)
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])

  const createTerritoryMutation = useCreateTerritory()
  const updateTerritoryMutation = useUpdateTerritory()
  const createLocationMutation = useCreateLocation()
  const updateLocationMutation = useUpdateLocation()

  const {
    data: territoriesData,
    isLoading: territoriesLoading,
  } = useMapTerritories()
  const {
    data: currentLocations,
    isLoading: currentLocationsLoading,
  } = useMapCurrentLocations()
  const {
    data: potentialLocations,
    isLoading: potentialLocationsLoading,
  } = useMapPotentialLocations()

  const territories = useMemo(() => {
    if (!territoriesData) return null
    if (territoriesData.type === 'FeatureCollection') {
      return {
        ...territoriesData,
        features: territoriesData.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            color: f.properties?.color || '#3b82f6'
          }
        }))
      }
    }
    // Handle case where territoriesData might be an object with territories property
    if (territoriesData.territories) {
      return transformTerritoriesToGeoJSON(territoriesData.territories)
    }
    return null
  }, [territoriesData])

  const { data: usStates, isLoading: usStatesLoading } = useUSStates()
  const { data: rivers, isLoading: riversLoading } = useRivers()
  const { data: roads, isLoading: roadsLoading } = useRoads()

  const [layersConfig, setLayersConfig] = useState<
    { id: string; name: string; type: string; visible: boolean; opacity: number }[]
  >([
    { id: 'territories', name: 'Territories', type: 'territories', visible: true, opacity: 0.5 },
    { id: 'current-locations', name: 'Current Locations', type: 'current-locations', visible: true, opacity: 1 },
    { id: 'potential-locations', name: 'Potential Locations', type: 'potential-locations', visible: true, opacity: 1 },
    { id: 'us-states', name: 'US States', type: 'us-states', visible: true, opacity: 0.2 },
    { id: 'population-analysis', name: 'Population Analysis', type: 'population-analysis', visible: false, opacity: 0.7 },
    { id: 'expansion-analysis', name: 'Expansion Analysis', type: 'expansion-analysis', visible: false, opacity: 0.7 },
    { id: 'rivers', name: 'Rivers', type: 'rivers', visible: false, opacity: 1 },
    // { id: 'roads', name: 'Roads', type: 'roads', visible: false, opacity: 1 },
  ])

  const isLoading =
    territoriesLoading ||
    currentLocationsLoading ||
    potentialLocationsLoading ||
    usStatesLoading ||
    riversLoading ||
    roadsLoading

  const populationAnalysisLayer = useMemo(() => {
    if (!potentialLocations || !usStates) {
      return {
        type: 'FeatureCollection',
        features: [],
      } as FeatureCollection
    }
    return createPopulationAnalysisLayer(
      potentialLocations as FeatureCollection,
      usStates as FeatureCollection
    )
  }, [potentialLocations, usStates])

  const expansionAnalysisLayer = useMemo(() => {
    if (!potentialLocations || !usStates) {
      return {
        type: 'FeatureCollection',
        features: [],
      } as FeatureCollection
    }
    return createExpansionAnalysisLayer(
      potentialLocations as FeatureCollection,
      usStates as FeatureCollection
    )
  }, [potentialLocations, usStates])

  const layers: MapLayer[] = useMemo(() => {
    return layersConfig.map(layer => {
      let data: FeatureCollection = { type: 'FeatureCollection', features: [] }
      switch (layer.id) {
        case 'territories':
          data = territories || data
          break
        case 'current-locations':
          data = currentLocations || data
          break
        case 'potential-locations':
          data = potentialLocations || data
          break
        case 'us-states':
          data = usStates || data
          break
        case 'rivers':
          data = rivers || data
          break
        case 'roads':
          data = roads || data
          break
        case 'population-analysis':
          data = populationAnalysisLayer || data
          break
        case 'expansion-analysis':
          data = expansionAnalysisLayer || data
          break
      }
      return { ...layer, data }
    })
  }, [
    layersConfig,
    territories,
    currentLocations,
    potentialLocations,
    usStates,
    rivers,
    roads,
    populationAnalysisLayer,
    expansionAnalysisLayer,
  ])

  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map
    setIsMapLoaded(true)
  }, [])

  const flyToDefaultView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    
    map.flyTo({
      center: [-98.5795, 39.8283], // Central US coordinates
      zoom: 3, // Zoom level to show continental US
      duration: 1000, // Animation duration in milliseconds
    })
  }, [])

  const handleBasemapChange = (basemap: Basemap) => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(basemap.style)
  }

  // Effect for initializing the drawing tool
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapLoaded || drawRef.current) return // <-- Check if drawRef is already initialized

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      styles: drawStyles,
    })
    map.addControl(drawRef.current as any)
    console.log('Drawing tool initialized and ready')
    setIsDrawingToolReady(true)

    const onCreate = ({ features }: { features: any[] }) => {
      const feature = features[0]
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        setEditingFeature(feature)
        setIsTerritoryModalOpen(true)
      } else if (feature.geometry.type === 'Point') {
        const newLocation = {
          name: 'New Location',
          geom: feature.geometry,
        }
        createLocationMutation.mutate(newLocation, {
            onSuccess: () => {
                drawRef.current?.deleteAll()
            }
        })
      }
    }
    const onUpdate = ({ features }: { features: any[] }) => {
      const feature = features[0]
      // Here you would likely want to find the original territory/location
      // and update its geometry. For simplicity, we'll just log it.
      console.log('Updated feature:', feature)
      // This would require a more complex state management to map
      // draw feature ids to database ids.
    }
    const onDelete = ({ features }: { features: any[] }) => {
      console.log('Deleted feature:', features[0])
    }

    const onSelectionChange = ({ features }: { features: any[] }) => {
        setSelectedFeatureIds(features.map(f => f.id as string))
    }

    map.on('draw.create', onCreate)
    map.on('draw.update', onUpdate)
    map.on('draw.delete', onDelete)
    map.on('draw.selectionchange', onSelectionChange)

    return () => {
      map.off('draw.create', onCreate)
      map.off('draw.update', onUpdate)
      map.off('draw.delete', onDelete)
      map.off('draw.selectionchange', onSelectionChange)
      if (drawRef.current) {
        // This check is important to prevent removing control that might not be there on hot-reloads
        if (map && map.hasControl(drawRef.current as any)) {
            map.removeControl(drawRef.current as any)
        }
      }
      setIsDrawingToolReady(false)
    }
  }, [isMapLoaded, createLocationMutation])

  // Effect for changing drawing mode
  useEffect(() => {
    const map = mapRef.current
    if (!isDrawingToolReady || !drawRef.current || !isMapLoaded) return

    try {
      if (drawingTool === 'direct_select' && selectedFeatureIds.length === 0) {
          // TODO: show toast message to user
          console.warn('A feature must be selected to enter edit mode.')
          setDrawingTool('simple_select')
          return
      }

      // Special handling for trash tool
      if (drawingTool === 'trash') {
          const selectedIds = drawRef.current.getSelectedIds()
          if (selectedIds.length > 0) {
              drawRef.current.trash()
          }
          setDrawingTool('none') // Reset tool after deleting
          drawRef.current.changeMode('simple_select')
          return
      }

      if (drawingTool && drawingTool !== 'none') {
        drawRef.current.changeMode(drawingTool)
      }
    } catch (error) {
      console.error('Error in drawing tool effect:', error)
    }
  }, [drawingTool, selectedFeatureIds, isMapLoaded, isDrawingToolReady])

  // This effect now correctly handles adding/updating sources and layers
  // It waits for the map to be loaded and listens for style changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapLoaded) return

    const addDataLayers = () => {
      layers.forEach(layer => {
        const sourceId = `${layer.id}-source`
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource

        if (!source) {
          if (layer.data && layer.data.features.length > 0) {
            map.addSource(sourceId, { type: 'geojson', data: layer.data })
          }
        } else {
          if (layer.data) {
            source.setData(layer.data)
          }
        }

        // Ensure layer doesn't already exist
        if (layer.data && layer.data.features.length > 0 && !map.getLayer(layer.id)) {
            if (layer.type === 'territories') {
                map.addLayer({ id: layer.id, type: 'fill', source: sourceId, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': layer.opacity } })
                map.addLayer({ id: `${layer.id}-outline`, type: 'line', source: sourceId, paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': layer.opacity } })
            } else if (layer.type === 'current-locations') {
                map.addLayer({ id: layer.id, type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': '#22c55e', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': layer.opacity, 'circle-stroke-opacity': layer.opacity } })
            } else if (layer.type === 'potential-locations') {
                map.addLayer({ id: layer.id, type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': '#f59e0b', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': layer.opacity, 'circle-stroke-opacity': layer.opacity } })
            } else if (layer.type === 'us-states') {
                map.addLayer({ id: layer.id, type: 'fill', source: sourceId, paint: { 'fill-color': '#8b5cf6', 'fill-opacity': layer.opacity } })
                map.addLayer({ id: `${layer.id}-outline`, type: 'line', source: sourceId, paint: { 'line-color': '#8b5cf6', 'line-width': 1, 'line-opacity': layer.opacity } })
            } else if (layer.type === 'population-analysis') {
                map.addLayer({
                    id: layer.id,
                    type: 'fill',
                    source: sourceId,
                    paint: { 'fill-color': [
                        'interpolate',
                        ['linear'],
                        ['get', 'totalPopulation'],
                        0, '#f7fcfd',
                        100000, '#e0ecf4',
                        500000, '#bfd3e6',
                        1000000, '#9ebcda',
                        2500000, '#8c96c6',
                        5000000, '#8856a7'
                      ], 'fill-opacity': layer.opacity },
                })
                map.addLayer({
                    id: `${layer.id}-outline`,
                    type: 'line',
                    source: sourceId,
                    paint: { 'line-color': '#ffffff', 'line-width': 1, 'line-opacity': layer.opacity }
                })
            } else if (layer.type === 'expansion-analysis') {
              map.addLayer({
                id: layer.id,
                type: 'fill',
                source: sourceId,
                paint: {
                  'fill-color': [
                    'match',
                    ['get', 'expansionRank'],
                    1, '#2ca25f', // Rank 1: green
                    2, '#fdae61', // Rank 2: orange
                    3, '#de2d26', // Rank 3: red
                    '#cccccc',    // Other: grey
                  ],
                  'fill-opacity': layer.opacity,
                },
              })
    map.addLayer({
                id: `${layer.id}-outline`,
                type: 'line',
                source: sourceId,
      paint: {
                  'line-color': [
                    'match',
                    ['get', 'expansionRank'],
                    1, '#2ca25f',
                    2, '#fdae61',
                    3, '#de2d26',
                    '#999999',
                  ],
                  'line-width': 2,
                  'line-opacity': layer.opacity,
                },
              })
            } else if (layer.type === 'rivers') {
                map.addLayer({ id: layer.id, type: 'line', source: sourceId, paint: { 'line-color': '#38bdf8', 'line-width': 1.5, 'line-opacity': layer.opacity } })
            } else if (layer.type === 'roads') {
                map.addLayer({ id: layer.id, type: 'line', source: sourceId, paint: { 'line-color': '#6b7280', 'line-width': 1, 'line-opacity': layer.opacity } })
            }
        }
        
        // Always update visibility
        if (map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none')
        }
        if (map.getLayer(`${layer.id}-outline`)) {
            map.setLayoutProperty(`${layer.id}-outline`, 'visibility', layer.visible ? 'visible' : 'none')
        }
      })
    }

    map.on('styledata', addDataLayers)

    // Initial data load
    if (map.isStyleLoaded()) {
      addDataLayers()
    }

    return () => {
      map.off('styledata', addDataLayers)
    }
  }, [layers, isMapLoaded])

  // Effect to update layer opacity
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapLoaded) return

    layersConfig.forEach(layer => {
      if (map.getLayer(layer.id)) {
        const paint = map.getLayer(layer.id)?.paint
        if (!paint) return

        const opacityProps = ['fill-opacity', 'line-opacity', 'circle-opacity', 'circle-stroke-opacity']
        opacityProps.forEach(prop => {
          if (paint.get(prop)) {
            map.setPaintProperty(layer.id, prop, layer.opacity)
          }
        })
      }
      if (map.getLayer(`${layer.id}-outline`)) {
        const paint = map.getLayer(`${layer.id}-outline`)?.paint
        if (!paint) return
        
        if (paint.get('line-opacity')) {
          map.setPaintProperty(`${layer.id}-outline`, 'line-opacity', layer.opacity)
        }
      }
    })
  }, [layersConfig, isMapLoaded])


  // Effect for click handlers
  useEffect(() => {
    const map = mapRef.current
    if (!map || !isMapLoaded) return

    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      if (drawingTool !== 'none' && drawingTool !== 'simple_select') return

      const allLayerIds = layers.map(l => l.id).concat(layers.map(l => `${l.id}-outline`));
      const existingLayerIds = allLayerIds.filter(id => map.getLayer(id));

      if (existingLayerIds.length === 0) {
        return;
      }

      const features = map.queryRenderedFeatures(e.point, {
        layers: existingLayerIds,
      })

      if (features.length > 0) {
        const feature = features[0]

        // Fly to feature
        if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
          const featureBbox = bbox(feature.geometry)
          map.fitBounds([featureBbox[0], featureBbox[1], featureBbox[2], featureBbox[3]], {
            padding: 20,
            maxZoom: 15,
          })
        } else if (feature.geometry.type === 'Point') {
          map.flyTo({
            center: feature.geometry.coordinates as [number, number],
            zoom: 14,
          })
        }

        // Create popup
        if (popupRef.current) {
          popupRef.current.remove()
          popupRef.current = null
        }

        // Create popup with simple HTML content to avoid context issues
        let html = ''
        try {
          const properties = feature.properties || {}
          console.log('Feature properties:', properties)
          
          const propertiesHtml = Object.keys(properties).map(key => {
            const value = properties[key]
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
            return `<p><strong>${key}:</strong> ${displayValue}</p>`
          }).join('')
          
          console.log('Properties HTML:', propertiesHtml)
          
          html = '<div class="max-w-xs p-2">' +
            '<div class="popup-header">' +
              '<h3 class="popup-title">' + (properties?.name || 'Feature Details') + '</h3>' +
              '<div class="popup-actions">' +
                '<button onclick="window.editFeature()" class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">Edit</button>' +
              '</div>' +
            '</div>' +
            '<div class="text-sm max-h-48 overflow-y-auto">' +
              propertiesHtml +
            '</div>' +
          '</div>'
        } catch (error) {
          console.error('Error creating popup HTML:', error)
          html = '<div class="max-w-xs p-2"><div class="popup-header"><h3 class="popup-title">Feature Details</h3></div><p>Error loading details</p></div>'
        }
        
        // Store feature for edit action
        (window as any).editFeature = () => {
          setEditingFeature(feature)
          if (feature.layer.id.includes('territor')) {
            setIsTerritoryModalOpen(true)
          } else if (feature.layer.id.includes('location')) {
            setIsLocationModalOpen(true)
          }
        }
        
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false, // Keep popup open on map click to allow interaction
          className: 'custom-popup', // Add custom class for styling
        })
          .setLngLat(e.lngLat)
          .setHTML(html)
          .addTo(map)

        // Add event listener for popup close
        popupRef.current.on('close', () => {
          // Fly back to default US view
          flyToDefaultView()
        })
      }
    }

    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
      if (popupRef.current) {
        popupRef.current.remove()
      }
    }
  }, [isMapLoaded, drawingTool, layers])

  const handleLayerToggle = (layerId: string) => {
    setLayersConfig(prev => prev.map(layer => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)))
  }

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    setLayersConfig(prev =>
      prev.map(layer => (layer.id === layerId ? { ...layer, opacity } : layer))
    )
  }

  const handleDrawingToolChange = (tool: DrawingTool) => {
    console.log('Drawing tool change requested:', tool, 'Ready:', isDrawingToolReady, 'DrawRef:', !!drawRef.current, 'MapLoaded:', isMapLoaded)
    
    if (!isDrawingToolReady || !drawRef.current || !isMapLoaded) {
      console.warn('Drawing tool not ready yet', { isDrawingToolReady, hasDrawRef: !!drawRef.current, isMapLoaded })
      return
    }
    
    setDrawingTool(tool)
    
    try {
      if (tool && tool !== 'none') {
        console.log('Changing to mode:', tool)
        drawRef.current.changeMode(tool as any)
      } else {
        // Handle deselection if needed, e.g., changing to simple_select
        console.log('Changing to simple_select mode')
        drawRef.current.changeMode('simple_select')
      }
    } catch (error) {
      console.error('Error changing drawing mode:', error)
    }
  }

  const handleExport = () => {
    if (mapRef.current) {
        exportMapAsPDF(mapRef.current, layers, 'Map Export', 'a4-landscape', true, true, true);
    }
  }

  const handlePrint = () => {
    // Direct print like the original implementation
    console.log('Print button clicked');
    console.log('Map element for print:', document.getElementById('map'));
    console.log('Map element visible:', document.getElementById('map')?.offsetWidth, 'x', document.getElementById('map')?.offsetHeight);
    window.print()
  }

  const handleTerritoryFormSubmit = (data: any) => {
    if (editingFeature) {
        if (editingFeature.id && !editingFeature.properties?.id) { // Creating new feature
            const newTerritory = {
                ...data,
                geom: editingFeature.geometry,
            }
            createTerritoryMutation.mutate(newTerritory)
        } else { // Editing existing feature
            const updatedTerritory = {
                ...editingFeature.properties,
                ...data,
            }
            updateTerritoryMutation.mutate(updatedTerritory)
        }
    }
    setIsTerritoryModalOpen(false)
    setEditingFeature(null)
    drawRef.current?.deleteAll()
  }

  const handleLocationFormSubmit = (data: any) => {
    if (editingFeature) {
        if (editingFeature.id && !editingFeature.properties?.id) { // Creating
            const newLocation = {
                ...data,
                geom: editingFeature.geometry,
            }
            createLocationMutation.mutate(newLocation)
        } else { // Editing
            const updatedLocation = {
                ...editingFeature.properties,
                ...data,
            }
            updateLocationMutation.mutate(updatedLocation)
        }
    }
    setIsLocationModalOpen(false)
    setEditingFeature(null)
    drawRef.current?.deleteAll()
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 relative" id="map-container-for-export">
        <MapContainer
          onMapLoad={handleMapLoad}
          className="h-full"
          initialStyle={basemaps[0].style}
        />
        <BasemapSwitcher
          basemaps={basemaps}
          onBasemapChange={handleBasemapChange}
        />
        <HorizontalToolbar
          drawingTool={drawingTool}
          onDrawingToolChange={handleDrawingToolChange}
          onExport={handleExport}
          onPrint={handlePrint}
          onHome={flyToDefaultView}
          isFeatureSelected={selectedFeatureIds.length > 0}
          isDrawingToolReady={isDrawingToolReady}
        />
        <Legend layers={layers} />
        <div className="md:hidden absolute top-4 right-4 z-10">
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="secondary" size="icon">
                <Layers className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <div className="p-4">
                <MapControls
          layers={layers}
                  onLayerToggle={handleLayerToggle}
                  onLayerOpacityChange={handleLayerOpacityChange}
                  drawingTool={drawingTool}
                  onDrawingToolChange={handleDrawingToolChange}
                  onExport={handleExport}
                  onHome={flyToDefaultView}
                  isLoading={isLoading}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      <div className="w-80 border-l bg-background/95 hidden md:block">
        <MapControls
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerOpacityChange={handleLayerOpacityChange}
          drawingTool={drawingTool}
          onDrawingToolChange={handleDrawingToolChange}
          onExport={handleExport}
          onHome={flyToDefaultView}
          className="m-4"
          isLoading={isLoading}
        />
      </div>
      <TerritoryFormModal
        isOpen={isTerritoryModalOpen}
        onOpenChange={setIsTerritoryModalOpen}
        onSubmit={handleTerritoryFormSubmit}
        territory={editingFeature?.properties}
      />
      <LocationFormModal
        isOpen={isLocationModalOpen}
        onOpenChange={setIsLocationModalOpen}
        onSubmit={handleLocationFormSubmit}
        location={editingFeature?.properties}
        locationType="current"
      />
      <PrintComposer
        isOpen={isPrintComposerOpen}
        onOpenChange={setIsPrintComposerOpen}
        map={mapRef.current}
        layers={layers}
      />
    </div>
  )
}