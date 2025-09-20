import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, Percent, User, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  getBorrowers, 
  getLoans, 
  createLoan, 
  updateLoanStatus, 
  deleteLoan,
  getLoansByBorrower 
} from '@/lib/database';
import type { Borrower, Loan } from '@/types/database';

interface LoanFormData {
  borrower_id: string;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  start_date: string;
}

interface LoanWithBorrower extends Loan {
  borrower_name: string;
}

export default function Loans() {
  const [loans, setLoans] = useState<LoanWithBorrower[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<LoanFormData>({
    borrower_id: '',
    principal_amount: 0,
    interest_rate: 0,
    term_months: 12,
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [loansData, borrowersData] = await Promise.all([
        getLoans(),
        getBorrowers()
      ]);

      // Combine loan data with borrower names
      const loansWithBorrowers: LoanWithBorrower[] = loansData.map(loan => {
        const borrower = borrowersData.find(b => b.id === loan.borrower_id);
        return {
          ...loan,
          borrower_name: borrower?.name || 'Unknown Borrower'
        };
      });

      setLoans(loansWithBorrowers);
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
      const loanData = {
        ...formData,
        current_balance: formData.principal_amount, // Initial balance equals principal
        status: 'active' as const
      };
      
      await createLoan(loanData);
      setIsAddDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error) {
      console.error('Failed to create loan:', error);
    }
  };

  const handleStatusChange = async (loanId: string, newStatus: Loan['status']) => {
    try {
      await updateLoanStatus(loanId, newStatus);
      await loadData();
    } catch (error) {
      console.error('Failed to update loan status:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this loan? This action cannot be undone.')) {
      try {
        await deleteLoan(id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete loan:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      borrower_id: '',
      principal_amount: 0,
      interest_rate: 0,
      term_months: 12,
      start_date: new Date().toISOString().split('T')[0],
    });
  };

  const filteredLoans = loans.filter(loan => {
    const matchesSearch = 
      loan.borrower_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loan.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

  const getStatusBadge = (status: Loan['status']) => {
    const variants = {
      active: 'default',
      paid_off: 'secondary',
      defaulted: 'destructive'
    } as const;

    const labels = {
      active: 'Active',
      paid_off: 'Paid Off',
      defaulted: 'Defaulted'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const calculateMonthlyPayment = (principal: number, rate: number, months: number) => {
    if (rate === 0) return principal / months;
    const monthlyRate = rate / 100 / 12;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                   (Math.pow(1 + monthlyRate, months) - 1);
    return payment;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading loans...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-600 mt-2">Manage your loans</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Loan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loan-borrower">Borrower *</Label>
                <Select 
                  value={formData.borrower_id} 
                  onValueChange={(value) => setFormData({ ...formData, borrower_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a borrower" />
                  </SelectTrigger>
                  <SelectContent>
                    {borrowers.map((borrower) => (
                      <SelectItem key={borrower.id} value={borrower.id}>
                        {borrower.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan-principal">Principal Amount *</Label>
                <Input
                  id="loan-principal"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.principal_amount || ''}
                  onChange={(e) => setFormData({ ...formData, principal_amount: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan-rate">Interest Rate (% annual) *</Label>
                <Input
                  id="loan-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.interest_rate || ''}
                  onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan-term">Term (months) *</Label>
                <Input
                  id="loan-term"
                  type="number"
                  min="1"
                  value={formData.term_months || ''}
                  onChange={(e) => setFormData({ ...formData, term_months: parseInt(e.target.value) || 12 })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loan-startDate">Start Date *</Label>
                <Input
                  id="loan-startDate"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              {formData.principal_amount > 0 && formData.interest_rate >= 0 && formData.term_months > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700">
                    Estimated Monthly Payment: {formatCurrency(
                      calculateMonthlyPayment(formData.principal_amount, formData.interest_rate, formData.term_months)
                    )}
                  </p>
                </div>
              )}
              
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
                <Button type="submit" disabled={!formData.borrower_id || formData.principal_amount <= 0}>
                  Create Loan
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paid_off">Paid Off</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
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
                <p className="text-sm font-medium text-gray-600">Total Active</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    filteredLoans
                      .filter(loan => loan.status === 'active')
                      .reduce((sum, loan) => sum + loan.current_balance, 0)
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-lg font-bold">
                  {filteredLoans.filter(loan => loan.status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Percent className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Interest</p>
                <p className="text-lg font-bold">
                  {filteredLoans.length > 0 
                    ? (filteredLoans.reduce((sum, loan) => sum + loan.interest_rate, 0) / filteredLoans.length).toFixed(1) + '%'
                    : '0%'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Defaulted</p>
                <p className="text-lg font-bold">
                  {filteredLoans.filter(loan => loan.status === 'defaulted').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loans ({filteredLoans.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLoans.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No loans found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter' 
                  : 'Create your first loan to get started'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{loan.borrower_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.principal_amount)}
                    </TableCell>
                    <TableCell>{loan.interest_rate}%</TableCell>
                    <TableCell>{loan.term_months} months</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(loan.current_balance)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={loan.status}
                        onValueChange={(value: Loan['status']) => handleStatusChange(loan.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paid_off">Paid Off</SelectItem>
                          <SelectItem value="defaulted">Defaulted</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(loan.start_date)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(loan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}