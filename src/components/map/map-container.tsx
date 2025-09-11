'use client'

import React, { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { MapState } from '@/types'
import { cn } from '@/lib/utils'

interface MapContainerProps {
  onMapLoad: (map: maplibregl.Map) => void
  className?: string
  initialStyle: string | maplibregl.StyleSpecification
}

export function MapContainer({
  onMapLoad,
  className,
  initialStyle,
}: MapContainerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const [mapState, setMapState] = useState<MapState>({
    center: [-98.5795, 39.8283], // A more central point for the US
    zoom: 3, // Zoomed out to show the whole continental US
    bearing: 0,
    pitch: 0,
  })

  useEffect(() => {
    if (map.current || !mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: mapState.center,
      zoom: mapState.zoom,
      bearing: mapState.bearing,
      pitch: mapState.pitch,
    })

    const currentMap = map.current

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right')

    map.current.on('load', () => {
      if (onMapLoad && map.current) {
        onMapLoad(map.current)
      }
    })

    const onMove = () => {
      if (!map.current) return
      setMapState({
        center: map.current.getCenter().toArray() as [number, number],
        zoom: map.current.getZoom(),
        bearing: map.current.getBearing(),
        pitch: map.current.getPitch(),
      })
    }

    map.current.on('move', onMove)

    return () => {
      currentMap.off('move', onMove)
    }
  }, [mapState, onMapLoad, initialStyle])

  return <div ref={mapContainer} id="map" className={cn('map-container', className)} />
}