import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { initDatabase } from './lib/database';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Borrowers from './pages/Borrowers';
import Loans from './pages/Loans';
import LoanDetail from './pages/LoanDetail';
import FixedIncome from './pages/FixedIncome';
import Payments from './pages/Payments';

function App() {
  useEffect(() => {
    // Initialize database on app start
    initDatabase().catch(console.error);
  }, []);

  return (
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
  );
}

export default App;
