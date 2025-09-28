'use client'

import React, { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRoles, useAllOrganizations } from '@/hooks/use-api'
import { User } from '@/types'
import { useAuth } from '@/contexts/auth-context'

interface UserFormProps {
  onSubmit: (data: any) => void
  onCancel: () => void
  user?: User
}

export function UserForm({ onSubmit, onCancel, user }: UserFormProps) {
  const { user: currentUser } = useAuth()
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const { data: organizations, isLoading: orgsLoading } = useAllOrganizations()

  const formSchema = useMemo(() => {
    const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
      role_id: z.string().min(1, 'Role is required'),
  password: z.string().optional(),
      confirm_password: z.string().optional(),
      organization_id: z.string().optional(),
    });

    return schema.superRefine(({ confirm_password, password }, ctx) => {
      // Case 1: NEW USER - password is required
      if (!user) {
        if (!password || password.length < 8) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Password is required (min 8 characters).',
            path: ['password'],
          });
        }
      }

      // Case 2: EXISTING USER - password is optional, but if present, must be valid
      if (user && password && password.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'New password must be at least 8 characters.',
          path: ['password'],
        });
      }

      // UNIVERSAL: If a password is being set, it must match the confirmation
      if (password !== confirm_password) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Passwords do not match.',
          path: ['confirm_password'],
        });
      }
    });
  }, [user]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
      role_id: user?.role.id || '',
      password: '',
      confirm_password: '',
      organization_id: user ? (user.organization?.id || 'none') : '',
    },
  })

  const onSubmitHandler = (data: z.infer<typeof formSchema>) => {
    onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitHandler)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="first_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First Name</FormLabel>
              <FormControl>
                  <Input placeholder="John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="last_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Name</FormLabel>
              <FormControl>
                  <Input placeholder="Doe" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="john.doe@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger disabled={rolesLoading}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles?.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {currentUser?.is_superadmin && (
          <FormField
            control={form.control}
            name="organization_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger disabled={orgsLoading}>
                      <SelectValue placeholder="Assign an organization" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">
                      <em>None (user will be a superadmin)</em>
                    </SelectItem>
                    {organizations?.map(org => (
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{user ? 'New Password' : 'Password'}</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirm_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save
          </Button>
        </div>
      </form>
    </Form>
  )
}
