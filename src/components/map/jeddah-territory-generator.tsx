'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Loader2, MapPin, Target, CheckCircle, AlertCircle, Settings, Info, RefreshCw } from 'lucide-react'
import api from '@/lib/api'
import { toast } from 'sonner'

interface JeddahTerritoryGeneratorProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onTerritoriesGenerated?: () => void
  userOrg?: string
}

interface GenerationCriteria {
  customersPerTerritory: number
  method: 'kmeans' | 'hierarchical' | 'fast'
  bufferDistance: number
  smoothness: number
  minTerritorySize: number
  maxTerritorySize: number
  useExistingPatterns: boolean
  preserveBoundaries: boolean
}

interface GenerationResult {
  territories_created: number
  territories: Array<{
    name: string
    customer_count: number
  }>
  total_customers: number
  customers_per_territory: number
  method: string
  generation_time: number
  criteria_used: GenerationCriteria
}

export function JeddahTerritoryGenerator({ 
  isOpen = false, 
  onOpenChange, 
  onTerritoriesGenerated,
  userOrg 
}: JeddahTerritoryGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [customerCount, setCustomerCount] = useState<number>(0)
  
  // Generation criteria state
  const [criteria, setCriteria] = useState<GenerationCriteria>({
    customersPerTerritory: 180,
    method: 'kmeans',
    bufferDistance: 0.005, // ~500m buffer
    smoothness: 0.002, // Smoothness factor
    minTerritorySize: 50,
    maxTerritorySize: 300,
    useExistingPatterns: true,
    preserveBoundaries: true
  })

  // Load customer count on open
  useEffect(() => {
    if (isOpen && userOrg === 'jeddah') {
      loadCustomerCount()
    }
  }, [isOpen, userOrg])

  const loadCustomerCount = async () => {
    try {
      const response = await api.get('/api/jeddah/customers')
      // The response has pagination.total for the count
      const total = response.data.pagination?.total || response.data.total || 0
      console.log('🔍 Customer count loaded:', total)
      setCustomerCount(total)
    } catch (err) {
      console.error('Failed to load customer count:', err)
      // Try alternative endpoint
      try {
        const fastResponse = await api.get('/api/jeddah/fast-data')
        const count = fastResponse.data.customer_count || 0
        console.log('🔍 Customer count from fast-data:', count)
        setCustomerCount(count)
      } catch (fastErr) {
        console.error('Failed to load customer count from fast-data:', fastErr)
        setCustomerCount(0)
      }
    }
  }

  const generateTerritories = async () => {
    if (userOrg !== 'jeddah') {
      setError('This feature is only available for Jeddah organization')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await api.post('/api/jeddah/territories/generate', {
        customersPerTerritory: criteria.customersPerTerritory,
        method: criteria.method,
        bufferDistance: criteria.bufferDistance,
        smoothness: criteria.smoothness,
        minTerritorySize: criteria.minTerritorySize,
        maxTerritorySize: criteria.maxTerritorySize,
        useExistingPatterns: criteria.useExistingPatterns,
        preserveBoundaries: criteria.preserveBoundaries
      })
      
      setGenerationResult(response.data)
      toast.success(`Successfully generated ${response.data.territories_created} territories!`)
      
      if (onTerritoriesGenerated) {
        onTerritoriesGenerated()
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to generate territories'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFastTerritories = async () => {
    if (userOrg !== 'jeddah') {
      setError('This feature is only available for Jeddah organization')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await api.post('/api/jeddah/territories/generate-fast', {
        customersPerTerritory: criteria.customersPerTerritory
      })
      
      setGenerationResult(response.data)
      toast.success(`Successfully generated ${response.data.territories_created} territories!`)
      
      if (onTerritoriesGenerated) {
        onTerritoriesGenerated()
      }
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to generate territories'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const resetCriteria = () => {
    setCriteria({
      customersPerTerritory: 180,
      method: 'kmeans',
      bufferDistance: 0.005,
      smoothness: 0.002,
      minTerritorySize: 50,
      maxTerritorySize: 300,
      useExistingPatterns: true,
      preserveBoundaries: true
    })
  }

  const calculateTerritoriesNeeded = () => {
    return Math.max(1, Math.round(customerCount / criteria.customersPerTerritory))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Jeddah Territory Generator
            <Badge variant="secondary" className="ml-2">
              {customerCount} customers
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadCustomerCount}
              className="ml-auto"
              title="Refresh customer count"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="generator" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generator" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Territory Generator
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Guide & Info
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-800">{error}</span>
              </div>
            )}

            {customerCount === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <div>
                  <span className="text-yellow-800 font-medium">No customers found</span>
                  <p className="text-yellow-700 text-sm mt-1">
                    Make sure you have customer data loaded. Try refreshing the customer count or check if you're logged in as the correct organization.
                  </p>
                </div>
              </div>
            )}

          {/* Generation Criteria */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Generation Criteria
              </CardTitle>
              <CardDescription>
                Customize how territories are generated for Jeddah customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="customersPerTerritory">Customers per Territory</Label>
                  <Input
                    id="customersPerTerritory"
                    type="number"
                    value={criteria.customersPerTerritory}
                    onChange={(e) => setCriteria(prev => ({ 
                      ...prev, 
                      customersPerTerritory: parseInt(e.target.value) || 180 
                    }))}
                    min="50"
                    max="500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target number of customers per territory
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Generation Method</Label>
                  <Select
                    value={criteria.method}
                    onValueChange={(value: 'kmeans' | 'hierarchical' | 'fast') => 
                      setCriteria(prev => ({ ...prev, method: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kmeans">K-Means Clustering (Recommended)</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical Clustering</SelectItem>
                      <SelectItem value="fast">Fast Generation</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Algorithm used for grouping customers
                  </p>
                </div>
              </div>

              {/* Advanced Parameters */}
              {criteria.method !== 'fast' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="font-medium">Advanced Boundary Settings</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="bufferDistance">
                          Buffer Distance: {criteria.bufferDistance}° (~{Math.round(criteria.bufferDistance * 111000)}m)
                        </Label>
                        <Slider
                          value={[criteria.bufferDistance]}
                          onValueChange={([value]) => setCriteria(prev => ({ ...prev, bufferDistance: value }))}
                          min={0.001}
                          max={0.02}
                          step={0.001}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          Distance to buffer around customer clusters
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smoothness">
                          Smoothness: {criteria.smoothness}
                        </Label>
                        <Slider
                          value={[criteria.smoothness]}
                          onValueChange={([value]) => setCriteria(prev => ({ ...prev, smoothness: value }))}
                          min={0.0005}
                          max={0.01}
                          step={0.0005}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground">
                          How smooth the territory boundaries should be
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="minTerritorySize">Minimum Territory Size</Label>
                        <Input
                          id="minTerritorySize"
                          type="number"
                          value={criteria.minTerritorySize}
                          onChange={(e) => setCriteria(prev => ({ 
                            ...prev, 
                            minTerritorySize: parseInt(e.target.value) || 50 
                          }))}
                          min="10"
                          max="200"
                        />
                        <p className="text-xs text-muted-foreground">
                          Minimum customers per territory
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maxTerritorySize">Maximum Territory Size</Label>
                        <Input
                          id="maxTerritorySize"
                          type="number"
                          value={criteria.maxTerritorySize}
                          onChange={(e) => setCriteria(prev => ({ 
                            ...prev, 
                            maxTerritorySize: parseInt(e.target.value) || 300 
                          }))}
                          min="100"
                          max="500"
                        />
                        <p className="text-xs text-muted-foreground">
                          Maximum customers per territory
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="useExistingPatterns"
                          checked={criteria.useExistingPatterns}
                          onCheckedChange={(checked) => setCriteria(prev => ({ 
                            ...prev, 
                            useExistingPatterns: checked 
                          }))}
                        />
                        <Label htmlFor="useExistingPatterns">Use Existing Territory Patterns</Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Analyze existing territories to maintain consistent patterns
                      </p>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="preserveBoundaries"
                          checked={criteria.preserveBoundaries}
                          onCheckedChange={(checked) => setCriteria(prev => ({ 
                            ...prev, 
                            preserveBoundaries: checked 
                          }))}
                        />
                        <Label htmlFor="preserveBoundaries">Preserve Administrative Boundaries</Label>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Try to align territory boundaries with administrative boundaries
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Generation Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Territories to create:</span>
                    <Badge variant="secondary" className="ml-2">
                      {calculateTerritoriesNeeded()}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Method:</span>
                    <Badge variant="outline" className="ml-2">
                      {criteria.method}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Avg customers per territory:</span>
                    <Badge variant="outline" className="ml-2">
                      {Math.round(customerCount / calculateTerritoriesNeeded())}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Buffer distance:</span>
                    <Badge variant="outline" className="ml-2">
                      {Math.round(criteria.bufferDistance * 111000)}m
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generation Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium">Generate Territories</h3>
                  <p className="text-sm text-muted-foreground">
                    Create territories based on the criteria above
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetCriteria}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                  {criteria.method === 'fast' ? (
                    <Button
                      onClick={generateFastTerritories}
                      disabled={isGenerating}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4 mr-2" />
                          Generate Fast
                        </>
                      )}
                    </Button>
                  ) : (
                  <Button
                    onClick={generateTerritories}
                    disabled={isGenerating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Target className="h-4 w-4 mr-2" />
                          Generate Advanced
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {generationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Generation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {generationResult.territories_created}
                    </div>
                    <div className="text-sm text-muted-foreground">Territories Created</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {generationResult.total_customers}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(generationResult.total_customers / generationResult.territories_created)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg per Territory</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {generationResult.generation_time || 0}s
                    </div>
                    <div className="text-sm text-muted-foreground">Generation Time</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Territory Details:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {generationResult.territories.map((territory, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                        <span>{territory.name}</span>
                        <Badge variant="secondary">{territory.customer_count} customers</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>

          <TabsContent value="guide" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-600" />
                  Territory Generation Guide
                </CardTitle>
                <CardDescription>
                  Learn how Jeddah territory generation works and how to optimize your parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* How It Works */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    How Territory Generation Works
                  </h3>
                  <div className="space-y-3 text-sm">
                    <p>
                      The Jeddah Territory Generator uses advanced clustering algorithms to automatically create 
                      balanced territories from your customer locations. Here's how it works:
                    </p>
                    <ol className="list-decimal list-inside space-y-2 ml-4">
                      <li>
                        <strong>Customer Analysis:</strong> The system analyzes all {customerCount} customer locations 
                        in Jeddah to understand their spatial distribution
                      </li>
                      <li>
                        <strong>Clustering:</strong> Uses machine learning algorithms to group nearby customers 
                        into optimal clusters
                      </li>
                      <li>
                        <strong>Boundary Creation:</strong> Creates smooth, natural-looking territory boundaries 
                        around customer clusters
                      </li>
                      <li>
                        <strong>Optimization:</strong> Ensures balanced customer distribution and respects 
                        administrative boundaries
                      </li>
                    </ol>
                  </div>
                </div>

                {/* Generation Methods */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Settings className="h-5 w-5 text-green-600" />
                    Generation Methods Explained
                  </h3>
                  <div className="grid gap-4">
                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-bold text-sm">K</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-900">K-Means Clustering (Recommended)</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Uses machine learning to find optimal customer groupings. Best for balanced territories 
                            with similar customer counts. Most accurate but takes slightly longer.
                          </p>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">Best for: Balanced territories</Badge>
                            <Badge variant="outline" className="text-xs ml-1">Time: ~2-3 seconds</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-600 font-bold text-sm">H</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-900">Hierarchical Clustering</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Creates territories by building a hierarchy of customer groups. Good for understanding 
                            natural customer clusters and creating territories that respect geographic features.
                          </p>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">Best for: Natural boundaries</Badge>
                            <Badge variant="outline" className="text-xs ml-1">Time: ~3-5 seconds</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-orange-600 font-bold text-sm">F</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-orange-900">Fast Generation</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Quick territory creation using simple geometric methods. Fastest option for 
                            getting initial territory layouts. Good for testing and rapid iterations.
                          </p>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">Best for: Quick testing</Badge>
                            <Badge variant="outline" className="text-xs ml-1">Time: ~1 second</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Parameter Guide */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    Parameter Guide
                  </h3>
                  <div className="space-y-4">
                    <Card className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Customers per Territory</h4>
                      <p className="text-sm text-gray-600">
                        Target number of customers per territory. With {customerCount} customers, 
                        setting this to 180 will create approximately {Math.round(customerCount / 180)} territories.
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">Recommended: 150-200</Badge>
                        <Badge variant="outline" className="text-xs ml-1">Range: 50-500</Badge>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Buffer Distance</h4>
                      <p className="text-sm text-gray-600">
                        Distance to buffer around customer clusters to ensure customers are fully within 
                        territory boundaries. Prevents customers from being on territory edges.
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">Recommended: 0.005° (~500m)</Badge>
                        <Badge variant="outline" className="text-xs ml-1">Range: 0.001° - 0.02°</Badge>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Boundary Smoothness</h4>
                      <p className="text-sm text-gray-600">
                        Controls how smooth and natural the territory boundaries look. Higher values create 
                        more rounded, natural-looking boundaries.
                      </p>
                      <div className="mt-2">
                        <Badge variant="outline" className="text-xs">Recommended: 0.002°</Badge>
                        <Badge variant="outline" className="text-xs ml-1">Range: 0.0005° - 0.01°</Badge>
                      </div>
                    </Card>

                    <Card className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Advanced Options</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span><strong>Use Existing Patterns:</strong> Analyzes existing territories to maintain consistent patterns</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span><strong>Preserve Boundaries:</strong> Aligns territory boundaries with administrative boundaries</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Best Practices */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Best Practices
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-2">🎯 For Balanced Territories</h4>
                      <ul className="list-disc list-inside space-y-1 text-green-800">
                        <li>Use K-Means clustering method</li>
                        <li>Set customers per territory to 150-200</li>
                        <li>Enable "Use Existing Patterns" for consistency</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">🗺️ For Natural Boundaries</h4>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        <li>Use Hierarchical clustering method</li>
                        <li>Increase boundary smoothness to 0.003-0.005</li>
                        <li>Enable "Preserve Boundaries" for administrative alignment</li>
                      </ul>
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <h4 className="font-semibold text-orange-900 mb-2">⚡ For Quick Testing</h4>
                      <ul className="list-disc list-inside space-y-1 text-orange-800">
                        <li>Use Fast generation method</li>
                        <li>Start with default parameters</li>
                        <li>Iterate and refine based on results</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Current Status */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    Current System Status
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{customerCount}</div>
                      <div className="text-sm text-gray-600">Total Customers</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {Math.round(customerCount / criteria.customersPerTerritory)}
                      </div>
                      <div className="text-sm text-gray-600">Expected Territories</div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
