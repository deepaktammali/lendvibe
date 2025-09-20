import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { initDatabase } from './lib/database';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import FixedIncome from './pages/FixedIncome';
import Payments from './pages/Payments';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('database')) {
          return false; // Don't retry database errors
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  useEffect(() => {
    // Initialize database on app start
    initDatabase().catch(console.error);
  }, []);

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
  );
}

export default App;
