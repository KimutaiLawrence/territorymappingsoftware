'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { useAuth } from '@/contexts/auth-context'
import Loader from '@/components/common/loader'
import { Card } from '@/components/ui/card'

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <Loader />
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      {/* <h1 className="text-3xl font-bold">Login</h1> */}
      {/* <p className="text-balance text-muted-foreground"> */}
        {/* Enter your email below to login to your account */}
      {/* </p> */}
      <Card className="p-6">
        <h2 className="text-2xl font-semibold text-center mb-4">
          Geospatial Territory Mapping System
        </h2>
        <LoginForm />
      </Card>
    </div>
  )
}