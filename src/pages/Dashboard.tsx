import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getBorrowers, getLastPaymentByLoan, getLoans, getLoansWithCalculatedBalances, getPayments, getFixedIncomesWithTenants, getIncomePayments, getLastIncomePaymentByFixedIncome } from '@/lib/database';
import { calculateAccruedInterest, getDaysSinceLastPayment, getNextPaymentDate, calculateAccruedIncome, getDaysSinceLastIncomePayment, getNextIncomePaymentDate, type UpcomingPayment } from '@/lib/finance';
import { getLoanTypeLabel } from '@/lib/loans';
import { FIXED_INCOME_TYPE_LABELS } from '@/types/database';
import { AlertTriangle, Banknote, Clock, IndianRupee, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalBorrowers: 0,
    activeLoans: 0,
    activeFixedIncome: 0,
    totalOutstanding: 0,
    totalFixedIncomeValue: 0,
    monthlyPayments: 0,
    totalAccruedInterest: 0,
    overdueCount: 0,
  });
  const [upcomingPayments, setUpcomingPayments] = useState<UpcomingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [borrowers, loans, payments, loansWithCalculatedBalances, fixedIncomes, incomePayments] = await Promise.all([
          getBorrowers(),
          getLoans(),
          getPayments(),
          getLoansWithCalculatedBalances(),
          getFixedIncomesWithTenants(),
          getIncomePayments(),
        ]);

        const activeLoans = loans.filter(loan => loan.status === 'active');
        const activeFixedIncomeAssets = fixedIncomes.filter(asset => asset.status === 'active');
        const totalOutstanding = loansWithCalculatedBalances.reduce((sum, loan) => sum + loan.real_remaining_principal, 0);
        const totalFixedIncomeValue = activeFixedIncomeAssets.reduce((sum, asset) => sum + asset.principal_amount, 0);

        // Calculate payments from current month
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const monthlyLoanPayments = payments
          .filter(payment => payment.payment_date.startsWith(currentMonth))
          .reduce((sum, payment) => sum + payment.amount, 0);
        const monthlyIncomePayments = incomePayments
          .filter(payment => payment.payment_date.startsWith(currentMonth))
          .reduce((sum, payment) => sum + payment.amount, 0);
        const monthlyPayments = monthlyLoanPayments + monthlyIncomePayments;

        // Calculate upcoming payments and accrued interest
        const upcomingPaymentsList: UpcomingPayment[] = [];
        let totalAccruedInterest = 0;
        let overdueCount = 0;
        const today = new Date().toISOString().split('T')[0];

        // Process loans
        for (const loan of loansWithCalculatedBalances) {
          const lastPayment = await getLastPaymentByLoan(loan.id);
          const daysSinceLastPayment = getDaysSinceLastPayment(loan, lastPayment?.payment_date);
          const accruedInterest = calculateAccruedInterest(loan);
          const nextDueDate = getNextPaymentDate(loan, lastPayment?.payment_date);

          totalAccruedInterest += accruedInterest;

          // Check if payment is overdue
          if (nextDueDate < today) {
            overdueCount++;
          }

          upcomingPaymentsList.push({
            id: loan.id,
            type: 'loan',
            borrowerName: loan.borrower_name,
            assetType: getLoanTypeLabel(loan.loan_type),
            dueDate: nextDueDate,
            accruedInterest,
            daysSinceLastPayment,
            currentBalance: loan.current_balance,
            realRemainingPrincipal: loan.real_remaining_principal,
          });
        }

        // Process fixed income assets
        for (const asset of activeFixedIncomeAssets) {
          const lastPayment = await getLastIncomePaymentByFixedIncome(asset.id);
          const daysSinceLastPayment = getDaysSinceLastIncomePayment(asset, lastPayment?.payment_date);
          const accruedIncome = calculateAccruedIncome(asset);
          const nextDueDate = getNextIncomePaymentDate(asset, lastPayment?.payment_date);

          totalAccruedInterest += accruedIncome;

          // Check if payment is overdue
          if (nextDueDate < today) {
            overdueCount++;
          }

          upcomingPaymentsList.push({
            id: asset.id,
            type: 'fixed_income',
            borrowerName: asset.tenant_name,
            assetType: FIXED_INCOME_TYPE_LABELS[asset.income_type],
            dueDate: nextDueDate,
            accruedInterest: accruedIncome,
            daysSinceLastPayment,
            currentBalance: asset.principal_amount,
            assetValue: asset.principal_amount,
          });
        }

        // Sort by due date (overdue first)
        upcomingPaymentsList.sort((a, b) => {
          const isAOverdue = a.dueDate < today;
          const isBOverdue = b.dueDate < today;

          if (isAOverdue && !isBOverdue) return -1;
          if (!isAOverdue && isBOverdue) return 1;

          return a.dueDate.localeCompare(b.dueDate);
        });

        setUpcomingPayments(upcomingPaymentsList);
        setStats({
          totalBorrowers: borrowers.length,
          activeLoans: activeLoans.length,
          activeFixedIncome: activeFixedIncomeAssets.length,
          totalOutstanding,
          totalFixedIncomeValue,
          monthlyPayments,
          totalAccruedInterest,
          overdueCount,
        });
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your lending operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">Total Borrowers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalBorrowers}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">Active Loans</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.activeLoans}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={formatCurrency(stats.totalOutstanding)}>
              {formatCurrency(stats.totalOutstanding)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">Accrued Interest</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={formatCurrency(stats.totalAccruedInterest)}>
              {formatCurrency(stats.totalAccruedInterest)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">Fixed Income Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.activeFixedIncome}</div>
            <p className="text-xs text-muted-foreground truncate" title={formatCurrency(stats.totalFixedIncomeValue)}>
              {formatCurrency(stats.totalFixedIncomeValue)} value
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">Overdue Items</CardTitle>
            <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${stats.overdueCount > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${stats.overdueCount > 0 ? 'text-red-600' : ''}`}>
              {stats.overdueCount}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium truncate">This Month's Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" title={formatCurrency(stats.monthlyPayments)}>
              {formatCurrency(stats.monthlyPayments)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingPayments.length === 0 ? (
            <p className="text-muted-foreground">No active loans or fixed income assets with upcoming payments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Party</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Since Last Payment</TableHead>
                  <TableHead>Principal/Value</TableHead>
                  <TableHead>Accrued Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPayments.slice(0, 10).map((payment) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isOverdue = payment.dueDate < today;
                  const isDueSoon = !isOverdue && new Date(payment.dueDate).getTime() - new Date().getTime() <= 7 * 24 * 60 * 60 * 1000;

                  return (
                    <TableRow key={`${payment.type}-${payment.id}`} className={isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}>
                      <TableCell className="font-medium">{payment.borrowerName}</TableCell>
                      <TableCell>{payment.assetType}</TableCell>
                      <TableCell>
                        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}>
                          {isOverdue && <AlertTriangle className="h-4 w-4" />}
                          {new Date(payment.dueDate).toLocaleDateString()}
                          {isOverdue && <span className="text-xs">(Overdue)</span>}
                          {isDueSoon && <span className="text-xs">(Due Soon)</span>}
                        </div>
                      </TableCell>
                      <TableCell>{payment.daysSinceLastPayment} days</TableCell>
                      <TableCell>
                        {payment.type === 'loan' && payment.realRemainingPrincipal !== undefined
                          ? formatCurrency(payment.realRemainingPrincipal)
                          : formatCurrency(payment.assetValue || payment.currentBalance)
                        }
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(payment.accruedInterest)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          {upcomingPayments.length > 10 && (
            <p className="text-sm text-muted-foreground mt-4">
              Showing 10 of {upcomingPayments.length} items. View loans and fixed income pages for complete lists.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}