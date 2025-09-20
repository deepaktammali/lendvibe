import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useEffect } from 'react'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { initDatabase } from './lib/database'
import Borrowers from './pages/Borrowers'
import Dashboard from './pages/Dashboard'
import FixedIncome from './pages/FixedIncome'
import LoanDetail from './pages/LoanDetail'
import Loans from './pages/Loans'
import Payments from './pages/Payments'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('database')) {
          return false // Don't retry database errors
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: false,
    },
  },
})

function App() {
  useEffect(() => {
    // Initialize database on app start
    initDatabase().catch((error) => {
      console.error('Failed to initialize database:', error)
    })
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/borrowers" element={<Borrowers />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/loans/:id" element={<LoanDetail />} />
            <Route path="/fixed-income" element={<FixedIncome />} />
            <Route path="/payments" element={<Payments />} />
          </Routes>
        </Layout>
      </Router>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
