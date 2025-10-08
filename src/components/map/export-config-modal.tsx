'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Download, Printer, X, Settings } from 'lucide-react'

interface ExportConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onExport: (config: ExportConfig) => void
  onPrint: (config: ExportConfig) => void
  mode: 'export' | 'print'
}

interface ExportConfig {
  format: 'pdf' | 'png' | 'jpg'
  layout: 'a4-portrait' | 'a4-landscape' | 'letter-portrait' | 'letter-landscape'
  dpi: number
  includeLegend: boolean
  includeScale: boolean
  includeNorthArrow: boolean
  includeTitle: boolean
  title: string
  quality: number
}

export function ExportConfigModal({ isOpen, onClose, onExport, onPrint, mode }: ExportConfigModalProps) {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'pdf',
    layout: 'a4-landscape',
    dpi: 300,
    includeLegend: true,
    includeScale: true,
    includeNorthArrow: true,
    includeTitle: true,
    title: 'Map Export',
    quality: 90
  })

  if (!isOpen) return null

  const handleSubmit = () => {
    if (mode === 'export') {
      onExport(config)
    } else {
      onPrint(config)
    }
    onClose()
  }

  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {mode === 'export' ? 'Export Configuration' : 'Print Configuration'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select 
              value={config.format} 
              onValueChange={(value: 'pdf' | 'png' | 'jpg') => setConfig(prev => ({ ...prev, format: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="jpg">JPG</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout Selection */}
          <div className="space-y-2">
            <Label htmlFor="layout">Layout</Label>
            <Select 
              value={config.layout} 
              onValueChange={(value: 'a4-portrait' | 'a4-landscape' | 'letter-portrait' | 'letter-landscape') => 
                setConfig(prev => ({ ...prev, layout: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4-portrait">A4 Portrait</SelectItem>
                <SelectItem value="a4-landscape">A4 Landscape</SelectItem>
                <SelectItem value="letter-portrait">Letter Portrait</SelectItem>
                <SelectItem value="letter-landscape">Letter Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* DPI Setting */}
          <div className="space-y-2">
            <Label htmlFor="dpi">DPI (Dots Per Inch)</Label>
            <div className="px-3">
              <Slider
                value={[config.dpi]}
                onValueChange={(value) => setConfig(prev => ({ ...prev, dpi: value[0] }))}
                min={72}
                max={600}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-1">
                <span>72 (Web)</span>
                <span>{config.dpi}</span>
                <span>600 (Print)</span>
              </div>
            </div>
          </div>

          {/* Quality Setting (for image formats) */}
          {config.format !== 'pdf' && (
            <div className="space-y-2">
              <Label htmlFor="quality">Quality (%)</Label>
              <div className="px-3">
                <Slider
                  value={[config.quality]}
                  onValueChange={(value) => setConfig(prev => ({ ...prev, quality: value[0] }))}
                  min={10}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-1">
                  <span>10%</span>
                  <span>{config.quality}%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>
          )}

          {/* Title Setting */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="includeTitle"
                checked={config.includeTitle}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeTitle: checked }))}
              />
              <Label htmlFor="includeTitle">Include Title</Label>
            </div>
            {config.includeTitle && (
              <input
                type="text"
                value={config.title}
                onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-input rounded-md"
                placeholder="Enter map title"
              />
            )}
          </div>

          {/* Additional Elements */}
          <div className="space-y-4">
            <Label>Additional Elements</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeLegend"
                  checked={config.includeLegend}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeLegend: checked }))}
                />
                <Label htmlFor="includeLegend">Include Legend</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeScale"
                  checked={config.includeScale}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeScale: checked }))}
                />
                <Label htmlFor="includeScale">Include Scale Bar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="includeNorthArrow"
                  checked={config.includeNorthArrow}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeNorthArrow: checked }))}
                />
                <Label htmlFor="includeNorthArrow">Include North Arrow</Label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex items-center gap-2">
              {mode === 'export' ? (
                <>
                  <Download className="w-4 h-4" />
                  Export Map
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Print Map
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
