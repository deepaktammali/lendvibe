import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Home, Users, Banknote, Receipt, IndianRupee, TrendingUp } from 'lucide-react'

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

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r">
        <div className="flex items-center gap-2 p-6 border-b">
          <IndianRupee className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-gray-900">LendTracker</h1>
        </div>

        <nav className="mt-6">
          <div className="px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg mb-1 transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
