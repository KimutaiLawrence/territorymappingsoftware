'use client'

import React, { useRef, useEffect, useState } from 'react'
import maplibregl, { Map, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapDisplayProps {
  coordinates: { lat: number; lng: number }
}

export function MapDisplay({ coordinates }: MapDisplayProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const [lng] = useState(coordinates.lng)
  const [lat] = useState(coordinates.lat)
  const [zoom] = useState(12)

  useEffect(() => {
    if (map.current) return // initialize map only once
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
      center: [lng, lat],
      zoom: zoom,
    })

    new maplibregl.Marker()
        .setLngLat([lng, lat])
        .addTo(map.current)

  }, [lng, lat, zoom])

  return (
    <div className="relative h-64 w-full">
      <div ref={mapContainer} className="absolute top-0 bottom-0 w-full" />
    </div>
  )
}
