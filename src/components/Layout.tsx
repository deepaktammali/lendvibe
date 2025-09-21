import { Banknote, Home, IndianRupee, Menu, Receipt, TrendingUp, Users, X } from 'lucide-react'
import { useState } from 'react'
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
]

interface SidebarContentProps {
  setSidebarOpen: (open: boolean) => void
}

const SidebarContent = ({ setSidebarOpen }: SidebarContentProps) => {
  const location = useLocation()

  return (
    <>
      <div className="flex items-center justify-between gap-2 p-6 border-b">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-gray-900">LendTracker</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <nav className="mt-6">
        <div className="px-3">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg mb-1 transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="sm:inline">{item.name}</span>
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden sm:block w-64 bg-white shadow-sm border-r">
        <SidebarContent setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <Button
          className="sm:hidden fixed inset-0 z-50 bg-black bg-opacity-50"
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

      {/* Mobile Sidebar */}
      <div
        className={cn(
          'sm:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent setSidebarOpen={setSidebarOpen} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="sm:hidden bg-white border-b px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold text-gray-900">LendTracker</h1>
          </div>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
