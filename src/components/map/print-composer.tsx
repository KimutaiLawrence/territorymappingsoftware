/* eslint-disable @typescript-eslint/ban-ts-comment */
'use client'

import React, { useState } from 'react'
import jsPDF from 'jspdf'
// @ts-ignore
import { applyPlugin } from 'jspdf-autotable'
applyPlugin(jsPDF)
import html2canvas from 'html2canvas'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import maplibregl from 'maplibre-gl'
import { MapLayer } from '@/types'
import { exportMapAsPDF } from '@/lib/pdf-export'


interface PrintComposerProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  map: maplibregl.Map | null
  layers: MapLayer[]
}

export function PrintComposer({ isOpen, onOpenChange, map, layers }: PrintComposerProps) {
  const [title, setTitle] = useState('My Map')
  const [layout, setLayout] = useState<'a4-portrait' | 'a4-landscape'>('a4-landscape')
  const [includeLegend, setIncludeLegend] = useState(true)
  const [includeScaleBar, setIncludeScaleBar] = useState(true)
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true)

  const handleExport = async () => {
    if (!map) return

    await exportMapAsPDF(
        map,
        layers,
        title,
        layout,
        includeLegend,
        includeScaleBar,
        includeNorthArrow
    )
    
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Print Map</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Map Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="layout">Layout</Label>
             <Select value={layout} onValueChange={(value: 'a4-portrait' | 'a4-landscape') => setLayout(value)}>
                <SelectTrigger>
                    <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="a4-portrait">A4 Portrait</SelectItem>
                    <SelectItem value="a4-landscape">A4 Landscape</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="legend" checked={includeLegend} onCheckedChange={(checked) => setIncludeLegend(!!checked)} />
            <Label htmlFor="legend">Include Legend</Label>
          </div>
           <div className="flex items-center space-x-2">
            <Checkbox id="scalebar" checked={includeScaleBar} onCheckedChange={(checked) => setIncludeScaleBar(!!checked)} />
            <Label htmlFor="scalebar">Include Scale Bar</Label>
          </div>
           <div className="flex items-center space-x-2">
            <Checkbox id="northarrow" checked={includeNorthArrow} onCheckedChange={(checked) => setIncludeNorthArrow(!!checked)} />
            <Label htmlFor="northarrow">Include North Arrow</Label>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleExport}>Export PDF</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
