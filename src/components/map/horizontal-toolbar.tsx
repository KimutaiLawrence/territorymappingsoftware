'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Pipette,
  Trash2,
  Move,
  Download,
  Printer,
  Map,
  Circle,
  Home,
  Target,
  Save,
} from 'lucide-react'
import { DrawingTool } from '@/types'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HorizontalToolbarProps {
  drawingTool: DrawingTool
  onDrawingToolChange: (tool: DrawingTool) => void
  onExport: () => void
  onPrint: () => void
  onHome: () => void
  onTerritoryGenerator: () => void
  isFeatureSelected: boolean
  isDrawingToolReady: boolean
  isEditingMode: boolean
  onSave: () => void
  onDelete: () => void
  isSaving: boolean
  locationDrawType: 'current' | 'potential'
  onLocationDrawTypeChange: (type: 'current' | 'potential') => void
  className?: string
}

export function HorizontalToolbar({
  drawingTool,
  onDrawingToolChange,
  onExport,
  onPrint,
  onHome,
  onTerritoryGenerator,
  isFeatureSelected,
  isDrawingToolReady,
  isEditingMode,
  onSave,
  onDelete,
  isSaving,
  locationDrawType,
  onLocationDrawTypeChange,
  className,
}: HorizontalToolbarProps) {
  const tools: {
    id: DrawingTool | 'pan' | 'export' | 'print' | 'save'
    label: string
    icon: React.ReactNode
  }[] = [
    { id: 'simple_select', label: 'Select', icon: <Pipette className="h-4 w-4" /> },
    { id: 'save', label: 'Save Changes', icon: <Save className="h-4 w-4" /> },
    { id: 'draw_polygon', label: 'Draw Polygon', icon: <Map className="h-4 w-4" /> },
    { id: 'draw_point', label: 'Draw Point', icon: <Circle className="h-4 w-4" /> },
    { id: 'trash', label: 'Delete', icon: <Trash2 className="h-4 w-4" /> },
    { id: 'pan', label: 'Pan', icon: <Move className="h-4 w-4" /> },
  ]

  const actionButtons: {
    id: 'home' | 'export' | 'print' | 'territory-generator'
    label: string
    icon: React.ReactNode
    action: () => void
  }[] = [
    { id: 'home', label: 'Home View', icon: <Home className="h-4 w-4" />, action: onHome },
    { id: 'territory-generator', label: 'Generate Territories', icon: <Target className="h-4 w-4" />, action: onTerritoryGenerator },
    { id: 'export', label: 'Export PDF', icon: <Download className="h-4 w-4" />, action: onExport },
    { id: 'print', label: 'Print PDF', icon: <Printer className="h-4 w-4" />, action: onPrint },
  ]


  return (
    <div
      className={cn(
        'absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-background/95 p-2 rounded-lg shadow-md border',
        className
      )}
    >
      <TooltipProvider>
        <div className="flex items-center space-x-2">
          {tools.map(tool => (
            tool.id === 'draw_point' ? (
              <DropdownMenu key={tool.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant={drawingTool === 'draw_point' ? 'default' : 'outline'}
                        size="icon"
                        className={drawingTool === 'draw_point' ? `bg-${locationDrawType === 'current' ? 'green' : 'yellow'}-500 text-white` : ''}
                        disabled={!isDrawingToolReady}
                      >
                        {tool.icon}
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tool.label} ({locationDrawType})</p>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={() => { onLocationDrawTypeChange('current'); onDrawingToolChange('draw_point'); }}>
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-2" />
                      Current Location
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => { onLocationDrawTypeChange('potential'); onDrawingToolChange('draw_point'); }}>
                    <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2" />
                      Potential Location
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={drawingTool === tool.id || (tool.id === 'pan' && drawingTool === 'none') ? 'default' : 'outline'}
                  size="icon"
                  className={
                    drawingTool === tool.id || (tool.id === 'pan' && drawingTool === 'none')
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : tool.id === 'save' && (isFeatureSelected || isEditingMode) && !isSaving
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : ''
                  }
                  disabled={
                    (tool.id !== 'pan' && tool.id !== 'export' && tool.id !== 'print' && tool.id !== 'save' && !isDrawingToolReady) ||
                    (tool.id === 'save' && (isSaving || (!isFeatureSelected && !isEditingMode))) ||
                    (tool.id === 'trash' && !isFeatureSelected)
                  }
                  onClick={() => {
                    if (tool.id === 'save') {
                      onSave()
                    } else if (tool.id === 'trash') {
                      onDelete()
                    } else if (tool.id !== 'pan' && tool.id !== 'export' && tool.id !== 'print') {
                        onDrawingToolChange(tool.id as DrawingTool)
                    } else if (tool.id === 'pan') {
                        onDrawingToolChange('none') // Or a specific pan mode if available
                    }
                  }}
                >
                  {tool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tool.label}</p>
              </TooltipContent>
            </Tooltip>
            )
          ))}
          <div className="border-l h-6 mx-2"></div>
          {actionButtons.map(button => (
             <Tooltip key={button.id}>
             <TooltipTrigger asChild>
               <Button
                 variant={'outline'}
                 size="icon"
                 onClick={button.action}
               >
                 {button.icon}
               </Button>
             </TooltipTrigger>
             <TooltipContent>
               <p>{button.label}</p>
             </TooltipContent>
           </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}
