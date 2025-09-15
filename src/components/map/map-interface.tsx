'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import { MapContainer } from './map-container'
import { MapControls } from './map-controls'
import { TerritoryGenerator } from './territory-generator'
import { Territory, Location, MapLayer, Basemap, DrawingTool } from '@/types'
import {
  useUSStates,
  useRivers,
  useRoads,
  useMapTerritories,
  useMapCurrentLocations,
  useMapPotentialLocations,
} from '@/hooks/use-api'
import { Feature, FeatureCollection, Geometry, Point, MultiPoint, Polygon, MultiPolygon } from 'geojson'
import { BasemapSwitcher } from './basemap-switcher'
import { Legend } from './legend' // Import the new Legend component
import bbox from '@turf/bbox'
import pointsWithinPolygon from '@turf/points-within-polygon'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import { drawStyles } from '@/lib/draw-styles'
import { Satellite, Square, Waypoints, Layers, Map, Moon, CheckCircle, X, Loader2 } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { HorizontalToolbar } from './horizontal-toolbar'
import { TerritoryFormModal } from '../territories/territory-form-modal'
import { LocationFormModal } from '../locations/location-form-modal'
import { useCreateTerritory, useUpdateTerritory, useCreateLocation, useUpdateLocation, useDeleteTerritory } from '@/hooks/use-api'
import { PrintComposer } from './print-composer'
import { exportMapAsPDF } from '@/lib/pdf-export'
import { useQueryClient } from '@tanstack/react-query'
import { ProgressIndicator } from '@/components/ui/progress-indicator'


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
    geometry: location.geom as Geometry,
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
    (feature): feature is Feature<Point> => feature?.geometry?.type === 'Point'
  )

  if (pointFeatures.length === 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  const points: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: pointFeatures,
  }

  const statesWithPopulation = states.features.map(state => {
    const pointsInState = pointsWithinPolygon(points, state as Feature<Polygon | MultiPolygon>)
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
    features: statesWithPopulation as Feature[],
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
          (f): f is Feature<Point> => f?.geometry?.type === 'Point'
        ),
      },
      state as Feature<Polygon | MultiPolygon>
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
  const top3States = sortedStates.slice(0, 3).map(s => (s.properties as any)?.STATE_ABBR)

  const featuresWithRank = analysis.map(feature => {
    const rank = top3States.indexOf((feature.properties as any).STATE_ABBR)
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
    features: featuresWithRank as Feature[],
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
  const [isDrawingToolActive, setIsDrawingToolActive] = useState(false)
  const [editingFeature, setEditingFeature] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveButton, setShowSaveButton] = useState(false)
  const [isEditingMode, setIsEditingMode] = useState(false)
  const [editingFeaturePosition, setEditingFeaturePosition] = useState<{ x: number; y: number } | null>(null)
  const [isTerritoryModalOpen, setIsTerritoryModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [isPrintComposerOpen, setIsPrintComposerOpen] = useState(false)
  const [isTerritoryGeneratorOpen, setIsTerritoryGeneratorOpen] = useState(false)
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([])
  const [operationProgress, setOperationProgress] = useState<number | null>(null)
  const [newPointFeature, setNewPointFeature] = useState<Feature<Point> | null>(null)
  const [locationDrawType, setLocationDrawType] = useState<'current' | 'potential'>('current')

  const queryClient = useQueryClient()
  const createTerritoryMutation = useCreateTerritory()
  const updateTerritoryMutation = useUpdateTerritory()
  const createLocationMutation = useCreateLocation()
  const updateLocationMutation = useUpdateLocation()
  const deleteTerritoryMutation = useDeleteTerritory()

  const {
    data: territoriesData,
    isLoading: territoriesLoading,
    isFetching: territoriesFetching,
  } = useMapTerritories()

  // Event handler functions for drawing tool
  const onCreate = useCallback(({ features }: { features: Feature[] }) => {
    const feature = features[0]
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      setEditingFeature(feature)
      setIsTerritoryModalOpen(true)
    } else if (feature.geometry.type === 'Point') {
      setNewPointFeature(feature as Feature<Point>)
      setIsLocationModalOpen(true)
    }
  }, [])

  const onUpdate = useCallback(({ features }: { features: Feature[] }) => {
    const feature = features[0]
    console.log('🔄 onUpdate triggered:', feature)
    console.log('Feature geometry type:', feature.geometry.type)
    
    // Debug the updated feature geometry
    console.log('🔍 Updated feature geometry in onUpdate:', {
      id: feature.properties?.id,
      geometryType: feature.geometry?.type,
      coordinates: (feature.geometry as any)?.coordinates?.[0]?.[0]?.slice(0, 3) // First 3 coordinates
    })
    
    // Find the original territory by matching the feature ID from the drawing tool
    if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      console.log('Processing territory update...')
      
      // Get the original territory ID from the feature properties
      const originalTerritoryId = feature.properties?.id
      console.log('Original territory ID from feature:', originalTerritoryId)
      
      if (originalTerritoryId) {
        // Find the territory in our data
        const territory = (territoriesData as FeatureCollection)?.features?.find((t: Feature) => t.id === originalTerritoryId)
        console.log('Found territory:', territory ? territory.id : 'none')
        
        if (territory) {
          // Store the updated feature for saving
          const editingData = {
            ...feature,
            originalId: territory.id,
            originalTerritory: territory
          }
          console.log('Setting editing feature:', editingData)
          setEditingFeature(editingData)
          setIsEditingMode(true)
          console.log('✅ Territory ready for saving:', territory.id)
          console.log('✅ isEditingMode set to true')
          console.log('🔍 isEditingMode state should now be true')
        }
      }
    } else if (feature.geometry.type === 'Point') {
      console.log('Processing location update...')
      const originalLocationId = feature.properties?.id
      if (originalLocationId) {
        // Since we don't know if it's a current or potential location, we'll just prep it for saving
        setEditingFeature(feature)
        setIsEditingMode(true)
        console.log('✅ Location ready for saving:', originalLocationId)
      }
    }
  }, [territoriesData])

  const onDelete = useCallback(({ features }: { features: Feature[] }) => {
    console.log('onDelete triggered with features:', features)
    features.forEach(feature => {
      const geometryType = feature.geometry.type
      if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
        const territoryId = feature.properties?.id
        if (territoryId) {
          deleteTerritoryMutation.mutate(territoryId)
        } else {
          console.warn('Could not delete territory, ID not found in properties.')
        }
      } else {
        console.warn(`Deletion not implemented for geometry type: ${geometryType}`)
      }
    })
  }, [deleteTerritoryMutation])

  const onSelectionChange = useCallback(({ features }: { features: Feature[] }) => {
    console.log('🎯 Selection changed:', features)
    console.log('🎯 Total features in draw tool:', drawRef.current?.getAll()?.features?.length || 0)
    console.log('🎯 Selected feature IDs:', features.map(f => f.id))
    console.log('🎯 Current drawing tool mode:', drawingTool)
    setSelectedFeatureIds(features.map(f => f.id as string))
    
    // Update the selected state in the drawing tool
    if (drawRef.current) {
      // Clear previous selections
      const allFeatures = drawRef.current.getAll()
      console.log('🎯 All features in draw tool:', allFeatures.features.length)
      allFeatures.features.forEach((feature: any) => {
        if (feature.properties) {
          feature.properties.selected = false
        }
      })
      
      // Mark newly selected features
      features.forEach(selectedFeature => {
        const feature = allFeatures.features.find((f: any) => f.id === selectedFeature.id)
        if (feature && feature.properties) {
          feature.properties.selected = true
          console.log('🎯 Marked feature as selected:', feature.id)
        }
      })
      
      // Update the drawing tool with modified features
      drawRef.current.set(allFeatures)
    }

    // If a feature is selected and we're in simple_select mode, 
    // automatically switch to direct_select mode for editing
    if (features.length > 0 && drawingTool === 'simple_select') {
      console.log('🔧 Feature selected, switching to edit mode')
      console.log('🔧 Features count:', features.length)
      console.log('🔧 Current mode:', drawingTool)
      console.log('🔧 First selected feature ID:', features[0]?.id)
      
      // Switch to direct_select mode with the selected feature ID immediately
      if (features[0]?.id) {
        console.log('🔧 Switching to direct_select mode for feature:', features[0].id)
        try {
          drawRef.current?.changeMode('direct_select', { featureId: features[0].id as string })
          setDrawingTool('direct_select')
        } catch (error) {
          console.error('🔧 Error switching to direct_select mode:', error)
          // Fallback to simple_select if direct_select fails
          drawRef.current?.changeMode('simple_select')
        }
      }
    } else {
      console.log('🔧 Not switching modes:', { featuresLength: features.length, currentMode: drawingTool })
    }
  }, [drawingTool])

  const onDrawRightClick = useCallback((e: any) => {
    console.log('🖱️ Right-click on draw feature:', e)
    
    // Check if we're in editing mode and have an edited feature
    if (isEditingMode && editingFeature) {
      console.log('🖱️ Right-click on edited feature, showing save popup')
      
      // Calculate the center of the edited feature for popup positioning
      let center: [number, number]
      if (editingFeature.geometry.type === 'Polygon' || editingFeature.geometry.type === 'MultiPolygon') {
        const bbox_coords = bbox(editingFeature.geometry)
        center = [(bbox_coords[0] + bbox_coords[2]) / 2, (bbox_coords[1] + bbox_coords[3]) / 2]
      } else if (editingFeature.geometry.type === 'Point') {
        center = editingFeature.geometry.coordinates as [number, number]
      } else {
        center = [e.lngLat.lng, e.lngLat.lat]
      }
      
      // Convert to pixel coordinates for positioning
      const map = mapRef.current
      if (map) {
        const pixel = map.project(center)
        setEditingFeaturePosition({ x: pixel.x, y: pixel.y })
        setShowSaveButton(true)
      }
    }
  }, [isEditingMode, editingFeature])

  const {
    data: currentLocations,
    isLoading: currentLocationsLoading,
    isFetching: currentLocationsFetching,
  } = useMapCurrentLocations()
  const {
    data: potentialLocations,
    isLoading: potentialLocationsLoading,
    isFetching: potentialLocationsFetching,
  } = useMapPotentialLocations()

  const territories = useMemo(() => {
    if (!territoriesData || !(territoriesData as FeatureCollection).features) return null
    
    // Debug logging
    console.log('🔍 TerritoriesData received:', {
      type: (territoriesData as FeatureCollection).type,
      featuresCount: (territoriesData as FeatureCollection).features.length || 0,
      firstFeatureId: (territoriesData as FeatureCollection).features?.[0]?.id,
      firstFeatureGeometry: (territoriesData as FeatureCollection).features?.[0]?.geometry?.type
    })
    
    if ((territoriesData as FeatureCollection).type === 'FeatureCollection') {
      return {
        ...territoriesData,
        features: (territoriesData as FeatureCollection).features.map((f: Feature) => ({
          ...f,
          properties: {
            ...f.properties,
            color: f.properties?.color || '#3b82f6'
          }
        }))
      }
    }
    // Handle case where territoriesData might be an object with territories property
    if ((territoriesData as any).territories) {
      return transformTerritoriesToGeoJSON((territoriesData as any).territories)
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

  const isProcessing =
    createTerritoryMutation.isPending ||
    updateTerritoryMutation.isPending ||
    deleteTerritoryMutation.isPending ||
    createLocationMutation.isPending ||
    updateLocationMutation.isPending ||
    territoriesFetching ||
    currentLocationsFetching ||
    potentialLocationsFetching;

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isProcessing) {
      // Start the progress simulation
      setOperationProgress(prev => prev ?? 10) // Start at 10 if not already in progress

      progressIntervalRef.current = setInterval(() => {
        setOperationProgress(prev => {
          if (prev === null || prev >= 95) { // Cap the auto-increment at 95%
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
            return prev
          }
          return prev + 5 // Slowly increment
        })
      }, 500)
    } else {
      // Finish the progress when processing is done
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
      if (operationProgress !== null) {
        setOperationProgress(100)
        setTimeout(() => setOperationProgress(null), 500) // Hide after completion
      }
    }

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [isProcessing])

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    if (drawingTool === 'draw_point') {
      const color = locationDrawType === 'current' ? '#22c55e' : '#f59e0b';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>`;
      const cursorUrl = `data:image/svg+xml;base64,${btoa(svg)}`;
      map.getCanvas().style.cursor = `url(${cursorUrl}) 12 12, auto`;
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [drawingTool, locationDrawType]);

  useEffect(() => {
    if (newPointFeature) {
      setIsLocationModalOpen(true)
    }
  }, [newPointFeature])

  useEffect(() => {
    if (drawRef.current) {
      const color = locationDrawType === 'current' ? '#22c55e' : '#f59e0b';
      const newStyles = drawStyles.map(style => {
        if (style.id.includes('gl-draw-point')) {
          return {
            ...style,
            paint: {
              ...style.paint,
              'circle-color': color,
            },
          };
        }
        return style;
      });
      // It's not ideal to set styles repeatedly, but it's a way to dynamically update colors
      // A more advanced implementation might involve creating separate layers for each location type.
      (drawRef.current as any).setStyles(newStyles);
    }
  }, [locationDrawType]);

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
          data = territories as FeatureCollection || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'current-locations':
          data = (currentLocations as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'potential-locations':
          data = (potentialLocations as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'us-states':
          data = (usStates as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'rivers':
          data = (rivers as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'roads':
          data = (roads as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'population-analysis':
          data = populationAnalysisLayer || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
        case 'expansion-analysis':
          data = expansionAnalysisLayer || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
          break
      }
      return { ...layer, data, type: layer.type as MapLayer['type'] }
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
    console.log('Map loaded, ready for drawing tool initialization')
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
    if (!map || !isMapLoaded || drawRef.current) return

    const initializeDrawingTool = () => {
      try {
        console.log('Initializing drawing tool...')
        drawRef.current = new MapboxDraw({
          displayControlsDefault: false,
          styles: drawStyles,
        })
        map.addControl(drawRef.current as any)
        
        // Initialize in simple_select mode but we'll control interaction via state
        drawRef.current.changeMode('simple_select')
        console.log('Drawing tool initialized and ready')
        setIsDrawingToolReady(true)
      } catch (error) {
        console.error('Error initializing drawing tool:', error)
        setIsDrawingToolReady(false)
      }
    }

    // Try to initialize immediately
    initializeDrawingTool()

    // If that fails, try again after a short delay
    const timeoutId = setTimeout(() => {
      if (!drawRef.current) {
        console.log('Retrying drawing tool initialization...')
        initializeDrawingTool()
      }
    }, 1000)

    return () => {
      clearTimeout(timeoutId)
    }

    // Event handler functions are now defined at component level

    // onSelectionChange is now defined at component level

    // onDrawRightClick is now defined at component level

    // Events are now set up in a separate useEffect after drawing tool initialization

    return () => {
      // Event cleanup is handled in the separate event setup useEffect
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
      // Note: direct_select mode switching is now handled in onSelectionChange
      // This effect only handles other modes

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

      // Only change mode if we have a valid tool
      if (drawingTool && drawingTool !== 'none') {
        console.log('Effect changing to mode:', drawingTool)
        if (drawingTool === 'simple_select') {
          drawRef.current.changeMode('simple_select')
        } else if (drawingTool === 'direct_select') {
          // direct_select mode is handled in onSelectionChange
          console.log('Direct select mode requested - will be handled by selection change')
        } else if (drawingTool === 'draw_polygon' || drawingTool === 'draw_point') {
          drawRef.current.changeMode(drawingTool as any)
        }
      } else {
        // Default to simple_select mode when no tool is selected
        drawRef.current.changeMode('simple_select')
      }
    } catch (error) {
      console.error('Error in drawing tool effect:', error)
    }
  }, [drawingTool, isMapLoaded, isDrawingToolReady])

  // Effect to set up drawing tool events after initialization
  useEffect(() => {
    const map = mapRef.current
    if (!isDrawingToolReady || !drawRef.current || !isMapLoaded || !map) {
      console.log('🔧 Not setting up events yet:', { isDrawingToolReady, drawRef: !!drawRef.current, isMapLoaded, map: !!map })
      return
    }

    console.log('🔧 Setting up drawing tool events')
    
    // Remove any existing event listeners first
    map.off('draw.create', onCreate)
    map.off('draw.update', onUpdate)
    map.off('draw.delete', onDelete)
    map.off('draw.selectionchange', onSelectionChange)
    map.off('contextmenu', onDrawRightClick)
    
    // Add event listeners
    map.on('draw.create', onCreate)
    map.on('draw.update', onUpdate)
    map.on('draw.delete', onDelete)
    map.on('draw.selectionchange', onSelectionChange)
    map.on('contextmenu', onDrawRightClick)
    
    // Test click handler to see if map clicks are working
    const testClickHandler = (e: any) => {
      console.log('🔧 Map clicked at:', e.lngLat)
      console.log('🔧 Drawing tool mode:', drawRef.current?.getMode())
      console.log('🔧 Drawing tool selected features:', drawRef.current?.getSelected()?.features?.length || 0)
      
      // Manually check for selected features and update state
      if (drawRef.current) {
        const selected = drawRef.current.getSelected()
        if (selected && selected.features && selected.features.length > 0) {
          console.log('🔧 Manually detected selected features:', selected.features.length)
          const featureIds = selected.features.map(f => f.id as string)
          setSelectedFeatureIds(featureIds)
          
          // Trigger onSelectionChange manually
          onSelectionChange({ features: selected.features })
        } else {
          console.log('🔧 No features selected')
          setSelectedFeatureIds([])
        }
      }
    }
    map.on('click', testClickHandler)
    
    console.log('🔧 Drawing tool events set up successfully')

    return () => {
      console.log('🔧 Cleaning up drawing tool events')
      if (map) {
        map.off('draw.create', onCreate)
        map.off('draw.update', onUpdate)
        map.off('draw.delete', onDelete)
        map.off('draw.selectionchange', onSelectionChange)
        map.off('contextmenu', onDrawRightClick)
        map.off('click', testClickHandler)
      }
    }
  }, [isDrawingToolReady, isMapLoaded, onCreate, onUpdate, onDelete, onSelectionChange, onDrawRightClick])

  // Effect to load existing features into the drawing tool for editing
  useEffect(() => {
    const map = mapRef.current
    if (!isDrawingToolReady || !drawRef.current || !isMapLoaded) return

    // Check if territories and currentLocations are available
    if (!territories || !territories.features) {
      console.log('Territories not loaded yet:', { 
        territories: territories ? (territories.features ? territories.features.length : 'no features') : 'null',
        currentLocations: Array.isArray(currentLocations) ? currentLocations.length : typeof currentLocations
      })
      return
    }

    // Combine current and potential locations
    const currentLocationsArray = (currentLocations as FeatureCollection)?.features || []
    const potentialLocationsArray = (potentialLocations as FeatureCollection)?.features || []

    const allLocations = [
      ...currentLocationsArray.map(loc => ({ ...loc, properties: { ...loc.properties, locationType: 'current' } })),
      ...potentialLocationsArray.map(loc => ({ ...loc, properties: { ...loc.properties, locationType: 'potential' } }))
    ];

    // currentLocations might be an object with data property, let's handle that
    const locationsArray = Array.isArray(currentLocations) ? currentLocations : ((currentLocations as any)?.features || [])
    console.log('Processing features:', {
      territories: territories.features.length,
      allLocations: allLocations.length,
    })

    // Add a small delay to ensure map is fully ready
    const timeoutId = setTimeout(() => {
      console.log('Starting to load features into drawing tool...')
      try {
        // Clear existing features first
        drawRef.current?.deleteAll()
        console.log('Cleared existing features')

        let addedCount = 0

        // Add territories to drawing tool
        console.log('Adding territories:', territories.features.length)
        territories.features.forEach((territory: Feature, index: number) => {
          if (territory.geometry && (territory.geometry.type === 'Polygon' || territory.geometry.type === 'MultiPolygon')) {
            // Debug specific territory
            if (territory.id === '30dd96fe-91b6-43eb-9dcb-ed728e738213') {
              console.log('🔍 Loading specific territory:', {
                id: territory.id,
                name: territory.properties?.name,
                geometryType: territory.geometry.type,
                coordinates: (territory.geometry as Polygon | MultiPolygon).coordinates?.[0]?.[0]?.slice(0, 3) // First 3 coordinates
              })
            }
            
            const feature = {
              type: 'Feature' as const,
              id: territory.id, // Use the territory ID as the feature ID
              properties: {
                id: territory.id, // This is the original territory ID
                name: territory.properties?.name || 'Unnamed Territory',
                type: territory.properties?.type || 'territory', // Use original type or default to 'territory'
                selected: false,
                ...territory.properties
              },
              geometry: territory.geometry
            }
            try {
              drawRef.current?.add(feature as any)
              addedCount++
              if (index < 5) console.log(`Added territory ${index + 1}:`, territory.id)
            } catch (addError) {
              console.warn('Failed to add territory to draw tool:', addError)
            }
          }
        })

        // Add current locations to drawing tool
        console.log('Adding locations:', allLocations.length)
        allLocations.forEach((location, index) => {
          if (location.geometry && location.geometry.type === 'Point') {
            const feature = {
              type: 'Feature' as const,
              id: location.id, // Use the location ID as the feature ID
              properties: {
                id: location.id, // This is the original location ID
                name: location.name,
                type: 'location',
                selected: false,
                ...location.properties
              },
              geometry: location.geometry
            }
            try {
              drawRef.current?.add(feature as any)
              addedCount++
              if (index < 5) console.log(`Added location ${index + 1}:`, location.id)
            } catch (addError) {
              console.warn('Failed to add location to draw tool:', addError)
            }
          }
        })

        console.log('Loaded existing features into drawing tool:', { 
          territories: territories.features.length, 
          locations: allLocations.length,
          addedCount,
          drawFeatures: drawRef.current?.getAll()?.features?.length || 0
        })
      } catch (error) {
        console.error('Error loading features into drawing tool:', error)
      }
    }, 1000) // 1 second delay

    return () => clearTimeout(timeoutId)
  }, [isDrawingToolReady, isMapLoaded, territories, currentLocations, potentialLocations])

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
          if ((paint as any)[prop]) {
            map.setPaintProperty(layer.id, prop, layer.opacity)
          }
        })
      }
      if (map.getLayer(`${layer.id}-outline`)) {
        const paint = map.getLayer(`${layer.id}-outline`)?.paint
        if (!paint) return
        
        if ((paint as any)['line-opacity']) {
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
      // If we're in editing mode and user clicks outside, show save popup
      if (isEditingMode && editingFeature) {
        console.log('🎯 User clicked outside while editing, showing save popup')
        
        // Calculate the center of the edited feature for popup positioning
        let center: [number, number]
        if (editingFeature.geometry.type === 'Polygon' || editingFeature.geometry.type === 'MultiPolygon') {
          const bbox_coords = bbox(editingFeature.geometry)
          center = [(bbox_coords[0] + bbox_coords[2]) / 2, (bbox_coords[1] + bbox_coords[3]) / 2]
        } else if (editingFeature.geometry.type === 'Point') {
          center = editingFeature.geometry.coordinates as [number, number]
        } else {
          center = [e.lngLat.lng, e.lngLat.lat]
        }
        
        // Convert to pixel coordinates for positioning
        const pixel = map.project(center)
        setEditingFeaturePosition({ x: pixel.x, y: pixel.y })
        setShowSaveButton(true)
        return
      }

      // Don't show popups when drawing tools are active - let MapboxDraw handle selection
      if (isDrawingToolActive) return

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
          setEditingFeature(feature as any)
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
  }, [isMapLoaded, isDrawingToolActive, layers, isEditingMode, editingFeature, flyToDefaultView])

  const handleLayerToggle = (layerId: string) => {
    setLayersConfig(prev => prev.map(layer => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)))
  }

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    setLayersConfig(prev =>
      prev.map(layer => (layer.id === layerId ? { ...layer, opacity } : layer))
    )
  }

  const handleSaveFeature = () => {
    if (!editingFeature) {
      console.error('Save clicked, but no feature is in editing state.')
      setIsSaving(false)
      return
    }

    const featureToSave = editingFeature
    const originalId = featureToSave.properties?.id
    
    if (!originalId) {
      console.error('Could not determine the original ID of the feature to save.')
      setIsSaving(false)
      return
    }

    let featureType: 'territory' | 'location' | undefined;
    const geometryType = featureToSave.geometry.type;

    if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
      featureType = 'territory';
    } else if (geometryType === 'Point') {
      featureType = 'location';
    }

      console.log('Saving feature:', { originalId, featureType, geometry: featureToSave.geometry })
      console.log('Feature properties:', featureToSave.properties)
      
      // Debug specific territory being saved
      if (originalId === '30dd96fe-91b6-43eb-9dcb-ed728e738213') {
        console.log('🔍 Saving specific territory:', {
          id: originalId,
          geometryType: featureToSave.geometry.type,
        coordinates: (featureToSave.geometry as Polygon | MultiPolygon).coordinates?.[0]?.[0]?.slice(0, 3) // First 3 coordinates
        })
      }

    setIsSaving(true)

    if (featureType === 'territory') {
      // Save territory (including generated territories)
      updateTerritoryMutation.mutate({
        id: originalId,
        data: { 
          geom: featureToSave.geometry as Polygon | MultiPolygon,
          updated_at: new Date().toISOString()
        }
      }, {
        onSuccess: () => {
          console.log('Territory saved successfully')
          setIsSaving(false)
          handleCancelEdit()
        },
        onError: (error) => {
          console.error('Failed to save territory:', error)
          setIsSaving(false)
        }
      })
    } else if (featureType === 'location') {
      // Save location
      updateLocationMutation.mutate({
        id: originalId,
        data: { 
          geom: featureToSave.geometry as Point,
          updated_at: new Date().toISOString()
        },
        type: featureToSave.properties?.locationType || 'current',
      }, {
        onSuccess: () => {
          console.log('Location saved successfully')
          setIsSaving(false)
          handleCancelEdit()
        },
        onError: (error) => {
          console.error('Failed to save location:', error)
          setIsSaving(false)
        }
      })
    } else {
      console.error('Unknown geometry type for saving:', geometryType)
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setShowSaveButton(false)
    setEditingFeature(null)
    setIsSaving(false)
    setIsEditingMode(false)
    setEditingFeaturePosition(null)
    // Reset the drawing tool
    if (drawRef.current) {
      drawRef.current.changeMode('simple_select')
    }
  }


  const handleDrawingToolChange = (tool: DrawingTool) => {
    console.log('Drawing tool change requested:', tool, 'Current mode:', drawRef.current?.getMode())
    
    if (!isDrawingToolReady || !drawRef.current || !isMapLoaded) {
      console.warn('Drawing tool not ready yet', { isDrawingToolReady, hasDrawRef: !!drawRef.current, isMapLoaded })
      return
    }
    
    setDrawingTool(tool)
    
    // Set active state based on tool
    if (tool === 'none') {
      setIsDrawingToolActive(false)
    } else {
      setIsDrawingToolActive(true)
    }

    try {
      const currentMode = drawRef.current.getMode()
      if (tool !== 'none' && currentMode !== tool) {
        console.log(`Changing draw mode from ${currentMode} to ${tool}`)
        drawRef.current.changeMode(tool as any)
      } else if (tool === 'none' && currentMode !== 'simple_select') {
        drawRef.current.changeMode('simple_select')
      }
    } catch (error) {
      console.error('Error changing drawing mode:', error)
    }
  }

  const handleExport = useCallback(() => {
    if (mapRef.current) {
        exportMapAsPDF(mapRef.current, layers, 'Map Export', 'a4-landscape', true, true, true);
    }
  }, [layers])

  const handlePrint = useCallback(() => {
    // Direct print like the original implementation
    console.log('Print button clicked');
    console.log('Map element for print:', document.getElementById('map'));
    console.log('Map element visible:', document.getElementById('map')?.offsetWidth, 'x', document.getElementById('map')?.offsetHeight);
    window.print()
  }, [])

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
    if (drawRef.current) {
      drawRef.current.deleteAll()
    }
  }

  const handleLocationFormSubmit = (data: any) => {
    const featureToProcess = editingFeature || newPointFeature
    if (featureToProcess) {
      const isNew = 'geometry' in featureToProcess && !featureToProcess.properties?.id
      if (isNew) { // Creating new location
        const newLocation = {
          ...data,
          geom: featureToProcess.geometry,
        }
        createLocationMutation.mutate(newLocation)
      } else { // Editing existing location
        updateLocationMutation.mutate({
          id: featureToProcess.properties.id,
          data: data,
          type: featureToProcess.properties.locationType || 'current',
        })
      }
    }
    setIsLocationModalOpen(false)
    setEditingFeature(null)
    setNewPointFeature(null)
    if (drawRef.current) {
      drawRef.current.deleteAll()
    }
  }

  const handleTerritoriesGenerated = () => {
    // Refresh territories data
    window.location.reload()
  }

  const handleDelete = () => {
    if (drawRef.current) {
      const selectedIds = drawRef.current.getSelectedIds()
      if (selectedIds.length > 0) {
        drawRef.current.trash()
      } else {
        console.warn('Delete clicked, but no feature is selected.')
      }
    }
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 relative" id="map-container-for-export">
        <ProgressIndicator
          progress={operationProgress ?? 0}
          className={operationProgress !== null ? 'opacity-100' : 'opacity-0'}
        />
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
          onTerritoryGenerator={() => setIsTerritoryGeneratorOpen(true)}
          isFeatureSelected={(() => {
            const selected = selectedFeatureIds.length > 0
            console.log('isFeatureSelected calculation:', selected, 'selectedFeatureIds:', selectedFeatureIds)
            return selected
          })()}
          isDrawingToolReady={isDrawingToolReady}
          isEditingMode={isEditingMode}
          onSave={handleSaveFeature}
          onDelete={handleDelete}
          isSaving={isSaving}
          locationDrawType={locationDrawType}
          onLocationDrawTypeChange={setLocationDrawType}
        />
        
        
        {/* Editing mode indicator */}
        {isEditingMode && (
          <div className="absolute top-16 right-4 z-10 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="text-sm font-medium">Editing Mode - Use Save button in toolbar</span>
            </div>
          </div>
        )}
        
        {/* Save/Cancel popup for territory editing */}
        {(() => {
          console.log('🔍 Popup render check:', { showSaveButton, editingFeature: !!editingFeature })
          return showSaveButton && editingFeature
        })() && (
          <>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black bg-opacity-50 z-20" onClick={handleCancelEdit}></div>
            
            {/* Popup positioned beside the edited feature */}
            <div 
              className="absolute z-30 animate-in fade-in-0 zoom-in-95 duration-200"
              style={{
                left: editingFeaturePosition ? `${editingFeaturePosition.x + 20}px` : '50%',
                top: editingFeaturePosition ? `${editingFeaturePosition.y - 50}px` : '50%',
                transform: editingFeaturePosition ? 'none' : 'translate(-50%, -50%)'
              }}
            >
              <div className="bg-white rounded-lg shadow-xl border p-6 min-w-[320px] max-w-[400px]">
                <div className="flex items-center mb-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <h3 className="text-lg font-semibold text-gray-900">Edit Territory</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  You've modified the territory geometry. Would you like to save these changes to the database?
                </p>
                <div className="flex gap-3 justify-end">
                  <Button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    variant="outline"
                    className="px-4"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveFeature}
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700 text-white px-4"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
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
        location={editingFeature || newPointFeature}
        locationType={locationDrawType}
      />
      <PrintComposer
        isOpen={isPrintComposerOpen}
        onOpenChange={setIsPrintComposerOpen}
        map={mapRef.current}
        layers={layers}
      />
      <TerritoryGenerator
        isOpen={isTerritoryGeneratorOpen}
        onOpenChange={setIsTerritoryGeneratorOpen}
        onTerritoriesGenerated={handleTerritoriesGenerated}
      />
    </div>
  )
}