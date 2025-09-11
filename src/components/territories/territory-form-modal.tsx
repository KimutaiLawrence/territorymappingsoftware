'use client'

import React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Territory } from '@/types'

const territorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type TerritoryFormData = z.infer<typeof territorySchema>

interface TerritoryFormModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSubmit: (data: TerritoryFormData) => void
  territory?: Territory | null
}

export function TerritoryFormModal({
  isOpen,
  onOpenChange,
  onSubmit,
  territory,
}: TerritoryFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<TerritoryFormData>({
    resolver: zodResolver(territorySchema),
    defaultValues: {
      name: territory?.name || '',
      description: territory?.description || '',
      is_active: territory?.is_active ?? true,
    },
  })

  React.useEffect(() => {
    if (territory) {
      reset({
        name: territory.name,
        description: territory.description,
        is_active: territory.is_active,
      })
    } else {
      reset({
        name: '',
        description: '',
        is_active: true,
      })
    }
  }, [territory, reset])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{territory ? 'Edit Territory' : 'Create Territory'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register('description')} />
          </div>
          <div className="flex items-center space-x-2">
            <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                    <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                )}
            />
            <Label htmlFor="is_active">Is Active</Label>
          </div>
          <DialogFooter>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
