'use client'

import React, { useRef, useEffect, useState } from 'react'
import maplibregl, { Map, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

interface MapPickerProps {
  onLocationSelect: (coords: { lat: number; lng: number }) => void
  initialCoordinates?: { lat: number; lng: number }
}

export function MapPicker({ onLocationSelect, initialCoordinates }: MapPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const marker = useRef<Marker | null>(null)
  const [lng, setLng] = useState(
    initialCoordinates?.lng && !isNaN(initialCoordinates.lng) && isFinite(initialCoordinates.lng) 
      ? initialCoordinates.lng 
      : -95.7129
  )
  const [lat, setLat] = useState(
    initialCoordinates?.lat && !isNaN(initialCoordinates.lat) && isFinite(initialCoordinates.lat) 
      ? initialCoordinates.lat 
      : 37.0902
  )
  const [zoom] = useState(initialCoordinates ? 12 : 3)

  useEffect(() => {
    if (map.current) return // initialize map only once
    if (!mapContainer.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
      center: [lng, lat],
      zoom: zoom,
    })

    if (initialCoordinates && 
        !isNaN(initialCoordinates.lng) && 
        !isNaN(initialCoordinates.lat) &&
        isFinite(initialCoordinates.lng) &&
        isFinite(initialCoordinates.lat)) {
        marker.current = new maplibregl.Marker()
            .setLngLat([initialCoordinates.lng, initialCoordinates.lat])
            .addTo(map.current)
    }

    map.current.on('click', (e) => {
      const { lng, lat } = e.lngLat
      onLocationSelect({ lat, lng })

      if (marker.current) {
        marker.current.setLngLat([lng, lat])
      } else {
        marker.current = new maplibregl.Marker().setLngLat([lng, lat]).addTo(map.current!)
      }
    })
  }, [lng, lat, zoom, onLocationSelect, initialCoordinates])

  return (
    <div className="relative h-64 w-full">
      <div ref={mapContainer} className="absolute top-0 bottom-0 w-full" />
    </div>
  )
}
