import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function UnauthorizedPage() {
  return (
    <DashboardLayout>
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Access Denied
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            You do not have the necessary permissions to view this page.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}
