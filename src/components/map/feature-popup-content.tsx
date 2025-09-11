'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { useRBAC } from '@/hooks/use-rbac'

interface FeaturePopupContentProps {
  feature: any
  onEdit: (feature: any) => void
}

export function FeaturePopupContent({ feature, onEdit }: FeaturePopupContentProps) {
  const { can } = useRBAC()
  const properties = feature.properties

  const canEdit = can('update', 'territory') || can('update', 'location') // Assuming territories and locations are the editable resources

  return (
    <div className="max-w-xs p-1">
      <div className="flex justify-between items-center mb-1">
        <h3 className="font-bold text-lg">{properties?.name || 'Feature Details'}</h3>
        {canEdit && (
          <Button variant="ghost" size="icon" onClick={() => onEdit(feature)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="text-sm max-h-48 overflow-y-auto">
        {Object.entries(properties).map(([key, value]) => {
          if (
            value &&
            typeof value !== 'object' &&
            key !== 'id' &&
            key !== 'geom'
          ) {
            return (
              <p key={key}>
                <strong className="capitalize">{key.replace(/_/g, ' ')}:</strong>{' '}
                {String(value)}
              </p>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
