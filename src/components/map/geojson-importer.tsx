'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, X, CheckCircle, AlertCircle, MapPin, GripVertical } from 'lucide-react'
import { FeatureCollection } from 'geojson'
import bbox from '@turf/bbox'

interface GeoJSONImporterProps {
  isOpen: boolean
  onClose: () => void
  onImport: (geojson: FeatureCollection) => void
  userOrg?: string
}

export function GeoJSONImporter({ isOpen, onClose, onImport, userOrg }: GeoJSONImporterProps) {
  const [jsonInput, setJsonInput] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean
    message: string
    featureCount?: number
    bounds?: [number, number, number, number]
  } | null>(null)
  
  // Drag functionality
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  const validateAndParseGeoJSON = async () => {
    if (!jsonInput.trim()) {
      setValidationResult({
        isValid: false,
        message: 'Please enter some JSON/GeoJSON data'
      })
      return
    }

    setIsValidating(true)
    
    try {
      let parsed = JSON.parse(jsonInput)
      
      // Validate GeoJSON structure
      if (!parsed.type) {
        throw new Error('Missing "type" property')
      }
      
      if (parsed.type === 'FeatureCollection') {
        if (!Array.isArray(parsed.features)) {
          throw new Error('FeatureCollection must have a "features" array')
        }
        
        if (parsed.features.length === 0) {
          throw new Error('FeatureCollection is empty')
        }
        
        // Validate each feature
        for (let i = 0; i < parsed.features.length; i++) {
          const feature = parsed.features[i]
          if (!feature.type || feature.type !== 'Feature') {
            throw new Error(`Feature ${i} is not a valid GeoJSON Feature`)
          }
          if (!feature.geometry) {
            throw new Error(`Feature ${i} is missing geometry`)
          }
          if (!feature.geometry.type) {
            throw new Error(`Feature ${i} geometry is missing type`)
          }
        }
      } else if (parsed.type === 'Feature') {
        if (!parsed.geometry) {
          throw new Error('Feature is missing geometry')
        }
        if (!parsed.geometry.type) {
          throw new Error('Feature geometry is missing type')
        }
        // Convert single feature to FeatureCollection
        parsed = {
          type: 'FeatureCollection',
          features: [parsed]
        }
      } else {
        throw new Error('Invalid GeoJSON type. Expected "FeatureCollection" or "Feature"')
      }
      
      // Calculate bounds
      const bounds = bbox(parsed as FeatureCollection)
      const featureCount = parsed.features.length
      
      setValidationResult({
        isValid: true,
        message: `Valid GeoJSON with ${featureCount} feature${featureCount !== 1 ? 's' : ''}`,
        featureCount,
        bounds: bounds as [number, number, number, number]
      })
      
    } catch (error) {
      setValidationResult({
        isValid: false,
        message: `Invalid JSON/GeoJSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleImport = () => {
    if (validationResult?.isValid) {
      try {
        const parsed = JSON.parse(jsonInput)
        let geojson: FeatureCollection
        
        if (parsed.type === 'Feature') {
          geojson = {
            type: 'FeatureCollection',
            features: [parsed]
          }
        } else {
          geojson = parsed as FeatureCollection
        }
        
        handleImport(geojson)
        onClose()
        setJsonInput('')
        setValidationResult(null)
      } catch (error) {
        console.error('Error importing GeoJSON:', error)
      }
    }
  }

  const handleClose = () => {
    onClose()
    setJsonInput('')
    setValidationResult(null)
  }

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('[data-drag-handle]')) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragStart])

  // Auto-fly to imported GeoJSON
  const handleImport = (geojson: FeatureCollection) => {
    onImport(geojson)
    
    // Auto-fly to the imported GeoJSON bounds
    try {
      const bounds = bbox(geojson)
      // This will be handled by the parent component
      console.log('✅ Auto-flying to imported GeoJSON bounds:', bounds)
    } catch (error) {
      console.error('❌ Error calculating bounds for auto-fly:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card 
        ref={modalRef}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden cursor-move"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
        onMouseDown={handleMouseDown}
      >
        <CardHeader 
          className="flex flex-row items-center justify-between space-y-0 pb-4 cursor-move"
          data-drag-handle
        >
          <CardTitle className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <FileText className="w-5 h-5" />
            Import GeoJSON
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Paste your JSON/GeoJSON data below:
            </label>
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Example Feature"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [45.0, 25.0]
      }
    }
  ]
}`}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={validateAndParseGeoJSON}
              disabled={isValidating || !jsonInput.trim()}
              variant="outline"
            >
              {isValidating ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  Validating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Validate
                </>
              )}
            </Button>
            
            {validationResult?.isValid && (
              <Button onClick={handleImport}>
                <Upload className="w-4 h-4 mr-2" />
                Import to Map
              </Button>
            )}
          </div>
          
          {validationResult && (
            <div className={`p-3 rounded-lg border ${
              validationResult.isValid 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.isValid ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {validationResult.isValid ? 'Valid GeoJSON' : 'Invalid GeoJSON'}
                </span>
              </div>
              <p className="text-sm mt-1">{validationResult.message}</p>
              
              {validationResult.isValid && validationResult.featureCount && (
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">
                    <MapPin className="w-3 h-3 mr-1" />
                    {validationResult.featureCount} feature{validationResult.featureCount !== 1 ? 's' : ''}
                  </Badge>
                  {validationResult.bounds && (
                    <Badge variant="outline">
                      Bounds: {validationResult.bounds.map(coord => coord.toFixed(4)).join(', ')}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Supported formats:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>GeoJSON FeatureCollection</li>
              <li>Single GeoJSON Feature (will be converted to FeatureCollection)</li>
              <li>Valid JSON with geometry data</li>
            </ul>
            <p><strong>Supported geometry types:</strong> Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
