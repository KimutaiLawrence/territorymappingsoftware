'use client'

import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAllOrganizations, useAvailableCountries } from '@/hooks/use-api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'
import { Combobox } from '@/components/ui/combobox';

const importSchema = z.object({
  organization_id: z.string().min(1, 'Organization is required.'),
  country_code: z.string().length(3, 'Country code must be 3 characters.'),
});

interface ImportFormProps {
  onSubmit: (data: z.infer<typeof importSchema>) => void
  isSubmitting: boolean
}

export function ImportForm({ onSubmit, isSubmitting }: ImportFormProps) {
  const { data: orgData, isLoading: orgsLoading } = useAllOrganizations();
  const { data: countryData, isLoading: countriesLoading, isError: countriesError } = useAvailableCountries();

  const form = useForm<z.infer<typeof importSchema>>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      organization_id: '',
      country_code: '',
    },
  });

  const { control, handleSubmit } = form;

  return (
    <Form {...form}>
      <Alert className="mb-6">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          This action will download and ingest administrative boundaries for the selected country. This may take a few moments. Please do not navigate away from the page after starting the import.
        </AlertDescription>
      </Alert>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="organization_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assign to Organization</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={orgsLoading}>
                      <SelectValue placeholder="Select an organization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {orgData?.organizations.map(org => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <Alert>
            <AlertTitle>GIS Data Import</AlertTitle>
            <AlertDescription>
              This tool ingests administrative boundaries (countries, states, counties, etc.)
              for the selected country. The data will be associated with the chosen organization.
              Please ensure you have the rights to use this data.
            </AlertDescription>
          </Alert>

          <FormField
            control={control}
            name="country_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Combobox
                    options={countryData?.countries.map(c => ({ value: c.code, label: `${c.name} (${c.code})` })) || []}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select country..."
                    searchPlaceholder="Search country..."
                    emptyText={
                      countriesLoading ? "Loading countries..." : 
                      countriesError ? "Failed to load countries." : "No country found."
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Ingesting Data...' : 'Start Import'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
