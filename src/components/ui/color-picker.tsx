import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value?: string
  onChange: (color: string) => void
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const PRESET_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
  '#000000', // black
  '#ffffff', // white
  '#f59e0b', // amber
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f43f5e', // rose
  '#84cc16', // lime
]

export function ColorPicker({ value = '#3b82f6', onChange, className, size = 'md' }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(value)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleColorSelect = (color: string) => {
    setSelectedColor(color)
    onChange(color)
    setIsOpen(false)
  }

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const buttonSizeClasses = {
    xs: 'h-3 w-3 p-0',
    sm: 'h-4 w-4 p-0',
    md: 'h-6 w-6 p-0',
    lg: 'h-8 w-8 p-0'
  }

  return (
    <div className="relative" ref={pickerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "border border-gray-300 hover:border-gray-500 transition-colors rounded-sm",
          buttonSizeClasses[size],
          className
        )}
        style={{ backgroundColor: selectedColor }}
        title={`Current color: ${selectedColor} - Click to change`}
      >
        <div className={cn("rounded-sm", sizeClasses[size])} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-[180px]">
          <div className="space-y-2">
            {/* Preset colors grid */}
            <div className="grid grid-cols-8 gap-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  className={cn(
                    "h-4 w-4 rounded border transition-all hover:scale-110",
                    selectedColor === color 
                      ? "border-gray-800 shadow-sm" 
                      : "border-gray-300 hover:border-gray-500"
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>

            {/* Custom color input */}
            <div className="flex items-center space-x-1">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => handleColorSelect(e.target.value)}
                className="h-6 w-8 border border-gray-300 rounded cursor-pointer"
                title="Custom color picker"
              />
              <input
                type="text"
                value={selectedColor}
                onChange={(e) => {
                  if (e.target.value.match(/^#[0-9A-Fa-f]{6}$/)) {
                    handleColorSelect(e.target.value)
                  }
                }}
                className="flex-1 px-1 py-1 text-xs border border-gray-300 rounded"
                placeholder="#3b82f6"
                title="Enter hex color code"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
