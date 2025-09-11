'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Basemap } from '@/types'

interface BasemapSwitcherProps {
  basemaps: Basemap[]
  onBasemapChange: (basemap: Basemap) => void
}

export function BasemapSwitcher({
  basemaps,
  onBasemapChange,
}: BasemapSwitcherProps) {
  const [activeBasemap, setActiveBasemap] = useState(basemaps[0])

  const handleSelect = (basemap: Basemap) => {
    setActiveBasemap(basemap)
    onBasemapChange(basemap)
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-background/75 backdrop-blur-sm rounded-lg p-2 shadow-lg">
      <div className="flex flex-col items-center space-y-1">
        <h4 className="text-xs text-muted-foreground">
          basemaps
        </h4>
        <div className="flex items-center">
          {basemaps.map((basemap, index) => (
            <React.Fragment key={basemap.id}>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={
                        activeBasemap.id === basemap.id ? 'secondary' : 'ghost'
                      }
                      size="icon"
                      onClick={() => handleSelect(basemap)}
                      className="rounded-full h-10 w-10 flex items-center justify-center"
                    >
                      {basemap.icon}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{basemap.name}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {index < basemaps.length - 1 && (
                <div className="h-6 w-px bg-border mx-1" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
