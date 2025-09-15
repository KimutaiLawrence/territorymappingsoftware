'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, MapPin, Target, CheckCircle, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface TerritoryGeneratorProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onTerritoriesGenerated?: () => void
}

interface AnalysisResult {
  patterns: {
    avg_area: number
    avg_perimeter: number
    shape_complexity: number
    irregularity_factor: number
    size_variation: number
    boundary_smoothness: number
  }
  existing_territories_count: number
  unassigned_locations_count: number
  unassigned_locations: Array<{
    id: string
    name: string
    coordinates: [number, number]
    properties: Record<string, any>
  }>
}

interface GenerationResult {
  patterns: any
  generated_count: number
  failed_count: number
  failed_locations: string[]
  territories: Array<{
    name: string
    description: string
    type: string
    geometry: any
    properties: Record<string, any>
  }>
}

export function TerritoryGenerator({ isOpen = false, onOpenChange, onTerritoriesGenerated }: TerritoryGeneratorProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)


  const analyzeTerritories = async () => {
    try {
      setIsAnalyzing(true)
      setError(null)
      
      const response = await api.get('/api/territory-generator/analyze')
      setAnalysisResult(response.data)
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to analyze territories')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const generateTerritories = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await api.post('/api/territory-generator/generate')
      setGenerationResult(response.data)
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate territories')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveTerritories = async () => {
    if (!generationResult?.territories) return
    
    try {
      setIsSaving(true)
      setError(null)
      
      await api.post('/api/territory-generator/save', {
        territories: generationResult.territories
      })
      
      // Refresh the map or trigger a reload
      if (onTerritoriesGenerated) {
        onTerritoriesGenerated()
      }
      
      // Reset results
      setAnalysisResult(null)
      setGenerationResult(null)
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save territories')
    } finally {
      setIsSaving(false)
    }
  }

  const formatNumber = (num: number) => {
    return num.toFixed(2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Territory Generator
          </DialogTitle>
        </DialogHeader>
        
        <Card className="w-full">
          <CardHeader>
            <CardDescription>
              Analyze existing territory patterns and generate new territories for unassigned locations
            </CardDescription>
          </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-800">{error}</span>
          </div>
        )}

        {/* Analysis Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Step 1: Analyze Existing Territories</h3>
            <Button 
              onClick={analyzeTerritories} 
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
          </div>

          {analysisResult && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Existing Territories:</span>
                  <Badge variant="secondary" className="ml-2">
                    {analysisResult.existing_territories_count}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Unassigned Locations:</span>
                  <Badge variant="destructive" className="ml-2">
                    {analysisResult.unassigned_locations_count}
                  </Badge>
                </div>
              </div>
              
              <div className="text-sm space-y-1">
                <div><span className="font-medium">Avg Area:</span> {formatNumber(analysisResult.patterns.avg_area)}</div>
                <div><span className="font-medium">Avg Perimeter:</span> {formatNumber(analysisResult.patterns.avg_perimeter)}</div>
                <div><span className="font-medium">Shape Complexity:</span> {formatNumber(analysisResult.patterns.shape_complexity)}</div>
                <div><span className="font-medium">Irregularity Factor:</span> {formatNumber(analysisResult.patterns.irregularity_factor)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Generation Section */}
        {analysisResult && analysisResult.unassigned_locations_count > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Step 2: Generate Territories</h3>
              <Button 
                onClick={generateTerritories} 
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate'
                )}
              </Button>
            </div>

            {generationResult && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Generated:</span>
                    <Badge variant="default" className="ml-2">
                      {generationResult.generated_count}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Failed:</span>
                    <Badge variant="destructive" className="ml-2">
                      {generationResult.failed_count}
                    </Badge>
                  </div>
                </div>
                
                {generationResult.failed_locations.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium text-red-600">Failed Locations:</span>
                    <div className="mt-1 text-red-600">
                      {generationResult.failed_locations.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Save Section */}
        {generationResult && generationResult.generated_count > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Step 3: Save to Database</h3>
              <Button 
                onClick={saveTerritories} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Territories
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Unassigned Locations List */}
        {analysisResult && analysisResult.unassigned_locations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Unassigned Locations:</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {analysisResult.unassigned_locations.map((location) => (
                <div key={location.id} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                  <MapPin className="h-3 w-3 text-gray-500" />
                  <span>{location.name}</span>
                  <span className="text-gray-500 text-xs">
                    ({location.coordinates[0].toFixed(4)}, {location.coordinates[1].toFixed(4)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysisResult && analysisResult.unassigned_locations_count === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-800 font-medium">All locations already have territories!</p>
          </div>
        )}
        </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}
