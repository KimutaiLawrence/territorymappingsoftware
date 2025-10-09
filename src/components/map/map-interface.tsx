'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import maplibregl from 'maplibre-gl'
import { MapContainer } from './map-container'
import { MapControls } from './map-controls'
import { TerritoryGenerator } from './territory-generator'
import { JeddahTerritoryGenerator } from './jeddah-territory-generator'
import { GeoJSONImporter } from './geojson-importer'
import { ExportConfigModal } from './export-config-modal'
import { Territory, Location, MapLayer, Basemap, DrawingTool } from '@/types'
import {
  useUSStates,
  useRivers,
  useRoads,
  useMapTerritories,
  useMapCurrentLocations,
  useMapPotentialLocations,
  useMapAdminBoundaries,
  useMapCustomerLocations,
  useMapClusteredCustomerLocations,
} from '@/hooks/use-api'
import { Feature, FeatureCollection, Geometry, Point, MultiPoint, Polygon, MultiPolygon } from 'geojson'
import { BasemapSwitcher } from './basemap-switcher'
import { Legend } from './legend' // Import the new Legend component
import bbox from '@turf/bbox'
import pointsWithinPolygon from '@turf/points-within-polygon'
import * as turf from '@turf/turf'
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
import { 
  useOrganizationCreateTerritory, 
  useOrganizationUpdateTerritory, 
  useOrganizationCreateLocation, 
  useOrganizationUpdateLocation, 
  useOrganizationDeleteTerritory,
  useOrganizationDeleteLocation 
} from '@/hooks/use-organization-api'
import { useLayerOpacitySettings } from '@/hooks/use-layer-opacity'
import { useMapTitle, useSaveMapTitle } from '@/hooks/use-map-title'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PrintComposer } from './print-composer'
import { exportMapAsPDF } from '@/lib/pdf-export'
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query'
import { ProgressIndicator } from '@/components/ui/progress-indicator'
import { useAuth } from '@/contexts/auth-context'
import api from '@/lib/api'

// Utility function to calculate bounding box from features
const calculateBounds = (features: any[]) => {
  if (!features || features.length === 0) return null
  
  const coordinates = features
    .filter(f => f.geometry?.type === 'Point' && f.geometry.coordinates)
    .map(f => f.geometry.coordinates)
  
  if (coordinates.length === 0) return null
  
  const lngs = coordinates.map(coord => coord[0])
  const lats = coordinates.map(coord => coord[1])
  
  return [
    [Math.min(...lngs), Math.min(...lats)], // Southwest
    [Math.max(...lngs), Math.max(...lats)]  // Northeast
  ] as [[number, number], [number, number]]
}

// Utility function to filter admin boundaries for Jeddah region
const filterAdminBoundariesForJeddah = (boundaries: any) => {
  if (!boundaries || !boundaries.features) return boundaries
  
  // Filter to show only Makkah region (which contains Jeddah)
  const jeddahFeatures = boundaries.features.filter((feature: any) => {
    const props = feature.properties || {}
    const name = props.name || props.NAME || ''
    return name.toLowerCase().includes('makkah')
  })
  
  return {
    ...boundaries,
    features: jeddahFeatures
  }
}


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
  const { user } = useAuth()
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
  const [mapZoom, setMapZoom] = useState<number>(10)
  const [showAllAdminBoundaries, setShowAllAdminBoundaries] = useState<boolean>(false)
  const [panelWidth, setPanelWidth] = useState(320) // Default width for map layers panel
  const [isResizing, setIsResizing] = useState(false)
  const [isPanelDragging, setIsPanelDragging] = useState(false)
  const [panelPosition, setPanelPosition] = useState<'left' | 'right' | 'hidden'>('left')

  const queryClient = useQueryClient()
  
  // Use organization-aware hooks
  const createTerritoryMutation = useOrganizationCreateTerritory()
  const updateTerritoryMutation = useOrganizationUpdateTerritory()
  const createLocationMutation = useOrganizationCreateLocation()
  const updateLocationMutation = useOrganizationUpdateLocation()
  const deleteTerritoryMutation = useOrganizationDeleteTerritory()
  const deleteLocationMutation = useOrganizationDeleteLocation()

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
  const { data: roads, isLoading: roadsLoading } = useMapAdminBoundaries()
  
  // Organization-specific data loading
  const userOrg = user?.organization?.name?.toLowerCase()
  
  // For Jeddah users, use fast-data endpoint
  const { data: jeddahFastData, isLoading: jeddahFastDataLoading } = useQuery({
    queryKey: ['jeddah-fast-data'],
    queryFn: async () => {
      const response = await api.get('/api/jeddah/fast-data')
      console.log('Jeddah fast data response:', response.data)
      return response.data
    },
    enabled: userOrg === 'jeddah',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Load layer opacity settings
  const { data: layerOpacitySettings, isLoading: layerOpacityLoading, error: layerOpacityError } = useLayerOpacitySettings()
  
  // Debug layer opacity settings
  console.log('🔧 Layer opacity settings:', { layerOpacitySettings, layerOpacityLoading, layerOpacityError })
  
  // For other users, use regular endpoints (only if not Jeddah)
  const { data: adminBoundaries, isLoading: adminBoundariesLoading } = useQuery({
    queryKey: ['map-admin-boundaries'],
    queryFn: async () => {
      const response = await api.get('/api/gisdata/administrative?format=geojson&per_page=20')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    enabled: userOrg !== 'jeddah' && userOrg !== 'urimpact',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
  // For Urimpact users, use Urimpact-specific endpoints
  const { data: urimpactAdminBoundaries, isLoading: urimpactAdminBoundariesLoading } = useQuery({
    queryKey: ['urimpact-admin-boundaries'],
    queryFn: async () => {
      const response = await api.get('/api/urimpact/admin-boundaries')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    enabled: userOrg === 'urimpact',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
  
  // Urimpact imported GeoJSON data
  const [urimpactImportedGeoJSON, setUrimpactImportedGeoJSON] = useState<FeatureCollection | null>(null)
  const [isGeoJSONImporterOpen, setIsGeoJSONImporterOpen] = useState(false)
  const [isExportConfigOpen, setIsExportConfigOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'export' | 'print'>('export')
  const [mapTitle, setMapTitle] = useState('Map')
  const [titlePosition, setTitlePosition] = useState({ x: 0, y: 20 }) // Positioned to cover toolbar line
  const [isDraggingTitle, setIsDraggingTitle] = useState(false)
  const [titleDragStart, setTitleDragStart] = useState({ x: 0, y: 0 })
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  
  // Map title hooks
  const { data: savedTitle } = useMapTitle()
  const saveMapTitleMutation = useSaveMapTitle()
  
  // Organization-specific default titles
  const getDefaultTitle = (orgName: string) => {
    switch (orgName?.toLowerCase()) {
      case 'urimpact':
        return 'Tree Planting Potential - Majmaah University'
      case 'jeddah':
        return 'Jeddah Territory Management'
      case 'hooptrailer':
        return 'HoopTrailer Territory Management'
      default:
        return 'Map'
    }
  }
  const [treeIconsLoaded, setTreeIconsLoaded] = useState(false)
  const [carbonData, setCarbonData] = useState<{
    totalTrees: number
    carbonSequestration: number
    area: number
  } | null>(null)
  const [carbonPanelPosition, setCarbonPanelPosition] = useState({ x: 20, y: 300 })
  const [isDraggingCarbon, setIsDraggingCarbon] = useState(false)
  const [carbonDragStart, setCarbonDragStart] = useState({ x: 0, y: 0 })
  
  // Load tree icon and generate tree distribution
  const loadTreeIcon = useCallback(async () => {
    if (!mapRef.current || treeIconsLoaded) return

    try {
      // Create a simple tree icon using canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = 24
      canvas.height = 24
      
      if (ctx) {
        // Draw a simple tree shape
        ctx.fillStyle = '#22c55e' // Green color
        ctx.beginPath()
        // Tree trunk
        ctx.fillRect(10, 16, 4, 8)
        // Tree canopy (triangle)
        ctx.moveTo(12, 4)
        ctx.lineTo(4, 16)
        ctx.lineTo(20, 16)
        ctx.closePath()
        ctx.fill()
        
        // Add some texture
        ctx.fillStyle = '#16a34a'
        ctx.beginPath()
        ctx.moveTo(12, 6)
        ctx.lineTo(6, 14)
        ctx.lineTo(18, 14)
        ctx.closePath()
        ctx.fill()
      }
      
      // Convert canvas to image data
      const imageData = canvas.toDataURL()
      const image = await mapRef.current.loadImage(imageData)
      
      // Check if image already exists before adding
      if (!mapRef.current.hasImage('tree-icon')) {
        mapRef.current.addImage('tree-icon', image.data)
        console.log('✅ Tree icon created and loaded successfully')
      } else {
        console.log('✅ Tree icon already exists, skipping')
      }
      setTreeIconsLoaded(true)
    } catch (error) {
      console.error('❌ Error creating tree icon:', error)
    }
  }, [treeIconsLoaded])

  // Generate tree distribution within polygons
  const generateTreeDistribution = useCallback((geojson: FeatureCollection) => {
    console.log('🌳 Starting tree generation...', { 
      mapExists: !!mapRef.current, 
      treeIconsLoaded, 
      featuresCount: geojson.features.length 
    })
    
    if (!mapRef.current) {
      console.error('❌ Map not available for tree generation')
      return
    }
    
    if (!treeIconsLoaded) {
      console.warn('⚠️ Tree icons not loaded yet, will use circle fallback')
    }

    const treeFeatures: any[] = []
    let totalArea = 0
    let totalTrees = 0

    geojson.features.forEach((feature, index) => {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        // Calculate area using turf
        const area = turf.area(feature)
        totalArea += area
        
        // Generate trees based on area (1 tree per 100 square meters)
        const treesPerHectare = 100 // 100 trees per hectare
        const treesInArea = Math.floor((area / 10000) * treesPerHectare) // Convert to hectares
        totalTrees += treesInArea
        
        console.log(`🌳 Area ${index + 1}: ${(area / 10000).toFixed(2)} hectares, ${treesInArea} trees`)

        // Generate random points within the polygon
        const bbox = turf.bbox(feature)
        const attempts = treesInArea * 3 // Try 3x the number of trees to get good distribution
        
        let treesGenerated = 0
        for (let i = 0; i < attempts && treesGenerated < treesInArea; i++) {
          const randomPoint = turf.randomPoint(1, {
            bbox: bbox
          })
          
          if (turf.booleanPointInPolygon(randomPoint.features[0], feature)) {
            treeFeatures.push({
              type: 'Feature',
              geometry: randomPoint.features[0].geometry,
              properties: {
                id: `tree-${index}-${i}`,
                zone: feature.properties?.zone_name || `Planting Area ${index + 1}`,
                carbonPerYear: 22 // kg CO2 per tree per year
              }
            })
            treesGenerated++
          }
        }
        console.log(`🌳 Generated ${treesGenerated} trees for area ${index + 1}`)
      }
    })

    // Calculate carbon sequestration (22 kg CO2 per tree per year)
    const carbonSequestration = totalTrees * 22

    setCarbonData({
      totalTrees,
      carbonSequestration,
      area: totalArea / 10000 // Convert to hectares
    })

    // Clean up existing tree layer and source
    if (mapRef.current.getLayer('trees')) {
      mapRef.current.removeLayer('trees')
    }
    if (mapRef.current.getSource('trees')) {
      mapRef.current.removeSource('trees')
    }

    mapRef.current.addSource('trees', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: treeFeatures
      }
    })

    // Add tree layer with fallback to circles if icon fails
    if (mapRef.current.hasImage('tree-icon')) {
      mapRef.current.addLayer({
        id: 'trees',
        type: 'symbol',
        source: 'trees',
        layout: {
          'icon-image': 'tree-icon',
          'icon-size': 0.5, // Increased size for better visibility
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      })
      console.log('✅ Added tree layer with icons')
    } else {
      // Fallback to circle markers
      mapRef.current.addLayer({
        id: 'trees',
        type: 'circle',
        source: 'trees',
        paint: {
          'circle-color': '#22c55e',
          'circle-radius': 4, // Increased size for better visibility
          'circle-stroke-color': '#16a34a',
          'circle-stroke-width': 2
        }
      })
      console.log('✅ Added tree layer with circles (fallback)')
    }

    console.log(`✅ Generated ${totalTrees} trees across ${geojson.features.length} planting areas`)
  }, [treeIconsLoaded])

  // Load map.geojson data for Urimpact users
  useEffect(() => {
    if (userOrg === 'urimpact' && !urimpactImportedGeoJSON) {
      console.log('🌱 Loading Urimpact map.geojson data...')
      // Load the map.geojson data
      fetch('/api/urimpact/map-geojson')
        .then(response => {
          console.log('🌱 Map.geojson response status:', response.status)
          return response.json()
        })
        .then(data => {
          console.log('🌱 Map.geojson raw data:', data)
          if (data && data.type === 'FeatureCollection') {
            setUrimpactImportedGeoJSON(data)
            console.log('✅ Loaded Urimpact map.geojson data:', data)
            console.log('✅ Features count:', data.features.length)
            
            // Load tree icon and generate tree distribution
            console.log('🌳 Loading tree icon and generating distribution...')
            loadTreeIcon().then(() => {
              console.log('🌳 Tree icon loaded, generating distribution...')
              generateTreeDistribution(data)
            }).catch(error => {
              console.error('❌ Error loading tree icon:', error)
              // Still try to generate trees with fallback
              generateTreeDistribution(data)
            })
          }
        })
        .catch(error => {
          console.error('❌ Failed to load Urimpact map.geojson:', error)
        })
    }
  }, [userOrg, urimpactImportedGeoJSON, loadTreeIcon, generateTreeDistribution])

  // Cleanup tree icon on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current && mapRef.current.hasImage('tree-icon')) {
        try {
          mapRef.current.removeImage('tree-icon')
        } catch (error) {
          console.warn('⚠️ Could not remove tree icon:', error)
        }
      }
    }
  }, [])

  // Carbon panel drag handlers
  const handleCarbonMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingCarbon(true)
    setCarbonDragStart({
      x: e.clientX - carbonPanelPosition.x,
      y: e.clientY - carbonPanelPosition.y
    })
  }, [carbonPanelPosition])

  const handleCarbonMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingCarbon) {
      setCarbonPanelPosition({
        x: e.clientX - carbonDragStart.x,
        y: e.clientY - carbonDragStart.y
      })
    }
  }, [isDraggingCarbon, carbonDragStart])

  const handleCarbonMouseUp = useCallback(() => {
    setIsDraggingCarbon(false)
  }, [])

  useEffect(() => {
    if (isDraggingCarbon) {
      document.addEventListener('mousemove', handleCarbonMouseMove)
      document.addEventListener('mouseup', handleCarbonMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleCarbonMouseMove)
        document.removeEventListener('mouseup', handleCarbonMouseUp)
      }
    }
  }, [isDraggingCarbon, handleCarbonMouseMove, handleCarbonMouseUp])

  // Title drag handlers
  const handleTitleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingTitle(true)
    setTitleDragStart({
      x: e.clientX - titlePosition.x,
      y: e.clientY - titlePosition.y
    })
  }, [titlePosition])

  const handleTitleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingTitle) {
      setTitlePosition({
        x: e.clientX - titleDragStart.x,
        y: e.clientY - titleDragStart.y
      })
    }
  }, [isDraggingTitle, titleDragStart])

  const handleTitleMouseUp = useCallback(() => {
    setIsDraggingTitle(false)
  }, [])

  useEffect(() => {
    if (isDraggingTitle) {
      document.addEventListener('mousemove', handleTitleMouseMove)
      document.addEventListener('mouseup', handleTitleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleTitleMouseMove)
        document.removeEventListener('mouseup', handleTitleMouseUp)
      }
    }
  }, [isDraggingTitle, handleTitleMouseMove, handleTitleMouseUp])

  // Load saved title or set organization default
  useEffect(() => {
    if (savedTitle && savedTitle !== mapTitle) {
      setMapTitle(savedTitle)
    } else if (!savedTitle && user?.organization?.name) {
      const defaultTitle = getDefaultTitle(user.organization.name)
      if (mapTitle === 'Map' && defaultTitle !== 'Map') {
        setMapTitle(defaultTitle)
      }
    }
  }, [savedTitle, user?.organization?.name, mapTitle, getDefaultTitle])

  // Auto-save title with debounce (only when not editing)
  useEffect(() => {
    if (userOrg === 'urimpact' && mapTitle && mapTitle !== getDefaultTitle('urimpact') && !isEditingTitle) {
      const timeoutId = setTimeout(() => {
        saveMapTitleMutation.mutate(mapTitle)
      }, 2000) // Save after 2 seconds of no changes
      
      return () => clearTimeout(timeoutId)
    }
  }, [mapTitle, userOrg, saveMapTitleMutation, isEditingTitle, getDefaultTitle])

  // Handle title editing
  const handleTitleDoubleClick = useCallback(() => {
    setIsEditingTitle(true)
  }, [])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false)
      // Save immediately on Enter
      if (userOrg === 'urimpact' && mapTitle) {
        saveMapTitleMutation.mutate(mapTitle)
      }
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      // Revert to saved title
      if (savedTitle) {
        setMapTitle(savedTitle)
      }
    }
  }, [mapTitle, userOrg, saveMapTitleMutation, savedTitle])

  const handleTitleBlur = useCallback(() => {
    setIsEditingTitle(false)
    // Auto-save on blur
    if (userOrg === 'urimpact' && mapTitle) {
      saveMapTitleMutation.mutate(mapTitle)
    }
  }, [mapTitle, userOrg, saveMapTitleMutation])
  
  // Urimpact CRUD operations
  const createUrimpactAdminBoundary = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/urimpact/admin-boundaries', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-admin-boundaries'] })
    },
  })
  
  const updateUrimpactAdminBoundary = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/urimpact/admin-boundaries/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-admin-boundaries'] })
    },
  })
  
  const deleteUrimpactAdminBoundary = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/urimpact/admin-boundaries/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-admin-boundaries'] })
    },
  })
  
  // Urimpact Territory CRUD operations
  const createUrimpactTerritory = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/urimpact/territories', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-territories'] })
    },
  })
  
  const updateUrimpactTerritory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/urimpact/territories/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-territories'] })
    },
  })
  
  const deleteUrimpactTerritory = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/urimpact/territories/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-territories'] })
    },
  })
  
  // Urimpact Location CRUD operations
  const createUrimpactLocation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/api/urimpact/locations', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-locations'] })
    },
  })
  
  const updateUrimpactLocation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/api/urimpact/locations/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-locations'] })
    },
  })
  
  const deleteUrimpactLocation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/urimpact/locations/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['urimpact-locations'] })
    },
  })
  
  // Handle GeoJSON import
  const handleImportGeoJSON = (geojson: FeatureCollection) => {
    setUrimpactImportedGeoJSON(geojson)
    console.log('✅ Imported GeoJSON:', geojson)
    
    // Fly to the imported GeoJSON bounds
    if (geojson.features.length > 0) {
      try {
        const bounds = bbox(geojson)
        const map = mapRef.current
        if (map) {
          map.fitBounds([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
          ] as [[number, number], [number, number]], {
            padding: 50,
            duration: 1000
          })
        }
      } catch (error) {
        console.error('Error calculating bounds for imported GeoJSON:', error)
      }
    }
  }
  
  const { data: customerLocations, isLoading: customerLocationsLoading } = useQuery({
    queryKey: ['map-customer-locations'],
    queryFn: async () => {
      const response = await api.get('/api/gisdata/customer-locations?format=geojson&per_page=20')
      return response.data || { type: 'FeatureCollection', features: [] }
    },
    enabled: userOrg !== 'jeddah',
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  // Organization-specific layer configuration
  const layersConfig = useMemo(() => {
    const userOrg = user?.organization?.name?.toLowerCase()
    
    // Helper function to get opacity from saved settings or use default
    const getOpacity = (layerId: string, defaultOpacity: number) => {
      console.log(`🔧 Getting opacity for ${layerId}:`, {
        layerOpacitySettings,
        hasSettings: !!layerOpacitySettings,
        hasLayerSetting: !!(layerOpacitySettings && layerOpacitySettings[layerId]),
        layerSetting: layerOpacitySettings?.[layerId],
        defaultOpacity
      })
      
      if (layerOpacitySettings && layerOpacitySettings[layerId]) {
        const savedOpacity = layerOpacitySettings[layerId].opacity
        console.log(`✅ Using saved opacity for ${layerId}: ${savedOpacity}`)
        return savedOpacity
      }
      console.log(`📝 Using default opacity for ${layerId}: ${defaultOpacity}`)
      return defaultOpacity
    }

    // Helper function to get color from saved settings or use default
    const getColor = (layerId: string, defaultColor: string) => {
      if (layerOpacitySettings && layerOpacitySettings[layerId]?.color) {
        const savedColor = layerOpacitySettings[layerId].color
        console.log(`✅ Using saved color for ${layerId}: ${savedColor}`)
        return savedColor
      }
      console.log(`📝 Using default color for ${layerId}: ${defaultColor}`)
      return defaultColor
    }
    
    if (userOrg === 'jeddah') {
      // Jeddah organization - show only Saudi Arabia data
      return [
        { id: 'territories', name: 'Territories', type: 'territories', visible: true, opacity: getOpacity('territories', 0.5), color: getColor('territories', '#3b82f6') },
        { id: 'admin-boundaries', name: 'Administrative Boundaries', type: 'admin-boundaries', visible: true, opacity: getOpacity('admin-boundaries', 0.1), color: getColor('admin-boundaries', '#3b82f6') },
        { id: 'customer-locations', name: 'Customer Locations', type: 'customer-locations', visible: true, opacity: getOpacity('customer-locations', 1), color: getColor('customer-locations', '#ef4444') },
      ]
    } else if (userOrg === 'urimpact') {
      // Urimpact organization - show Saudi Arabia boundary data and imported GeoJSON
      const layers = [
        { id: 'admin-boundaries', name: 'Saudi Arabia Boundaries', type: 'admin-boundaries', visible: true, opacity: getOpacity('admin-boundaries', 0.8), color: getColor('admin-boundaries', '#3b82f6') },
      ]
      
      // Check if we have planting areas data and if there are 7 or fewer features
      if (urimpactImportedGeoJSON && urimpactImportedGeoJSON.features.length > 0) {
        if (urimpactImportedGeoJSON.features.length <= 7) {
          // Show individual planting areas
          urimpactImportedGeoJSON.features.forEach((feature, index) => {
            const zoneName = feature.properties?.zone_name || feature.properties?.name || `Planting Area ${index + 1}`
            layers.push({
              id: `planting-area-${index}`,
              name: zoneName,
              type: 'imported-geojson',
              visible: true,
              opacity: getOpacity(`planting-area-${index}`, 0.7),
              color: getColor(`planting-area-${index}`, feature.properties?.color || '#8b5cf6'),
              data: { type: 'FeatureCollection', features: [feature] } as any
            })
          })
        } else {
          // Show as single layer for more than 7 features
          layers.push({
            id: 'imported-geojson',
            name: 'Planting Areas',
            type: 'imported-geojson',
            visible: true,
            opacity: getOpacity('imported-geojson', 0.7),
            color: getColor('imported-geojson', '#8b5cf6')
          })
        }
      }
      
      return layers
    } else if (userOrg === 'hooptrailer') {
      // Hooptrailer organization - show only US data
      return [
        { id: 'territories', name: 'Territories', type: 'territories', visible: true, opacity: getOpacity('territories', 0.5), color: getColor('territories', '#3b82f6') },
        { id: 'current-locations', name: 'Current Locations', type: 'current-locations', visible: true, opacity: getOpacity('current-locations', 1), color: getColor('current-locations', '#22c55e') },
        { id: 'potential-locations', name: 'Potential Locations', type: 'potential-locations', visible: true, opacity: getOpacity('potential-locations', 1), color: getColor('potential-locations', '#f59e0b') },
        { id: 'us-states', name: 'US States', type: 'us-states', visible: true, opacity: getOpacity('us-states', 0.2), color: getColor('us-states', '#8b5cf6') },
        { id: 'rivers', name: 'Rivers', type: 'rivers', visible: false, opacity: getOpacity('rivers', 1), color: getColor('rivers', '#06b6d4') },
        { id: 'population-analysis', name: 'Population Analysis', type: 'population-analysis', visible: false, opacity: getOpacity('population-analysis', 0.7), color: getColor('population-analysis', '#ec4899') },
        { id: 'expansion-analysis', name: 'Expansion Analysis', type: 'expansion-analysis', visible: false, opacity: getOpacity('expansion-analysis', 0.7), color: getColor('expansion-analysis', '#f43f5e') },
      ]
    } else {
      // Superadmin or unknown - show all layers
      return [
        { id: 'territories', name: 'Territories', type: 'territories', visible: true, opacity: getOpacity('territories', 0.5), color: getColor('territories', '#3b82f6') },
        { id: 'current-locations', name: 'Current Locations', type: 'current-locations', visible: true, opacity: getOpacity('current-locations', 1), color: getColor('current-locations', '#22c55e') },
        { id: 'potential-locations', name: 'Potential Locations', type: 'potential-locations', visible: true, opacity: getOpacity('potential-locations', 1), color: getColor('potential-locations', '#f59e0b') },
        { id: 'us-states', name: 'US States', type: 'us-states', visible: true, opacity: getOpacity('us-states', 0.2), color: getColor('us-states', '#8b5cf6') },
        { id: 'admin-boundaries', name: 'Administrative Boundaries', type: 'admin-boundaries', visible: true, opacity: getOpacity('admin-boundaries', 0.6), color: getColor('admin-boundaries', '#3b82f6') },
        { id: 'customer-locations', name: 'Customer Locations', type: 'customer-locations', visible: true, opacity: getOpacity('customer-locations', 1), color: getColor('customer-locations', '#ef4444') },
        { id: 'population-analysis', name: 'Population Analysis', type: 'population-analysis', visible: false, opacity: getOpacity('population-analysis', 0.7), color: getColor('population-analysis', '#ec4899') },
        { id: 'expansion-analysis', name: 'Expansion Analysis', type: 'expansion-analysis', visible: false, opacity: getOpacity('expansion-analysis', 0.7), color: getColor('expansion-analysis', '#f43f5e') },
        { id: 'rivers', name: 'Rivers', type: 'rivers', visible: false, opacity: getOpacity('rivers', 1), color: getColor('rivers', '#06b6d4') },
      ]
    }
  }, [user?.organization?.name, layerOpacitySettings])

  const [layersConfigState, setLayersConfigState] = useState(layersConfig)

  // Update layersConfigState when user organization changes
  useEffect(() => {
    setLayersConfigState(layersConfig)
  }, [layersConfig])

  // Organization-specific loading logic
  const isLoading = useMemo(() => {
    const userOrg = user?.organization?.name?.toLowerCase()
    
    if (userOrg === 'jeddah') {
      // For Jeddah users, only check relevant data sources
      return territoriesLoading || jeddahFastDataLoading
    } else if (userOrg === 'hooptrailer') {
      // For Hooptrailer users, check US-specific data
      return territoriesLoading || currentLocationsLoading || potentialLocationsLoading || usStatesLoading
    } else {
      // For superadmin or unknown, check all data sources
      return territoriesLoading ||
        currentLocationsLoading ||
        potentialLocationsLoading ||
        usStatesLoading ||
        riversLoading ||
        roadsLoading ||
        adminBoundariesLoading ||
        customerLocationsLoading
    }
  }, [
    user?.organization?.name,
    territoriesLoading,
    currentLocationsLoading,
    potentialLocationsLoading,
    usStatesLoading,
    riversLoading,
    roadsLoading,
    adminBoundariesLoading,
    customerLocationsLoading,
    jeddahFastDataLoading
  ])

  // Organization-specific processing logic
  const isProcessing = useMemo(() => {
    const userOrg = user?.organization?.name?.toLowerCase()
    
    if (userOrg === 'jeddah') {
      // For Jeddah users, only check relevant mutations and fetching
      return createTerritoryMutation.isPending ||
        updateTerritoryMutation.isPending ||
        deleteTerritoryMutation.isPending ||
        territoriesFetching ||
        jeddahFastDataLoading
    } else if (userOrg === 'hooptrailer') {
      // For Hooptrailer users, check US-specific mutations and fetching
      return createTerritoryMutation.isPending ||
        updateTerritoryMutation.isPending ||
        deleteTerritoryMutation.isPending ||
        createLocationMutation.isPending ||
        updateLocationMutation.isPending ||
        territoriesFetching ||
        currentLocationsFetching ||
        potentialLocationsFetching
    } else {
      // For superadmin or unknown, check all mutations and fetching
      return createTerritoryMutation.isPending ||
        updateTerritoryMutation.isPending ||
        deleteTerritoryMutation.isPending ||
        createLocationMutation.isPending ||
        updateLocationMutation.isPending ||
        territoriesFetching ||
        currentLocationsFetching ||
        potentialLocationsFetching
    }
  }, [
    user?.organization?.name,
    createTerritoryMutation.isPending,
    updateTerritoryMutation.isPending,
    deleteTerritoryMutation.isPending,
    createLocationMutation.isPending,
    updateLocationMutation.isPending,
    territoriesFetching,
    currentLocationsFetching,
    potentialLocationsFetching,
    adminBoundariesLoading,
    customerLocationsLoading,
    jeddahFastDataLoading
  ])

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
    console.log(`🔧 Layers array being recalculated with config:`, layersConfigState.map(l => ({ id: l.id, opacity: l.opacity })))
    
    const result = layersConfigState.map(layer => {
      let data: FeatureCollection = { type: 'FeatureCollection', features: [] }
      
      // For Jeddah users, use fast data
      if (userOrg === 'jeddah' && jeddahFastData) {
        console.log(`Loading Jeddah data for layer: ${layer.id}`)
        switch (layer.id) {
          case 'territories':
            data = territories as FeatureCollection || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            break
          case 'admin-boundaries':
            const allBoundaries = jeddahFastData.boundaries || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            // Filter to Jeddah region by default, or show all if toggle is on
            data = showAllAdminBoundaries ? allBoundaries : filterAdminBoundariesForJeddah(allBoundaries)
            console.log(`Admin boundaries data (filtered: ${!showAllAdminBoundaries}):`, data)
            break
          case 'customer-locations':
            data = jeddahFastData.customers || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            console.log(`Customer locations data:`, data)
            break
        }
      } else if (userOrg === 'urimpact') {
        // For Urimpact users, use Saudi Arabia boundary data and imported GeoJSON
        console.log(`Loading Urimpact data for layer: ${layer.id}`)
        switch (layer.id) {
          case 'admin-boundaries':
            data = (urimpactAdminBoundaries as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            console.log(`Urimpact admin boundaries data:`, data)
            break
          case 'imported-geojson':
            data = urimpactImportedGeoJSON || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            console.log(`Urimpact imported GeoJSON data:`, data)
            break
          default:
            // Handle individual planting areas (planting-area-0, planting-area-1, etc.)
            if (layer.id.startsWith('planting-area-')) {
              data = layer.data || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
              console.log(`Urimpact individual planting area data for ${layer.id}:`, data)
            }
            break
        }
      } else {
        // For other users, use regular data sources
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
          case 'admin-boundaries':
            data = (adminBoundaries as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            break
          case 'customer-locations':
            data = (customerLocations as FeatureCollection) || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            break
          case 'population-analysis':
            data = populationAnalysisLayer || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            break
          case 'expansion-analysis':
            data = expansionAnalysisLayer || ({ type: 'FeatureCollection', features: [] } as FeatureCollection)
            break
        }
      }
      return { ...layer, data, type: layer.type as MapLayer['type'] }
    })
    
    console.log(`🔧 Final layers array:`, result.map(l => ({ id: l.id, opacity: l.opacity })))
    return result
  }, [
    layersConfigState,
    userOrg,
    jeddahFastData,
    showAllAdminBoundaries,
    territories,
    currentLocations,
    potentialLocations,
    usStates,
    rivers,
    roads,
    adminBoundaries,
    urimpactAdminBoundaries,
    urimpactImportedGeoJSON,
    customerLocations,
    populationAnalysisLayer,
    expansionAnalysisLayer,
  ])

  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map
    setIsMapLoaded(true)
    console.log('Map loaded, ready for drawing tool initialization')
    
    // Add zoom listener for clustering
    map.on('zoom', () => {
      setMapZoom(Math.floor(map.getZoom()))
    })
  }, [])

  const fitToCustomerLocations = useCallback(() => {
    const map = mapRef.current
    if (!map || userOrg !== 'jeddah') return
    
    if (jeddahFastData?.customers?.features?.length > 0) {
      const bounds = calculateBounds(jeddahFastData.customers.features)
      
      if (bounds) {
        map.fitBounds(bounds, {
          padding: 50, // Add some padding around the bounds
          maxZoom: 15, // Don't zoom in too much
          duration: 1000
        })
        return true
      }
    }
    return false
  }, [userOrg, jeddahFastData])

  const flyToDefaultView = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    
    const userOrg = user?.organization?.name?.toLowerCase()
    
    if (userOrg === 'jeddah') {
      // For Jeddah users, try to fit to customer locations first
      if (!fitToCustomerLocations()) {
        // Fallback to Saudi Arabia center if no customer data
        map.flyTo({
          center: [45.0, 24.0], // Center of Saudi Arabia
          zoom: 6,
          duration: 1000,
        })
      }
    } else if (userOrg === 'urimpact') {
      // For Urimpact users, try to fit to planting areas first
      if (urimpactImportedGeoJSON && urimpactImportedGeoJSON.features.length > 0) {
        try {
          // Calculate bounds of all planting areas
          const bounds = bbox(urimpactImportedGeoJSON)
          map.fitBounds([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
          ], {
            padding: 100,
            maxZoom: 16,
            duration: 1000
          })
          console.log('✅ Flying to Urimpact planting areas:', bounds)
        } catch (error) {
          console.error('❌ Error fitting to planting areas:', error)
          // Fallback to Saudi Arabia center
          map.flyTo({
            center: [45.0, 24.0], // Center of Saudi Arabia
            zoom: 5,
            duration: 1000,
          })
        }
      } else {
        // Fallback to Saudi Arabia center if no planting areas data
        map.flyTo({
          center: [45.0, 24.0], // Center of Saudi Arabia
          zoom: 5,
          duration: 1000,
        })
      }
    } else if (userOrg === 'hooptrailer') {
      // Center on USA
      map.flyTo({
        center: [-98.5795, 39.8283], // Central US coordinates
        zoom: 3, // Zoom level to show continental US
        duration: 1000,
      })
    } else {
      // Default center for superadmin
      map.flyTo({
        center: [-98.5795, 39.8283], // Central US coordinates
        zoom: 3, // Zoom level to show continental US
        duration: 1000,
      })
    }
  }, [user?.organization?.name, fitToCustomerLocations, urimpactImportedGeoJSON])

  // Auto-center map when user organization changes
  useEffect(() => {
    if (isMapLoaded && user?.organization?.name) {
      // Small delay to ensure map is fully loaded
      const timer = setTimeout(() => {
        flyToDefaultView()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isMapLoaded, user?.organization?.name, flyToDefaultView])

  // Auto-fit to customer locations when Jeddah data loads
  useEffect(() => {
    if (isMapLoaded && userOrg === 'jeddah' && jeddahFastData?.customers?.features?.length > 0) {
      const timer = setTimeout(() => {
        fitToCustomerLocations()
      }, 1000) // Wait a bit for data to be processed
      return () => clearTimeout(timer)
    }
  }, [isMapLoaded, userOrg, jeddahFastData, fitToCustomerLocations])

  // Auto-fit to planting areas when Urimpact data loads (only once)
  useEffect(() => {
    if (isMapLoaded && userOrg === 'urimpact' && urimpactImportedGeoJSON?.features?.length > 0) {
      const timer = setTimeout(() => {
        const map = mapRef.current
        if (!map) return
        
        try {
          // Calculate bounds of all planting areas
          const bounds = bbox(urimpactImportedGeoJSON)
          map.fitBounds([
            [bounds[0], bounds[1]],
            [bounds[2], bounds[3]]
          ], {
            padding: 100,
            maxZoom: 16,
            duration: 1000
          })
          console.log('✅ Flying to Urimpact planting areas:', bounds)
        } catch (error) {
          console.error('❌ Error fitting to planting areas:', error)
          // Fallback to Saudi Arabia center
          map.flyTo({
            center: [45.0, 24.0], // Center of Saudi Arabia
            zoom: 5,
            duration: 1000,
          })
        }
      }, 1000) // Wait a bit for data to be processed
      return () => clearTimeout(timer)
    }
  }, [isMapLoaded, userOrg, urimpactImportedGeoJSON?.features?.length]) // Remove flyToDefaultView from dependencies

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
                name: (location as any).name || (location.properties as any)?.name || `Location ${index + 1}`,
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
      console.log('🔍 addDataLayers called with layers:', layers.map(l => ({ id: l.id, type: l.type, visible: l.visible, dataLength: l.data?.features?.length || 0 })))
      layers.forEach(layer => {
        const sourceId = `${layer.id}-source`
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource

        console.log(`🔍 Processing layer ${layer.id}:`, {
          hasSource: !!source,
          hasData: !!(layer.data && layer.data.features.length > 0),
          dataLength: layer.data?.features?.length || 0,
          visible: layer.visible,
          type: layer.type
        })

        if (!source) {
          if (layer.data && layer.data.features.length > 0) {
            // Enable clustering for customer locations
            if (layer.type === 'customer-locations') {
              map.addSource(sourceId, { 
                type: 'geojson', 
                data: layer.data,
                cluster: true,
                clusterMaxZoom: 16,  // Show individual points at zoom 16+
                clusterRadius: 25    // Much smaller radius for less aggressive clustering
              })
            } else {
              map.addSource(sourceId, { type: 'geojson', data: layer.data })
            }
          }
        } else {
          if (layer.data) {
            source.setData(layer.data)
          }
        }

        // Ensure layer doesn't already exist
        console.log(`🔍 Checking layer ${layer.id}: exists=${!!map.getLayer(layer.id)}, hasData=${!!(layer.data && layer.data.features.length > 0)}`)
        console.log(`🔍 Layer ${layer.id} opacity: ${layer.opacity}`)
        if (layer.data && layer.data.features.length > 0 && !map.getLayer(layer.id)) {
            console.log(`🔧 Creating new layer: ${layer.id}`)
            if (layer.type === 'territories') {
                console.log(`Creating territories layer with individual territory styling`)
                console.log(`Territory data sample:`, layer.data?.features?.[0]?.properties)
                
                // Create fill layer with individual territory colors
                map.addLayer({ 
                    id: layer.id, 
                    type: 'fill', 
                    source: sourceId, 
                    paint: { 
                        'fill-color': [
                            'case',
                            ['has', 'color'],
                            ['get', 'color'],
                            '#3b82f6'  // Fallback blue color
                        ],
                        'fill-opacity': [
                            'case',
                            ['has', 'opacity'],
                            ['get', 'opacity'],
                            0.7  // Fallback opacity
                        ]
                    },
                    filter: ['==', ['get', 'is_visible'], true]  // Only show visible territories
                })
                
                console.log(`✅ Territories layer created with individual colors`)
                
                // Create outline layer with individual territory stroke colors
                map.addLayer({ 
                    id: `${layer.id}-outline`, 
                    type: 'line', 
                    source: sourceId, 
                    paint: { 
                        'line-color': [
                            'case',
                            ['has', 'stroke_color'],
                            ['get', 'stroke_color'],
                            '#ffffff'  // Fallback white stroke
                        ],
                        'line-width': [
                            'case',
                            ['has', 'stroke_width'],
                            ['get', 'stroke_width'],
                            2.0  // Fallback stroke width
                        ],
                        'line-opacity': [
                            'case',
                            ['has', 'opacity'],
                            ['get', 'opacity'],
                            0.7  // Fallback opacity
                        ]
                    },
                    filter: ['==', ['get', 'is_visible'], true]  // Only show visible territories
                })
                
                // Skip territory labels due to text rendering issues
                console.log('ℹ️ Skipping territory labels due to map style limitations')
            } else if (layer.type === 'current-locations') {
                map.addLayer({ id: layer.id, type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': layer.color || '#22c55e', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': layer.opacity, 'circle-stroke-opacity': layer.opacity } })
            } else if (layer.type === 'potential-locations') {
                map.addLayer({ id: layer.id, type: 'circle', source: sourceId, paint: { 'circle-radius': 6, 'circle-color': layer.color || '#f59e0b', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff', 'circle-opacity': layer.opacity, 'circle-stroke-opacity': layer.opacity } })
            } else if (layer.type === 'us-states') {
                console.log(`Creating us-states layer with opacity: ${layer.opacity}, color: ${layer.color}`)
                map.addLayer({ id: layer.id, type: 'fill', source: sourceId, paint: { 'fill-color': layer.color || '#8b5cf6', 'fill-opacity': layer.opacity } })
                map.addLayer({ id: `${layer.id}-outline`, type: 'line', source: sourceId, paint: { 'line-color': layer.color || '#8b5cf6', 'line-width': 1, 'line-opacity': layer.opacity } })
            } else if (layer.type === 'admin-boundaries') {
                console.log(`🔧 Creating admin-boundaries layer with opacity: ${layer.opacity}, color: ${layer.color}`)
                map.addLayer({ id: layer.id, type: 'fill', source: sourceId, paint: { 'fill-color': layer.color || '#3b82f6', 'fill-opacity': layer.opacity } })
                map.addLayer({ id: `${layer.id}-outline`, type: 'line', source: sourceId, paint: { 'line-color': layer.color || '#1e40af', 'line-width': 2, 'line-opacity': layer.opacity } })
                console.log(`✅ Created admin-boundaries layer with fill-opacity: ${layer.opacity}`)
                console.log(`✅ Created admin-boundaries-outline layer with line-opacity: ${layer.opacity}`)
            } else if (layer.type === 'customer-locations') {
                console.log(`Creating customer-locations layer with opacity: ${layer.opacity}, color: ${layer.color}`)
                
                // Add clustering for customer locations
                map.addLayer({
                    id: `${layer.id}-clusters`,
                    type: 'circle',
                    source: sourceId,
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': [
                            'step',
                            ['get', 'point_count'],
                            '#51bbd6',  // Blue for small clusters
                            10,         // Switch to yellow at 10 points
                            '#f1f075',  // Yellow for medium clusters
                            50,         // Switch to pink at 50 points
                            '#f28cb1'   // Pink for large clusters
                        ],
                        'circle-radius': [
                            'step',
                            ['get', 'point_count'],
                            15,  // radius for small clusters
                            10,  // Switch size at 10 points
                            20,  // radius for medium clusters
                            50,  // Switch size at 50 points
                            25   // radius for large clusters
                        ],
                        'circle-opacity': layer.opacity,
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                        'circle-stroke-opacity': layer.opacity
                    }
                })
                
                // Skip cluster count labels due to text rendering issues
                console.log('ℹ️ Skipping cluster count labels due to map style limitations')
                
                // Add unclustered points (colored by territory)
                map.addLayer({
                    id: layer.id,
                    type: 'circle',
                    source: sourceId,
                    filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-radius': 6,
                        'circle-color': ['get', 'territory_color'],  // Use territory color
                        'circle-stroke-width': 2,
                        'circle-stroke-color': '#ffffff',
                        'circle-opacity': ['get', 'territory_opacity'],  // Use territory opacity
                        'circle-stroke-opacity': layer.opacity
                    }
                })

                // Add click handler to expand clusters (using proper MapLibre API)
                map.on('click', `${layer.id}-clusters`, async (e) => {
                    const features = map.queryRenderedFeatures(e.point, {
                        layers: [`${layer.id}-clusters`]
                    })
                    
                    if (features.length > 0) {
                        const clusterId = features[0].properties?.cluster_id
                        if (clusterId) {
                            try {
                                const source = map.getSource(sourceId) as any
                                if (source && source.getClusterExpansionZoom) {
                                    const zoom = await source.getClusterExpansionZoom(clusterId)
                                    map.easeTo({
                                        center: (features[0].geometry as any).coordinates,
                                        zoom: zoom,
                                        duration: 500
                                    })
                                }
                            } catch (error) {
                                console.log('Could not expand cluster:', error)
                                // Fallback to simple zoom
                                const coords = (features[0].geometry as any).coordinates
                                if (coords) {
                                    map.easeTo({
                                        center: coords,
                                        zoom: Math.min(map.getZoom() + 2, 18),
                                        duration: 500
                                    })
                                }
                            }
                        }
                    }
                })

                // Change cursor on hover
                map.on('mouseenter', `${layer.id}-clusters`, () => {
                    map.getCanvas().style.cursor = 'pointer'
                })
                map.on('mouseleave', `${layer.id}-clusters`, () => {
                    map.getCanvas().style.cursor = ''
                })
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
                map.addLayer({ id: layer.id, type: 'line', source: sourceId, paint: { 'line-color': layer.color || '#38bdf8', 'line-width': 1.5, 'line-opacity': layer.opacity } })
            } else if (layer.type === 'roads') {
                map.addLayer({ id: layer.id, type: 'line', source: sourceId, paint: { 'line-color': layer.color || '#6b7280', 'line-width': 1, 'line-opacity': layer.opacity } })
            } else if (layer.type === 'imported-geojson') {
                console.log(`🌱 Creating imported-geojson layer ${layer.id} with opacity: ${layer.opacity}, color: ${layer.color}`)
                console.log(`🌱 Layer data:`, layer.data)
                console.log(`🌱 Source ID: ${sourceId}`)
                
                // Create fill layer for polygons
                map.addLayer({ 
                    id: layer.id, 
                    type: 'fill', 
                    source: sourceId, 
                    paint: { 
                        'fill-color': [
                            'case',
                            ['has', 'color'],
                            ['get', 'color'],
                            layer.color || '#8b5cf6'  // Fallback to layer color or purple
                        ],
                        'fill-opacity': layer.opacity 
                    } 
                })
                console.log(`🌱 Created fill layer: ${layer.id}`)
                
                // Create outline layer
                map.addLayer({ 
                    id: `${layer.id}-outline`, 
                    type: 'line', 
                    source: sourceId, 
                    paint: { 
                        'line-color': [
                            'case',
                            ['has', 'color'],
                            ['get', 'color'],
                            layer.color || '#6d28d9'  // Darker purple for outline
                        ],
                        'line-width': 2, 
                        'line-opacity': layer.opacity 
                    } 
                })
                console.log(`🌱 Created outline layer: ${layer.id}-outline`)
                console.log(`✅ Created imported-geojson layer with individual colors`)
            }
        }
        
        // Update opacity and color for existing layers
        if (map.getLayer(layer.id)) {
            console.log(`🔧 Updating opacity for existing layer ${layer.id} to ${layer.opacity}`)
            if (layer.color) {
                console.log(`🔧 Updating color for existing layer ${layer.id} to ${layer.color}`)
            }
            const paint = map.getLayer(layer.id)?.paint
            console.log(`🔍 Paint properties for ${layer.id}:`, paint)
            console.log(`🔍 Current opacity values:`, {
                'fill-opacity': (paint as any)?.['fill-opacity'],
                'line-opacity': (paint as any)?.['line-opacity'],
                'circle-opacity': (paint as any)?.['circle-opacity'],
                'circle-stroke-opacity': (paint as any)?.['circle-stroke-opacity']
            })
            
            if (paint) {
                const opacityProps = ['fill-opacity', 'line-opacity', 'circle-opacity', 'circle-stroke-opacity']
                let foundProps = 0
                opacityProps.forEach(prop => {
                    if ((paint as any)[prop] !== undefined) {
                        foundProps++
                        console.log(`🔧 Setting ${prop} to ${layer.opacity} for existing layer ${layer.id}`)
                        try {
                            map.setPaintProperty(layer.id, prop, layer.opacity)
                            console.log(`✅ Successfully updated ${prop} to ${layer.opacity}`)
                        } catch (error) {
                            console.error(`❌ Error updating ${prop} for layer ${layer.id}:`, error)
                        }
                    }
                })
                
                // Update color properties
                if (layer.color) {
                    console.log(`🔧 Attempting to update color for layer ${layer.id} to ${layer.color}`)
                    
                    // Try different color properties based on layer type
                    if (layer.type === 'territories') {
                        // Skip color updates for territories - they use individual colors from data
                        console.log(`ℹ️ Skipping color update for territories - using individual colors from data`)
                    } else if (layer.type === 'admin-boundaries' || layer.type === 'us-states') {
                        // Fill layers
                        try {
                            map.setPaintProperty(layer.id, 'fill-color', layer.color)
                            console.log(`✅ Successfully set fill-color to ${layer.color}`)
                        } catch (error: any) {
                            console.log(`❌ Could not set fill-color for ${layer.id}:`, error.message)
                        }
                    } else if (layer.type === 'customer-locations' || layer.type === 'current-locations' || layer.type === 'potential-locations') {
                        // Circle layers
                        try {
                            map.setPaintProperty(layer.id, 'circle-color', layer.color)
                            console.log(`✅ Successfully set circle-color to ${layer.color}`)
                        } catch (error: any) {
                            console.log(`❌ Could not set circle-color for ${layer.id}:`, error.message)
                        }
                    } else if (layer.type === 'rivers' || layer.type === 'roads') {
                        // Line layers
                        try {
                            map.setPaintProperty(layer.id, 'line-color', layer.color)
                            console.log(`✅ Successfully set line-color to ${layer.color}`)
                        } catch (error: any) {
                            console.log(`❌ Could not set line-color for ${layer.id}:`, error.message)
                        }
                    }
                }
                
                if (foundProps === 0) {
                    console.log(`❌ No opacity properties found for layer ${layer.id}. Available properties:`, Object.keys(paint))
                    // Try to set opacity anyway for common properties
                    const commonProps = ['fill-opacity', 'line-opacity', 'circle-opacity']
                    commonProps.forEach(prop => {
                        console.log(`🔧 Attempting to set ${prop} to ${layer.opacity} for layer ${layer.id}`)
                        try {
                            map.setPaintProperty(layer.id, prop, layer.opacity)
                            console.log(`✅ Successfully set ${prop} to ${layer.opacity}`)
                        } catch (error: any) {
                            console.log(`❌ Could not set ${prop} for layer ${layer.id}:`, error.message)
                        }
                    })
                }
            } else {
                console.log(`❌ No paint properties found for layer ${layer.id}`)
            }
        }
        
        if (map.getLayer(`${layer.id}-outline`)) {
            console.log(`🔧 Updating opacity for existing outline layer ${layer.id}-outline to ${layer.opacity}`)
            if (layer.color) {
                console.log(`🔧 Updating color for existing outline layer ${layer.id}-outline to ${layer.color}`)
            }
            const paint = map.getLayer(`${layer.id}-outline`)?.paint
            console.log(`🔍 Paint properties for outline ${layer.id}-outline:`, paint)
            
            if (paint) {
                if ((paint as any)['line-opacity'] !== undefined) {
                    console.log(`🔧 Setting line-opacity to ${layer.opacity} for existing outline layer ${layer.id}-outline`)
                    try {
                        map.setPaintProperty(`${layer.id}-outline`, 'line-opacity', layer.opacity)
                        console.log(`✅ Successfully updated line-opacity to ${layer.opacity}`)
                    } catch (error: any) {
                        console.error(`❌ Error updating line-opacity for ${layer.id}-outline:`, error)
                    }
                } else {
                    console.log(`❌ No line-opacity property found for outline layer ${layer.id}-outline. Available properties:`, Object.keys(paint))
                    // Try to set line-opacity anyway
                    console.log(`🔧 Attempting to set line-opacity to ${layer.opacity} for outline layer ${layer.id}-outline`)
                    try {
                        map.setPaintProperty(`${layer.id}-outline`, 'line-opacity', layer.opacity)
                        console.log(`✅ Successfully set line-opacity to ${layer.opacity}`)
                    } catch (error: any) {
                        console.log(`❌ Could not set line-opacity for ${layer.id}-outline:`, error.message)
                    }
                }
                
                // Update outline color if provided (skip for territories - they use individual colors)
                if (layer.color && layer.type !== 'territories') {
                    console.log(`🔧 Attempting to update outline color for layer ${layer.id}-outline to ${layer.color}`)
                    try {
                        map.setPaintProperty(`${layer.id}-outline`, 'line-color', layer.color)
                        console.log(`✅ Successfully updated outline line-color to ${layer.color}`)
                    } catch (error: any) {
                        console.log(`❌ Could not set line-color for ${layer.id}-outline:`, error.message)
                    }
                } else if (layer.type === 'territories') {
                    console.log(`ℹ️ Skipping outline color update for territories - using individual colors from data`)
                }
            } else {
                console.log(`❌ No paint properties found for outline layer ${layer.id}-outline`)
            }
        }
        
        // Always update visibility
        if (map.getLayer(layer.id)) {
            map.setLayoutProperty(layer.id, 'visibility', layer.visible ? 'visible' : 'none')
        }
        if (map.getLayer(`${layer.id}-outline`)) {
            map.setLayoutProperty(`${layer.id}-outline`, 'visibility', layer.visible ? 'visible' : 'none')
        }
        // Handle territory labels
        if (map.getLayer(`${layer.id}-labels`)) {
            map.setLayoutProperty(`${layer.id}-labels`, 'visibility', layer.visible ? 'visible' : 'none')
        }
        // Handle customer location clusters
        if (map.getLayer(`${layer.id}-clusters`)) {
            map.setLayoutProperty(`${layer.id}-clusters`, 'visibility', layer.visible ? 'visible' : 'none')
        }
        if (map.getLayer(`${layer.id}-cluster-count`)) {
            map.setLayoutProperty(`${layer.id}-cluster-count`, 'visibility', layer.visible ? 'visible' : 'none')
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

  // Note: Opacity updates are now handled in the addDataLayers function above


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
    setLayersConfigState(prev => prev.map(layer => (layer.id === layerId ? { ...layer, visible: !layer.visible } : layer)))
  }

  const handleLayerOpacityChange = (layerId: string, opacity: number) => {
    console.log(`🔧 Opacity change requested: ${layerId} -> ${opacity}`)
    setLayersConfigState(prev => {
      const updated = prev.map(layer => (layer.id === layerId ? { ...layer, opacity } : layer))
      console.log(`🔧 Updated layers config:`, updated.map(l => ({ id: l.id, opacity: l.opacity })))
      return updated
    })
  }

  const handleLayerColorChange = (layerId: string, color: string) => {
    console.log(`🔧 Color change requested: ${layerId} -> ${color}`)
    setLayersConfigState(prev => {
      const updated = prev.map(layer => (layer.id === layerId ? { ...layer, color } : layer))
      console.log(`🔧 Updated layers config:`, updated.map(l => ({ id: l.id, color: l.color })))
      return updated
    })
    
    // For territories layer, update the map source data immediately for live preview
    if (layerId === 'territories' && mapRef.current) {
      const territoriesLayer = layers.find(l => l.id === layerId)
      if (territoriesLayer?.data?.features) {
        const source = mapRef.current.getSource('territories') as any
        if (source && source.setData) {
          // Update the source data to reflect the color change
          const updatedData = {
            ...territoriesLayer.data,
            features: territoriesLayer.data.features.map((f: any) => ({
              ...f,
              properties: { ...f.properties, color }
            }))
          }
          source.setData(updatedData)
          console.log(`✅ Updated territories source data with new color: ${color}`)
        }
      }
    }
  }

  // New handler for individual territory color changes with live preview
  const handleTerritoryColorChange = (territoryId: string, color: string) => {
    console.log(`🔧 Individual territory color change: ${territoryId} -> ${color}`)
    
    // Update the territories layer data immediately for live preview
    if (mapRef.current) {
      const territoriesLayer = layers.find(l => l.type === 'territories')
      if (territoriesLayer?.data?.features) {
        const source = mapRef.current.getSource('territories') as any
        if (source && source.setData) {
          // Update only the specific territory's color
          const updatedData = {
            ...territoriesLayer.data,
            features: territoriesLayer.data.features.map((f: any) => 
              f.id === territoryId 
                ? { ...f, properties: { ...f.properties, color } }
                : f
            )
          }
          source.setData(updatedData)
          console.log(`✅ Updated territory ${territoryId} color to ${color} with live preview`)
        }
      }
    }
  }

  const handleTerritoryOpacityChange = (territoryId: string, opacity: number) => {
    console.log(`🔧 Individual territory opacity change: ${territoryId} -> ${opacity}`)
    
    // Update the layers state immediately for UI feedback
    setLayersConfigState(prev => prev.map(layer => {
      if (layer.type === 'territories' && (layer as any).data?.features) {
        return {
          ...layer,
          data: {
            ...(layer as any).data,
            features: (layer as any).data.features.map((f: any) => 
              f.id === territoryId 
                ? { ...f, properties: { ...f.properties, opacity } }
                : f
            )
          }
        }
      }
      return layer
    }))
    
    // Update the map source with debouncing for better performance
    requestAnimationFrame(() => {
      if (mapRef.current) {
        const territoriesLayer = layers.find(l => l.type === 'territories')
        if ((territoriesLayer as any)?.data?.features) {
          const source = mapRef.current.getSource('territories') as any
          if (source && source.setData) {
            // Update only the specific territory's opacity
            const updatedData = {
              ...(territoriesLayer as any).data,
              features: (territoriesLayer as any).data.features.map((f: any) => 
                f.id === territoryId 
                  ? { ...f, properties: { ...f.properties, opacity } }
                  : f
              )
            }
            source.setData(updatedData)
            console.log(`✅ Updated territory ${territoryId} opacity to ${opacity} with live preview`)
          }
        }
      }
    })
  }

  // Panel resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handlePanelMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-panel-drag-handle]')) {
      setIsPanelDragging(true)
    }
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX
      const minWidth = 280
      const maxWidth = 600
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth)
      }
    } else if (isPanelDragging) {
      // Check if dragged to hide panel or change position
      const hideThreshold = window.innerWidth * 0.9
      const rightThreshold = window.innerWidth * 0.7
      
      if (e.clientX > hideThreshold) {
        // Hide panel if dragged to far right
        setPanelPosition('hidden')
      } else if (e.clientX > rightThreshold && panelPosition === 'left') {
        setPanelPosition('right')
      } else if (e.clientX < rightThreshold && panelPosition === 'right') {
        setPanelPosition('left')
      } else if (panelPosition === 'hidden' && e.clientX < rightThreshold) {
        setPanelPosition('left')
      }
    }
  }, [isResizing, isPanelDragging, panelPosition])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    setIsPanelDragging(false)
  }, [])

  // Add event listeners for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

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
      if (userOrg === 'urimpact') {
        // Use Urimpact territory endpoint
        updateUrimpactTerritory.mutate({
          id: originalId,
          data: { 
            geometry: featureToSave.geometry as Polygon | MultiPolygon,
            updated_at: new Date().toISOString()
          }
        }, {
          onSuccess: () => {
            console.log('Urimpact territory saved successfully')
            setIsSaving(false)
            handleCancelEdit()
          },
          onError: (error) => {
            console.error('Failed to save Urimpact territory:', error)
            setIsSaving(false)
          }
        })
      } else {
        // Use correct field name based on organization
        const geometryField = userOrg === 'jeddah' ? 'geometry' : 'geom'
        updateTerritoryMutation.mutate({
          id: originalId,
          data: { 
            [geometryField]: featureToSave.geometry as Polygon | MultiPolygon,
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
      }
    } else if (featureType === 'location') {
      // Save location
      if (userOrg === 'urimpact') {
        // Use Urimpact location endpoint
        updateUrimpactLocation.mutate({
          id: originalId,
          data: { 
            geometry: featureToSave.geometry as Point,
            updated_at: new Date().toISOString()
          }
        }, {
          onSuccess: () => {
            console.log('Urimpact location saved successfully')
            setIsSaving(false)
            handleCancelEdit()
          },
          onError: (error) => {
            console.error('Failed to save Urimpact location:', error)
            setIsSaving(false)
          }
        })
      } else {
        // Use correct field name based on organization
        const geometryField = userOrg === 'jeddah' ? 'geometry' : 'geom'
        updateLocationMutation.mutate({
          id: originalId,
          data: { 
            [geometryField]: featureToSave.geometry as Point,
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
      }
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
    setExportMode('export')
    setIsExportConfigOpen(true)
  }, [])

  const handlePrint = useCallback(() => {
    setExportMode('print')
    setIsExportConfigOpen(true)
  }, [])

  const handleExportWithConfig = useCallback((config: any) => {
    if (mapRef.current) {
      exportMapAsPDF(
        mapRef.current, 
        layers, 
        config.title, 
        config.layout, 
        config.includeLegend, 
        config.includeScale, 
        config.includeNorthArrow
      )
    }
  }, [layers])

  const handlePrintWithConfig = useCallback((config: any) => {
    // Enhanced print with configuration
    console.log('Print with config:', config)
    console.log('Map element for print:', document.getElementById('map'))
    console.log('Map element visible:', document.getElementById('map')?.offsetWidth, 'x', document.getElementById('map')?.offsetHeight)
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
          userOrg={userOrg}
        />
        
        
        {/* Map Title - Draggable and Centered */}
        <div 
          className={cn(
            "absolute z-20 bg-white/95 backdrop-blur-md px-8 py-4 rounded-2xl shadow-2xl border-2 border-white/20 select-none hover:shadow-3xl transition-all duration-300",
            isEditingTitle ? "cursor-text ring-2 ring-blue-500/50" : "cursor-move hover:scale-105"
          )}
          style={{
            left: titlePosition.x === 0 ? '50%' : `${titlePosition.x}px`,
            top: `${titlePosition.y}px`,
            transform: titlePosition.x === 0 ? 'translateX(-50%)' : (isDraggingTitle ? 'scale(1.05)' : 'scale(1)'),
            transition: isDraggingTitle ? 'none' : 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseDown={isEditingTitle ? undefined : handleTitleMouseDown}
          onDoubleClick={handleTitleDoubleClick}
        >
          <div className="flex items-center gap-4">
            {isEditingTitle ? (
              <input
                type="text"
                value={mapTitle}
                onChange={(e) => setMapTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleBlur}
                className="bg-transparent border-none outline-none text-2xl font-bold text-center min-w-0 flex-1 placeholder:text-gray-400 focus:placeholder:text-gray-300 text-gray-800"
                placeholder="Enter map title"
                style={{ minWidth: '400px', fontFamily: 'Inter, system-ui, sans-serif' }}
                autoFocus
              />
            ) : (
              <div 
                className="text-2xl font-bold text-center min-w-0 flex-1 cursor-pointer hover:text-blue-600 transition-colors text-gray-800"
                style={{ minWidth: '400px', fontFamily: 'Inter, system-ui, sans-serif' }}
                onDoubleClick={handleTitleDoubleClick}
              >
                {mapTitle}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-500 opacity-0 hover:opacity-100 transition-opacity duration-200 font-medium">
                {isEditingTitle ? "Press Enter to save, Escape to cancel" : "Double-click to edit, drag to move"}
              </div>
            </div>
          </div>
        </div>

        {/* Show Panel Button (when hidden) */}
        {panelPosition === 'hidden' && (
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanelPosition('left')}
              className="bg-background/95"
            >
              <Layers className="h-4 w-4 mr-2" />
              Show Layers
            </Button>
          </div>
        )}

        {/* Carbon Sequestration Panel - Draggable */}
        {userOrg === 'urimpact' && carbonData && (
          <div 
            className="absolute z-10 bg-background/95 rounded-lg shadow-lg border p-4 max-w-sm cursor-move select-none"
            style={{
              left: `${carbonPanelPosition.x}px`,
              top: `${carbonPanelPosition.y}px`,
              transform: isDraggingCarbon ? 'scale(1.02)' : 'scale(1)',
              transition: isDraggingCarbon ? 'none' : 'transform 0.2s ease-out'
            }}
            onMouseDown={handleCarbonMouseDown}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <h3 className="font-semibold text-lg">Carbon Sequestration</h3>
              <div className="ml-auto text-xs text-muted-foreground">
                Drag to move
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trees:</span>
                <span className="font-medium">{carbonData.totalTrees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Area:</span>
                <span className="font-medium">{carbonData.area.toFixed(2)} hectares</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CO₂ Sequestration:</span>
                <span className="font-medium text-green-600">
                  {carbonData.carbonSequestration.toLocaleString()} kg/year
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Equivalent to:</span>
                  <span>{(carbonData.carbonSequestration / 1000).toFixed(1)} tons CO₂/year</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                  <div className="flex items-center gap-2">
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
                    
                    {/* Three-dot menu for additional actions */}
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="p-2"
                        onClick={() => {
                          // Zoom to the edited feature
                          if (editingFeature && mapRef.current) {
                            const bounds = bbox(editingFeature.geometry)
                            mapRef.current.fitBounds([
                              [bounds[0], bounds[1]],
                              [bounds[2], bounds[3]]
                            ], {
                              padding: 50,
                              maxZoom: 16
                            })
                          }
                        }}
                        title="Zoom to feature"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </Button>
                    </div>
                  </div>
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
                  onLayerColorChange={handleLayerColorChange}
                  onTerritoryColorChange={handleTerritoryColorChange}
                  onTerritoryOpacityChange={handleTerritoryOpacityChange}
                  drawingTool={drawingTool}
                  onDrawingToolChange={handleDrawingToolChange}
                  onExport={handleExport}
                  onHome={flyToDefaultView}
                  onImportGeoJSON={() => setIsGeoJSONImporterOpen(true)}
                  isLoading={isLoading}
                  userOrg={userOrg}
                  showAllAdminBoundaries={showAllAdminBoundaries}
                  onToggleAllAdminBoundaries={setShowAllAdminBoundaries}
                />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
      {panelPosition !== 'hidden' && (
        <div 
          className={cn(
            "bg-background/95 hidden md:block relative transition-all duration-300 ease-in-out",
            panelPosition === 'left' ? 'border-l' : 'border-r'
          )}
          style={{ 
            width: `${panelWidth}px`,
            [panelPosition === 'left' ? 'left' : 'right']: 0
          }}
          onMouseDown={handlePanelMouseDown}
          data-panel-drag-handle
        >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 bg-border hover:bg-primary/50 cursor-col-resize z-10"
          onMouseDown={handleMouseDown}
        />
        
        <MapControls
          layers={layers}
          onLayerToggle={handleLayerToggle}
          onLayerOpacityChange={handleLayerOpacityChange}
          onLayerColorChange={handleLayerColorChange}
          onTerritoryColorChange={handleTerritoryColorChange}
          onTerritoryOpacityChange={handleTerritoryOpacityChange}
          drawingTool={drawingTool}
          onDrawingToolChange={handleDrawingToolChange}
          onExport={handleExport}
          onHome={flyToDefaultView}
          onImportGeoJSON={() => setIsGeoJSONImporterOpen(true)}
          className="m-4"
          isLoading={isLoading}
          userOrg={userOrg}
          showAllAdminBoundaries={showAllAdminBoundaries}
          onToggleAllAdminBoundaries={setShowAllAdminBoundaries}
        />
        </div>
      )}
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
      {userOrg === 'jeddah' ? (
        <JeddahTerritoryGenerator
          isOpen={isTerritoryGeneratorOpen}
          onOpenChange={setIsTerritoryGeneratorOpen}
          onTerritoriesGenerated={handleTerritoriesGenerated}
          userOrg={userOrg}
        />
      ) : (
        <TerritoryGenerator
          isOpen={isTerritoryGeneratorOpen}
          onOpenChange={setIsTerritoryGeneratorOpen}
          onTerritoriesGenerated={handleTerritoriesGenerated}
        />
      )}
      
      {/* GeoJSON Importer for Urimpact users */}
      <GeoJSONImporter
        isOpen={isGeoJSONImporterOpen}
        onClose={() => setIsGeoJSONImporterOpen(false)}
        onImport={handleImportGeoJSON}
        userOrg={userOrg}
      />
      
      {/* Export Configuration Modal */}
      <ExportConfigModal
        isOpen={isExportConfigOpen}
        onClose={() => setIsExportConfigOpen(false)}
        onExport={handleExportWithConfig}
        onPrint={handlePrintWithConfig}
        mode={exportMode}
      />
    </div>
  )
}