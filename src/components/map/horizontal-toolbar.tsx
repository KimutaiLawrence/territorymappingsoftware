'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Pipette,
  PenSquare,
  Trash2,
  Move,
  Download,
  Printer,
  Map,
  Circle,
  Home,
} from 'lucide-react'
import { DrawingTool } from '@/types'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface HorizontalToolbarProps {
  drawingTool: DrawingTool
  onDrawingToolChange: (tool: DrawingTool) => void
  onExport: () => void
  onPrint: () => void
  onHome: () => void
  isFeatureSelected: boolean
  isDrawingToolReady: boolean
  className?: string
}

export function HorizontalToolbar({
  drawingTool,
  onDrawingToolChange,
  onExport,
  onPrint,
  onHome,
  isFeatureSelected,
  isDrawingToolReady,
  className,
}: HorizontalToolbarProps) {
  const tools: {
    id: DrawingTool | 'pan' | 'export' | 'print'
    label: string
    icon: React.ReactNode
  }[] = [
    { id: 'simple_select', label: 'Select', icon: <Pipette className="h-4 w-4" /> },
    { id: 'direct_select', label: 'Edit Geometry', icon: <PenSquare className="h-4 w-4" /> },
    { id: 'draw_polygon', label: 'Draw Polygon', icon: <Map className="h-4 w-4" /> },
    { id: 'draw_point', label: 'Draw Point', icon: <Circle className="h-4 w-4" /> },
    { id: 'trash', label: 'Delete', icon: <Trash2 className="h-4 w-4" /> },
    { id: 'pan', label: 'Pan', icon: <Move className="h-4 w-4" /> },
  ]

  const actionButtons: {
    id: 'home' | 'export' | 'print'
    label: string
    icon: React.ReactNode
    action: () => void
  }[] = [
    { id: 'home', label: 'Home View', icon: <Home className="h-4 w-4" />, action: onHome },
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
            <Tooltip key={tool.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={drawingTool === tool.id || (tool.id === 'pan' && drawingTool === 'none') ? 'secondary' : 'outline'}
                  size="icon"
                  disabled={
                    (tool.id !== 'pan' && tool.id !== 'export' && tool.id !== 'print' && !isDrawingToolReady) ||
                    (tool.id === 'direct_select' && !isFeatureSelected)
                  }
                  onClick={() => {
                    if (tool.id !== 'pan' && tool.id !== 'export' && tool.id !== 'print') {
                        onDrawingToolChange(tool.id)
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
