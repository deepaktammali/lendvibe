import {
  Banknote,
  Home,
  IndianRupee,
  Menu,
  Receipt,
  Settings,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Borrowers', href: '/borrowers', icon: Users },
  { name: 'Loans', href: '/loans', icon: Banknote },
  { name: 'Fixed Income', href: '/fixed-income', icon: TrendingUp },
  { name: 'Payments', href: '/payments', icon: Receipt },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarContentProps {
  setSidebarOpen: (open: boolean) => void
  expanded?: boolean
  setSidebarExpanded?: (expanded: boolean) => void
}

const SidebarContent = ({ setSidebarOpen, expanded, setSidebarExpanded }: SidebarContentProps) => {
  const location = useLocation()
  const [showText, setShowText] = useState(false)

  // Delay showing text until expansion animation is nearly complete
  React.useEffect(() => {
    if (expanded) {
      const timer = setTimeout(() => setShowText(true), 250) // Show text after 250ms
      return () => clearTimeout(timer)
    } else {
      setShowText(false) // Immediately hide text when collapsing
    }
  }, [expanded])

  return (
    <>
      <div className="flex items-center gap-2 p-6 border-b min-h-[72px]">
        {expanded ? (
          <>
            <div className="flex items-center gap-2">
              <IndianRupee className="h-6 w-6 text-primary" />
              {showText && (
                <h1 className="text-xl font-bold text-sidebar-foreground">LendTracker</h1>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarExpanded?.(false)}
              className="ml-auto"
            >
              <X className="h-6 w-6" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarExpanded?.(true)}
            className="w-full flex justify-center items-center p-0 h-full"
          >
            <div className="flex flex-col items-center gap-2">
              <IndianRupee className="h-6 w-6 text-primary" />
              <Menu className="h-6 w-6" />
            </div>
          </Button>
        )}
      </div>

      <nav className="mt-6">
        <div className="px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => {
                  setSidebarOpen(false)
                  setSidebarExpanded?.(false)
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg mb-1 transition-all duration-200',
                  expanded ? 'justify-start' : 'justify-center',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {expanded && showText && (
                  <span className="transition-all duration-200 opacity-100">{item.name}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Expandable sidebar */}
      <div
        className={cn(
          'bg-sidebar shadow-sm border-sidebar-border flex-shrink-0 transition-all duration-300 ease-in-out',
          sidebarExpanded ? 'w-64' : 'w-16'
        )}
      >
        <SidebarContent
          setSidebarOpen={setSidebarOpen}
          expanded={sidebarExpanded}
          setSidebarExpanded={setSidebarExpanded}
        />
      </div>

      {/* Mobile Sidebar Overlay - still needed for mobile menu */}
      {sidebarOpen && (
        <Button
          className="sm:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSidebarOpen(false)
            }
          }}
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Mobile Sidebar - still needed for mobile menu */}
      <div
        className={cn(
          'sm:hidden fixed inset-y-0 left-0 z-50 w-64 bg-sidebar shadow-lg border-sidebar-border transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="sm:hidden bg-background border-b px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-foreground">LendTracker</h1>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
