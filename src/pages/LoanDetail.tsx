import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, IndianRupee, TrendingUp, User, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from '@tanstack/react-form';
import {
  getLoan,
  getBorrower,
  getPaymentsByLoan,
  getLoans,
  getBorrowers,
  updatePayment,
  deletePayment,
  updateLoanBalance,
  getLoan as getCurrentLoan
} from '@/lib/database';
import { paymentFormSchema, type PaymentFormInput } from '@/lib/validation';
import { calculateAccruedInterest, getNextPaymentDate, getDaysSinceLastPayment } from '@/lib/finance';
import { getLoanTypeLabel } from '@/lib/loans';
import type { Loan, Borrower, Payment } from '@/types/database';

interface PaymentWithDetails extends Payment {
  borrower_name: string;
}

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [borrower, setBorrower] = useState<Borrower | null>(null);
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [allBorrowers, setAllBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentWithDetails | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadLoanDetails();
    }
  }, [id]);

  const loadLoanDetails = async () => {
    if (!id) return;

    try {
      const [loanData, paymentsData, loansData, borrowersData] = await Promise.all([
        getLoan(id),
        getPaymentsByLoan(id),
        getLoans(),
        getBorrowers()
      ]);

      if (!loanData) {
        navigate('/loans');
        return;
      }

      setLoan(loanData);
      setAllLoans(loansData.filter(l => l.status === 'active'));
      setAllBorrowers(borrowersData);

      const borrowerData = await getBorrower(loanData.borrower_id);
      setBorrower(borrowerData);

      const paymentsWithDetails: PaymentWithDetails[] = paymentsData.map(payment => {
        const paymentLoan = loansData.find(l => l.id === payment.loan_id);
        const paymentBorrower = borrowersData.find(b => b.id === paymentLoan?.borrower_id);
        return {
          ...payment,
          borrower_name: paymentBorrower?.name || 'Unknown Borrower'
        };
      });

      setPayments(paymentsWithDetails);
    } catch (error) {
      console.error('Failed to load loan details:', error);
      navigate('/loans');
    } finally {
      setLoading(false);
    }
  };

  const editForm = useForm({
    defaultValues: {
      loan_id: '',
      principal_amount: 0,
      interest_amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
    } as PaymentFormInput,
    validators: {
      onChange: paymentFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!editingPayment) return;

      try {
        const oldLoan = await getCurrentLoan(editingPayment.loan_id);
        const newLoan = await getCurrentLoan(value.loan_id);

        if (!oldLoan || !newLoan) {
          throw new Error('Loan not found');
        }

        const totalAmount = value.principal_amount + value.interest_amount;
        const oldPrincipalChange = editingPayment.principal_amount;
        const newPrincipalChange = value.principal_amount;

        await updatePayment(editingPayment.id, {
          loan_id: value.loan_id,
          amount: totalAmount,
          payment_date: value.payment_date,
          principal_amount: value.principal_amount,
          interest_amount: value.interest_amount,
          payment_type: value.principal_amount > 0 && value.interest_amount > 0
            ? 'mixed'
            : value.principal_amount > 0 ? 'principal' : 'interest',
        });

        if (editingPayment.loan_id === value.loan_id) {
          const balanceDifference = newPrincipalChange - oldPrincipalChange;
          const newBalance = oldLoan.current_balance - balanceDifference;
          await updateLoanBalance(value.loan_id, Math.max(0, newBalance));
        } else {
          const oldLoanNewBalance = oldLoan.current_balance + oldPrincipalChange;
          await updateLoanBalance(editingPayment.loan_id, oldLoanNewBalance);

          const newLoanNewBalance = newLoan.current_balance - newPrincipalChange;
          await updateLoanBalance(value.loan_id, Math.max(0, newLoanNewBalance));
        }

        setIsEditDialogOpen(false);
        setEditingPayment(null);
        editForm.reset();
        await loadLoanDetails();
      } catch (error) {
        console.error('Failed to update payment:', error);
      }
    },
  });

  const handleEditPayment = (payment: PaymentWithDetails) => {
    setEditingPayment(payment);
    editForm.setFieldValue('loan_id', payment.loan_id);
    editForm.setFieldValue('principal_amount', payment.principal_amount);
    editForm.setFieldValue('interest_amount', payment.interest_amount);
    editForm.setFieldValue('payment_date', payment.payment_date);
    setIsEditDialogOpen(true);
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment || !loan) return;

      const newBalance = loan.current_balance + payment.principal_amount;
      await updateLoanBalance(payment.loan_id, newBalance);
      await deletePayment(paymentId);

      setDeletePaymentId(null);
      await loadLoanDetails();
    } catch (error) {
      console.error('Failed to delete payment:', error);
    }
  };

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

  if (!loan || !borrower) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-600">Loan not found</div>
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
                  <TableHead>Actions</TableHead>
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditPayment(payment)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeletePaymentId(payment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              editForm.handleSubmit();
            }}
            className="space-y-4"
          >
            <editForm.Field
              name="loan_id"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-loan">Loan *</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a loan" />
                    </SelectTrigger>
                    <SelectContent>
                      {allLoans.map((loanOption) => {
                        const loanBorrower = allBorrowers.find(b => b.id === loanOption.borrower_id);
                        return (
                          <SelectItem key={loanOption.id} value={loanOption.id}>
                            {loanBorrower?.name} - {formatCurrency(loanOption.current_balance)} remaining
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            />

            <editForm.Field
              name="principal_amount"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-principal">Principal Amount</Label>
                  <Input
                    id="edit-principal"
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.state.value || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      field.handleChange(amount);
                    }}
                    onBlur={field.handleBlur}
                    placeholder="0.00"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            />

            <editForm.Field
              name="interest_amount"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-interest">Interest Amount</Label>
                  <Input
                    id="edit-interest"
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.state.value || ''}
                    onChange={(e) => {
                      const amount = parseFloat(e.target.value) || 0;
                      field.handleChange(amount);
                    }}
                    onBlur={field.handleBlur}
                    placeholder="0.00"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            />

            <editForm.Field
              name="payment_date"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Payment Date *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <p className="text-sm text-red-600">{field.state.meta.errors[0]?.message}</p>
                  )}
                </div>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  editForm.reset();
                  setIsEditDialogOpen(false);
                  setEditingPayment(null);
                }}
              >
                Cancel
              </Button>
              <editForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
                children={([canSubmit, isSubmitting]) => (
                  <Button type="submit" disabled={!canSubmit || isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update Payment'}
                  </Button>
                )}
              />
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={() => setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment? This action cannot be undone.
              {deletePaymentId && (() => {
                const payment = payments.find(p => p.id === deletePaymentId);
                if (payment) {
                  return (
                    <div className="mt-3 p-3 bg-gray-50 rounded-md">
                      <p><strong>Amount:</strong> {formatCurrency(payment.amount)}</p>
                      <p><strong>Principal:</strong> {formatCurrency(payment.principal_amount)}</p>
                      <p><strong>Interest:</strong> {formatCurrency(payment.interest_amount)}</p>
                      <p><strong>Date:</strong> {formatDate(payment.payment_date)}</p>
                    </div>
                  );
                }
                return null;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePaymentId && handleDeletePayment(deletePaymentId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}