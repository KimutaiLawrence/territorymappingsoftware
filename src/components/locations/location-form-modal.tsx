'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MapPicker } from '@/components/common/map-picker'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Location } from '@/types'

const locationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state_code: z.string().min(1, 'State is required'),
  status: z.string().min(1, 'Status is required'),
  latitude: z.number(),
  longitude: z.number(),
  // Demographics
  asian_non_hispanic: z.number().optional(),
  black_non_hispanic: z.number().optional(),
  hispanic_latino: z.number().optional(),
  white_non_hispanic: z.number().optional(),
  other_demographics: z.number().optional(),
  // Economics
  average_hourly_wage: z.number().optional(),
  cost_of_living_index: z.number().optional(),
  median_home_value: z.number().optional(),
  unemployment_rate: z.number().optional(),
  // Business Metrics
  accessibility_score: z.number().optional(),
  buying_potential: z.number().optional(),
  competition_level: z.string().optional(),
  growth_rate: z.number().optional(),
  market_access_score: z.number().optional(),
  market_potential: z.number().optional(),
  priority_level: z.string().optional(),
  revenue_potential: z.number().optional(),
})

type LocationFormData = z.infer<typeof locationSchema>

interface LocationFormModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (data: LocationFormData) => void
  location?: Location | null
  locationType: 'current' | 'potential'
}

const statusOptions = {
  current: ['active', 'planned', 'inactive'],
  potential: ['high_priority', 'medium_priority', 'low_priority'],
}

export function LocationFormModal({
  isOpen,
  onOpenChange,
  onSubmit,
  location,
  locationType,
}: LocationFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      name: location?.name || '',
      address: location?.properties?.address || '',
      city: location?.properties?.city || '',
      state_code: location?.properties?.state_code || '',
      status: location?.properties?.status || '',
      latitude: location?.geom?.coordinates[1] || 37.0902,
      longitude: location?.geom?.coordinates[0] || -95.7129,
      // Demographics
      asian_non_hispanic: location?.properties?.demographics?.asian_non_hispanic,
      black_non_hispanic: location?.properties?.demographics?.black_non_hispanic,
      hispanic_latino: location?.properties?.demographics?.hispanic_latino,
      white_non_hispanic: location?.properties?.demographics?.white_non_hispanic,
      other_demographics: location?.properties?.demographics?.other,
      // Economics
      average_hourly_wage: location?.properties?.economics?.average_hourly_wage,
      cost_of_living_index: location?.properties?.economics?.cost_of_living_index,
      median_home_value: location?.properties?.economics?.median_home_value,
      unemployment_rate: location?.properties?.economics?.unemployment_rate,
      // Business Metrics
      accessibility_score: location?.properties?.business_metrics?.accessibility_score,
      buying_potential: location?.properties?.business_metrics?.buying_potential,
      competition_level: location?.properties?.business_metrics?.competition_level,
      growth_rate: location?.properties?.business_metrics?.growth_rate,
      market_access_score: location?.properties?.business_metrics?.market_access_score,
      market_potential: location?.properties?.business_metrics?.market_potential,
      priority_level: location?.properties?.business_metrics?.priority_level,
      revenue_potential: location?.properties?.business_metrics?.revenue_potential,
    },
  })

  React.useEffect(() => {
    if (location) {
      reset({
        name: location.name,
        address: location.properties?.address,
        city: location.properties?.city,
        state_code: location.properties?.state_code,
        status: location.properties?.status,
        latitude: location.geom?.coordinates[1],
        longitude: location.geom?.coordinates[0],
        // Demographics
        asian_non_hispanic: location.properties?.demographics?.asian_non_hispanic,
        black_non_hispanic: location.properties?.demographics?.black_non_hispanic,
        hispanic_latino: location.properties?.demographics?.hispanic_latino,
        white_non_hispanic: location.properties?.demographics?.white_non_hispanic,
        other_demographics: location.properties?.demographics?.other,
        // Economics
        average_hourly_wage: location.properties?.economics?.average_hourly_wage,
        cost_of_living_index: location.properties?.economics?.cost_of_living_index,
        median_home_value: location.properties?.economics?.median_home_value,
        unemployment_rate: location.properties?.economics?.unemployment_rate,
        // Business Metrics
        accessibility_score: location.properties?.business_metrics?.accessibility_score,
        buying_potential: location.properties?.business_metrics?.buying_potential,
        competition_level: location.properties?.business_metrics?.competition_level,
        growth_rate: location.properties?.business_metrics?.growth_rate,
        market_access_score: location.properties?.business_metrics?.market_access_score,
        market_potential: location.properties?.business_metrics?.market_potential,
        priority_level: location.properties?.business_metrics?.priority_level,
        revenue_potential: location.properties?.business_metrics?.revenue_potential,
      })
    } else {
      reset({
        name: '',
        address: '',
        city: '',
        state_code: '',
        status: '',
        latitude: 37.0902,
        longitude: -95.7129,
      })
    }
  }, [location, reset])

  const handleLocationSelect = ({ lat, lng }: { lat: number; lng: number }) => {
    setValue('latitude', lat)
    setValue('longitude', lng)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{location ? 'Edit Location' : 'Create Location'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs defaultValue="general">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="general">General</TabsTrigger>
                    <TabsTrigger value="address">Address & Map</TabsTrigger>
                    <TabsTrigger value="demographics">Demographics</TabsTrigger>
                    <TabsTrigger value="economics">Economics</TabsTrigger>
                    <TabsTrigger value="business">Business</TabsTrigger>
                </TabsList>
                <TabsContent value="general">
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" {...register('name')} />
                            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Controller
                                control={control}
                                name="status"
                                render={({ field }) => (
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {statusOptions[locationType].map((option) => (
                                        <SelectItem key={option} value={option}>
                                        {option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                )}
                            />
                            {errors.status && <p className="text-sm text-red-500">{errors.status.message}</p>}
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="address">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Address</Label>
                                <Input id="address" {...register('address')} />
                                {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" {...register('city')} />
                                {errors.city && <p className="text-sm text-red-500">{errors.city.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="state_code">State</Label>
                                <Input id="state_code" {...register('state_code')} />
                                {errors.state_code && <p className="text-sm text-red-500">{errors.state_code.message}</p>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Pinpoint Location</Label>
                            <MapPicker 
                            onLocationSelect={handleLocationSelect} 
                            initialCoordinates={
                                location && location.geom?.coordinates && 
                                location.geom.coordinates.length >= 2 &&
                                !isNaN(location.geom.coordinates[0]) && 
                                !isNaN(location.geom.coordinates[1]) &&
                                isFinite(location.geom.coordinates[0]) &&
                                isFinite(location.geom.coordinates[1]) ? 
                                { lat: location.geom.coordinates[1], lng: location.geom.coordinates[0] } : 
                                undefined
                            }
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Input {...register('latitude')} readOnly placeholder="Latitude" />
                                <Input {...register('longitude')} readOnly placeholder="Longitude" />
                            </div>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="demographics">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Asian (Non-Hispanic)</Label>
                            <Input type="number" {...register('asian_non_hispanic', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Black (Non-Hispanic)</Label>
                            <Input type="number" {...register('black_non_hispanic', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Hispanic/Latino</Label>
                            <Input type="number" {...register('hispanic_latino', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>White (Non-Hispanic)</Label>
                            <Input type="number" {...register('white_non_hispanic', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Other</Label>
                            <Input type="number" {...register('other_demographics', { valueAsNumber: true })} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="economics">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Average Hourly Wage</Label>
                            <Input type="number" {...register('average_hourly_wage', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Cost of Living Index</Label>
                            <Input type="number" {...register('cost_of_living_index', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Median Home Value</Label>
                            <Input type="number" {...register('median_home_value', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Unemployment Rate</Label>
                            <Input type="number" {...register('unemployment_rate', { valueAsNumber: true })} />
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="business">
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Accessibility Score</Label>
                            <Input type="number" {...register('accessibility_score', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Buying Potential</Label>
                            <Input type="number" {...register('buying_potential', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Competition Level</Label>
                            <Input {...register('competition_level')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Growth Rate</Label>
                            <Input type="number" {...register('growth_rate', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Market Access Score</Label>
                            <Input type="number" {...register('market_access_score', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Market Potential</Label>
                            <Input type="number" {...register('market_potential', { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Priority Level</Label>
                            <Input {...register('priority_level')} />
                        </div>
                        <div className="space-y-2">
                            <Label>Revenue Potential</Label>
                            <Input type="number" {...register('revenue_potential', { valueAsNumber: true })} />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
            <DialogFooter>
                <Button type="submit">Save</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
