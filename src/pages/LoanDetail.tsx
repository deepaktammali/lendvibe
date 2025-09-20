import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetBorrower } from '@/hooks/api/useBorrowers';
import { useGetLoan } from '@/hooks/api/useLoans';
import { useGetPaymentsByLoan } from '@/hooks/api/usePayments';
import { calculateAccruedInterest, getDaysSinceLastPayment, getNextPaymentDate } from '@/lib/finance';
import { getLoanTypeLabel } from '@/lib/loans';
import type { Loan } from '@/types/api/loans';
import type { Payment } from '@/types/api/payments';
import { AlertTriangle, ArrowLeft, Calendar, Clock, IndianRupee, TrendingUp, User } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use the new TanStack Query hooks
  const { data: loan, isLoading: loanLoading, error: loanError } = useGetLoan(id || '');
  const { data: borrower, isLoading: borrowerLoading } = useGetBorrower(loan?.borrower_id || '');
  const { data: payments = [], isLoading: paymentsLoading } = useGetPaymentsByLoan(id || '');

  const loading = loanLoading || borrowerLoading || paymentsLoading;
  const error = loanError;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getPaymentTypeBadge = (type: Payment['payment_type']) => {
    const variants = {
      principal: 'default',
      interest: 'secondary',
      mixed: 'outline'
    } as const;

    const labels = {
      principal: 'Principal',
      interest: 'Interest',
      mixed: 'Mixed'
    };

    return (
      <Badge variant={variants[type]}>
        {labels[type]}
      </Badge>
    );
  };

  const getLoanTypeBadge = (type: string) => {
    const variants = {
      installment: 'default',
      bullet: 'secondary',
      land_lease: 'outline',
      rent_agreement: 'outline',
      fixed_deposit_income: 'outline'
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {getLoanTypeLabel(type as Loan['loan_type'])}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading loan details...</div>
      </div>
    );
  }

  if (error || !loan) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Failed to load loan details</div>
      </div>
    );
  }

  if (!borrower) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Borrower not found</div>
      </div>
    );
  }

  // Calculate loan statistics
  const totalPrincipalPaid = payments.reduce((sum, payment) => sum + payment.principal_amount, 0);
  const totalInterestPaid = payments.reduce((sum, payment) => sum + payment.interest_amount, 0);
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingPrincipal = loan.principal_amount - totalPrincipalPaid;
  const accruedInterest = calculateAccruedInterest(loan);
  const lastPayment = payments[0]; // Payments are ordered by date DESC
  const nextDueDate = getNextPaymentDate(loan, lastPayment?.payment_date);
  const daysSinceLastPayment = getDaysSinceLastPayment(loan, lastPayment?.payment_date);
  const isOverdue = nextDueDate < new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/loans')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Loans
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Loan Details</h1>
            <p className="text-gray-600 mt-2">Comprehensive loan information and payment history</p>
          </div>
        </div>
      </div>

      {/* Loan Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Borrower</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{borrower.name}</div>
            <p className="text-xs text-muted-foreground">{borrower.phone}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loan Type</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getLoanTypeBadge(loan.loan_type)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loan.interest_rate}% annual rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal Amount</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(loan.principal_amount)}</div>
            <p className="text-xs text-muted-foreground">Original amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining Principal</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(remainingPrincipal)}</div>
            <p className="text-xs text-muted-foreground">
              {((remainingPrincipal / loan.principal_amount) * 100).toFixed(1)}% remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPayments)}</div>
            <p className="text-xs text-muted-foreground">{payments.length} payments made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Principal Paid</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPrincipalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {((totalPrincipalPaid / loan.principal_amount) * 100).toFixed(1)}% of principal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Earned</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalInterestPaid)}</div>
            <p className="text-xs text-muted-foreground">Interest collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accrued Interest</CardTitle>
            <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isOverdue ? 'text-red-600' : ''}`}>
              {formatCurrency(accruedInterest)}
            </div>
            <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isOverdue ? 'Overdue' : 'Current period'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Next Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payment Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium">Next Due Date</Label>
              <div className={`flex items-center gap-2 mt-1 ${isOverdue ? 'text-red-600' : ''}`}>
                {isOverdue && <AlertTriangle className="h-4 w-4" />}
                <span className="font-medium">{formatDate(nextDueDate)}</span>
                {isOverdue && <Badge variant="destructive">Overdue</Badge>}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Days Since Last Payment</Label>
              <div className="font-medium mt-1">{daysSinceLastPayment} days</div>
            </div>
            <div>
              <Label className="text-sm font-medium">Repayment Interval</Label>
              <div className="font-medium mt-1">
                Every {loan.repayment_interval_value} {loan.repayment_interval_unit}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.payment_date)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      {payment.principal_amount > 0 ? formatCurrency(payment.principal_amount) : '-'}
                    </TableCell>
                    <TableCell>
                      {payment.interest_amount > 0 ? formatCurrency(payment.interest_amount) : '-'}
                    </TableCell>
                    <TableCell>
                      {getPaymentTypeBadge(payment.payment_type)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
