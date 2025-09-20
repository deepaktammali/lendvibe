import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getBorrowers, getLastPaymentsByLoans, getLoans, getLoansWithCalculatedBalances, getPayments, getFixedIncomesWithTenants, getIncomePayments, getLastIncomePaymentsByFixedIncomes } from '@/lib/database';
import { calculateAccruedInterest, getDaysSinceLastPayment, getNextPaymentDate, calculateAccruedIncome, getDaysSinceLastIncomePayment, getNextIncomePaymentDate, type UpcomingPayment } from '@/lib/finance';
import { getLoanTypeLabel } from '@/lib/loans';
import { FIXED_INCOME_TYPE_LABELS } from '@/types/database';
import { AlertTriangle, Banknote, Clock, IndianRupee, TrendingUp, Users, Building2 } from 'lucide-react';
import { useEffect, useState, useMemo, useCallback } from 'react';

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
  const [upcomingLoanPayments, setUpcomingLoanPayments] = useState<UpcomingPayment[]>([]);
  const [upcomingFixedIncomePayments, setUpcomingFixedIncomePayments] = useState<UpcomingPayment[]>([]);
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
        const activeLoansWithCalculatedBalances = loansWithCalculatedBalances.filter(loan => loan.status === 'active');

        const totalOutstanding = activeLoansWithCalculatedBalances.reduce((sum, loan) => sum + loan.real_remaining_principal, 0);
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
        const upcomingLoanPaymentsList: UpcomingPayment[] = [];
        const upcomingFixedIncomePaymentsList: UpcomingPayment[] = [];
        let totalAccruedInterest = 0;
        let overdueCount = 0;
        const today = new Date().toISOString().split('T')[0];

        // Get all last payments in batch
        const loanIds = activeLoansWithCalculatedBalances.map(loan => loan.id);
        const fixedIncomeIds = activeFixedIncomeAssets.map(asset => asset.id);

        const [lastLoanPayments, lastIncomePayments] = await Promise.all([
          getLastPaymentsByLoans(loanIds),
          getLastIncomePaymentsByFixedIncomes(fixedIncomeIds),
        ]);

        // Process loans
        for (const loan of activeLoansWithCalculatedBalances) {
          const lastPayment = lastLoanPayments.get(loan.id);
          const daysSinceLastPayment = getDaysSinceLastPayment(loan, lastPayment?.payment_date);
          const accruedInterest = calculateAccruedInterest(loan);
          const nextDueDate = getNextPaymentDate(loan, lastPayment?.payment_date);

          totalAccruedInterest += accruedInterest;

          // Check if payment is overdue
          if (nextDueDate < today) {
            overdueCount++;
          }

          upcomingLoanPaymentsList.push({
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
          const lastPayment = lastIncomePayments.get(asset.id);
          const daysSinceLastPayment = getDaysSinceLastIncomePayment(asset, lastPayment?.payment_date);
          const accruedIncome = calculateAccruedIncome(asset);
          const nextDueDate = getNextIncomePaymentDate(asset, lastPayment?.payment_date);

          totalAccruedInterest += accruedIncome;

          // Check if payment is overdue
          if (nextDueDate < today) {
            overdueCount++;
          }

          upcomingFixedIncomePaymentsList.push({
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

        // Sort both lists by due date (overdue first)
        const sortByDueDate = (a: UpcomingPayment, b: UpcomingPayment) => {
          const isAOverdue = a.dueDate < today;
          const isBOverdue = b.dueDate < today;

          if (isAOverdue && !isBOverdue) return -1;
          if (!isAOverdue && isBOverdue) return 1;

          return a.dueDate.localeCompare(b.dueDate);
        };

        upcomingLoanPaymentsList.sort(sortByDueDate);
        upcomingFixedIncomePaymentsList.sort(sortByDueDate);

        setUpcomingLoanPayments(upcomingLoanPaymentsList);
        setUpcomingFixedIncomePayments(upcomingFixedIncomePaymentsList);
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

  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    });
    return (amount: number) => formatter.format(amount);
  }, []);

  const renderPaymentsTable = useCallback((payments: UpcomingPayment[], emptyMessage: string) => {
    if (payments.length === 0) {
      return <p className="text-muted-foreground">{emptyMessage}</p>;
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Party</TableHead>
              <TableHead className="min-w-[100px]">Type</TableHead>
              <TableHead className="min-w-[120px]">Due Date</TableHead>
              <TableHead className="min-w-[100px] hidden sm:table-cell">Days Since Last Payment</TableHead>
              <TableHead className="min-w-[120px]">Principal/Value</TableHead>
              <TableHead className="min-w-[120px]">Accrued Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.slice(0, 5).map((payment) => {
              const today = new Date().toISOString().split('T')[0];
              const isOverdue = payment.dueDate < today;
              const dueDateObj = new Date(payment.dueDate);
              const isDueSoon = !isOverdue && dueDateObj.getTime() - Date.now() <= 7 * 24 * 60 * 60 * 1000;

              return (
                <TableRow key={`${payment.type}-${payment.id}`} className={isOverdue ? 'bg-red-50' : isDueSoon ? 'bg-yellow-50' : ''}>
                  <TableCell className="font-medium">{payment.borrowerName}</TableCell>
                  <TableCell>{payment.assetType}</TableCell>
                  <TableCell>
                    <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}>
                      {isOverdue && <AlertTriangle className="h-4 w-4" />}
                      {dueDateObj.toLocaleDateString()}
                      {isOverdue && <span className="text-xs">(Overdue)</span>}
                      {isDueSoon && <span className="text-xs">(Due Soon)</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{payment.daysSinceLastPayment} days</TableCell>
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
      </div>
    );
  }, [formatCurrency]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4">
        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Borrowers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.totalBorrowers}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Active Loans</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.activeLoans}</div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Total Outstanding</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-base lg:text-lg font-bold break-words" title={formatCurrency(stats.totalOutstanding)}>
              {formatCurrency(stats.totalOutstanding)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Accrued Interest</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-base lg:text-lg font-bold break-words" title={formatCurrency(stats.totalAccruedInterest)}>
              {formatCurrency(stats.totalAccruedInterest)}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium leading-tight">Fixed Income Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats.activeFixedIncome}</div>
            <p className="text-xs text-muted-foreground break-words" title={formatCurrency(stats.totalFixedIncomeValue)}>
              {formatCurrency(stats.totalFixedIncomeValue)} value
            </p>
          </CardContent>
        </Card>

        <Card className="min-h-[120px]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Overdue Items</CardTitle>
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
            <CardTitle className="text-xs font-medium leading-tight">This Month's Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-sm sm:text-base lg:text-lg font-bold break-words" title={formatCurrency(stats.monthlyPayments)}>
              {formatCurrency(stats.monthlyPayments)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Payments Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Upcoming Loan Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderPaymentsTable(upcomingLoanPayments, "No active loans with upcoming payments.")}
            {upcomingLoanPayments.length > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                Showing 5 of {upcomingLoanPayments.length} items. View loans page for complete list.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Fixed Income Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Upcoming Fixed Income Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderPaymentsTable(upcomingFixedIncomePayments, "No active fixed income assets with upcoming payments.")}
            {upcomingFixedIncomePayments.length > 5 && (
              <p className="text-sm text-muted-foreground mt-4">
                Showing 5 of {upcomingFixedIncomePayments.length} items. View fixed income page for complete list.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}