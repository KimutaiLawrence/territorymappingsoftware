'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/auth-context'
import {
  Map,
  MapPin,
  Users,
  Database,
  Settings,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelRightClose,
  LayoutDashboard,
  Target,
  Globe2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const navigation = [
    { name: 'Map', href: '/dashboard', icon: Map },
    { name: 'Territories', href: '/territories', icon: Globe2, color: 'text-sky-500' },
    { name: 'Current Locations', href: '/locations', icon: MapPin, color: 'text-green-500' },
    { name: 'Potential Locations', href: '/potential-locations', icon: Target, color: 'text-orange-500' },
    { name: 'Datasets', href: '/datasets', icon: Database },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
        <div className="h-14 flex items-center justify-between">
          <div className="flex items-center">
            <div className="hidden md:flex w-16 justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                {isSidebarCollapsed ? (
                  <PanelRightClose className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )}
              </Button>
            </div>
            <div className="md:hidden pl-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <aside className="w-full h-full bg-background">
                    <div className="p-4 border-b">
                      <h2 className="text-lg font-semibold">Territory Mapper</h2>
                    </div>
                    <nav className="space-y-2 p-4">
                      {navigation.map(item => (
                        <Button
                          key={item.name}
                          variant="ghost"
                          className="w-full justify-start"
                          onClick={() => router.push(item.href)}
                          title={item.name}
                        >
                          <item.icon className={cn('mr-2 h-4 w-4', item.color)} />
                          <span>{item.name}</span>
                        </Button>
                      ))}
                    </nav>
                  </aside>
                </SheetContent>
              </Sheet>
            </div>
            <h1 className="text-xl font-semibold pl-2">Territory Mapper</h1>
          </div>
          <div className="flex items-center space-x-4 pr-4">
            <Badge variant="outline">Beta</Badge>
            {user && (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">
                    {user.first_name} {user.last_name}
                  </span>
                  <Badge variant="secondary">{user.role.name}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            'border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 hidden md:block',
            isSidebarCollapsed ? 'w-16' : 'w-64'
          )}
        >
          <nav className="space-y-2 p-4">
            {navigation.map(item => (
              <Button
                key={item.name}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => router.push(item.href)}
                title={item.name}
              >
                <item.icon className={cn('mr-2 h-4 w-4', item.color)} />
                {!isSidebarCollapsed && <span>{item.name}</span>}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}