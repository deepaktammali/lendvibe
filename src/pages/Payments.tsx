import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign, Receipt, Calendar, TrendingUp, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getPayments, 
  createPayment, 
  getLoans, 
  getBorrowers,
  updateLoanBalance,
  getLoan
} from '@/lib/database';
import type { Payment, Loan, Borrower } from '@/types/database';

interface PaymentFormData {
  loan_id: string;
  amount: number;
  payment_type: 'principal' | 'interest' | 'mixed';
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
}

interface PaymentWithDetails extends Payment {
  borrower_name: string;
  loan_principal: number;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PaymentFormData>({
    loan_id: '',
    amount: 0,
    payment_type: 'mixed',
    principal_amount: 0,
    interest_amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-calculate principal and interest when amount or type changes
    if (formData.payment_type === 'principal') {
      setFormData(prev => ({
        ...prev,
        principal_amount: prev.amount,
        interest_amount: 0
      }));
    } else if (formData.payment_type === 'interest') {
      setFormData(prev => ({
        ...prev,
        principal_amount: 0,
        interest_amount: prev.amount
      }));
    } else if (formData.payment_type === 'mixed' && formData.amount > 0) {
      // For mixed payments, default to 50/50 split (user can adjust)
      const half = formData.amount / 2;
      setFormData(prev => ({
        ...prev,
        principal_amount: half,
        interest_amount: half
      }));
    }
  }, [formData.amount, formData.payment_type]);

  const loadData = async () => {
    try {
      const [paymentsData, loansData, borrowersData] = await Promise.all([
        getPayments(),
        getLoans(),
        getBorrowers()
      ]);

      // Combine payment data with loan and borrower details
      const paymentsWithDetails: PaymentWithDetails[] = paymentsData.map(payment => {
        const loan = loansData.find(l => l.id === payment.loan_id);
        const borrower = borrowersData.find(b => b.id === loan?.borrower_id);
        
        return {
          ...payment,
          borrower_name: borrower?.name || 'Unknown Borrower',
          loan_principal: loan?.principal_amount || 0
        };
      });

      setPayments(paymentsWithDetails);
      setLoans(loansData.filter(loan => loan.status === 'active')); // Only show active loans for new payments
      setBorrowers(borrowersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Create the payment
      await createPayment(formData);
      
      // Update loan balance if principal was paid
      if (formData.principal_amount > 0) {
        const loan = await getLoan(formData.loan_id);
        if (loan) {
          const newBalance = Math.max(0, loan.current_balance - formData.principal_amount);
          await updateLoanBalance(formData.loan_id, newBalance);
        }
      }
      
      setIsAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      loan_id: '',
      amount: 0,
      payment_type: 'mixed',
      principal_amount: 0,
      interest_amount: 0,
      payment_date: new Date().toISOString().split('T')[0],
    });
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.loan_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || payment.payment_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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

  // Calculate summary stats
  const totalPayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalPrincipal = filteredPayments.reduce((sum, payment) => sum + payment.principal_amount, 0);
  const totalInterest = filteredPayments.reduce((sum, payment) => sum + payment.interest_amount, 0);
  
  // Current month payments
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyPayments = filteredPayments
    .filter(payment => payment.payment_date.startsWith(currentMonth))
    .reduce((sum, payment) => sum + payment.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading payments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-2">Track and record payments</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-loan">Loan *</Label>
                <Select 
                  value={formData.loan_id} 
                  onValueChange={(value) => setFormData({ ...formData, loan_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a loan" />
                  </SelectTrigger>
                  <SelectContent>
                    {loans.map((loan) => {
                      const borrower = borrowers.find(b => b.id === loan.borrower_id);
                      return (
                        <SelectItem key={loan.id} value={loan.id}>
                          {borrower?.name} - {formatCurrency(loan.current_balance)} remaining
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-type">Payment Type *</Label>
                <Select 
                  value={formData.payment_type} 
                  onValueChange={(value: Payment['payment_type']) => 
                    setFormData({ ...formData, payment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mixed">Mixed (Principal + Interest)</SelectItem>
                    <SelectItem value="principal">Principal Only</SelectItem>
                    <SelectItem value="interest">Interest Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Total Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>

              {formData.payment_type === 'mixed' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="payment-principal">Principal Amount</Label>
                    <Input
                      id="payment-principal"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.amount}
                      value={formData.principal_amount || ''}
                      onChange={(e) => {
                        const principal = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          principal_amount: principal,
                          interest_amount: formData.amount - principal
                        });
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="payment-interest">Interest Amount</Label>
                    <Input
                      id="payment-interest"
                      type="number"
                      step="0.01"
                      min="0"
                      max={formData.amount}
                      value={formData.interest_amount || ''}
                      onChange={(e) => {
                        const interest = parseFloat(e.target.value) || 0;
                        setFormData({ 
                          ...formData, 
                          interest_amount: interest,
                          principal_amount: formData.amount - interest
                        });
                      }}
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="payment-date">Payment Date *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    resetForm();
                    setIsAddDialogOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={!formData.loan_id || formData.amount <= 0}>
                  Record Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by borrower name or loan ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                  <SelectItem value="interest">Interest</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-lg font-bold">{formatCurrency(totalPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Principal Paid</p>
                <p className="text-lg font-bold">{formatCurrency(totalPrincipal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Interest Earned</p>
                <p className="text-lg font-bold">{formatCurrency(totalInterest)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-lg font-bold">{formatCurrency(monthlyPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payments found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || typeFilter !== 'all' 
                  ? 'Try adjusting your search or filter' 
                  : 'Record your first payment to get started'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{payment.borrower_name}</span>
                      </div>
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
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(payment.payment_date)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(payment.created_at)}
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