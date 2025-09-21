import { ArrowLeft, Banknote, Calendar, Eye, IndianRupee, MapPin, Phone, Receipt, TrendingUp, User } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useGetBorrower } from '@/hooks/api/useBorrowers'
import { useGetLoansByBorrower } from '@/hooks/api/useLoans'
import { useGetPaymentsWithDetails } from '@/hooks/api/usePayments'

export default function BorrowerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: borrower, isLoading: loadingBorrower } = useGetBorrower(id!)
  const { data: loans = [], isLoading: loadingLoans } = useGetLoansByBorrower(id!)
  const { data: allPayments = [], isLoading: loadingPayments } = useGetPaymentsWithDetails()

  // Filter payments for this borrower's loans
  const borrowerPayments = allPayments.filter(payment =>
    loans.some(loan => loan.id === payment.loan_id)
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getLoanTypeLabel = (type: string) => {
    return type === 'installment' ? 'Installment' : 'Bullet'
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      paid_off: 'secondary',
      defaulted: 'destructive',
    } as const

    const labels = {
      active: 'Active',
      paid_off: 'Paid Off',
      defaulted: 'Defaulted',
    }

    return <Badge variant={variants[status as keyof typeof variants]}>{labels[status as keyof typeof labels]}</Badge>
  }

  const getPaymentTypeBadge = (type: string) => {
    const variants = {
      principal: 'default',
      interest: 'secondary',
      mixed: 'outline',
    } as const

    const labels = {
      principal: 'Principal',
      interest: 'Interest',
      mixed: 'Mixed',
    }

    return <Badge variant={variants[type as keyof typeof variants]}>{labels[type as keyof typeof labels]}</Badge>
  }

  // Calculate totals
  const totalLoaned = loans.reduce((sum, loan) => sum + loan.principal_amount, 0)
  const totalRemaining = loans.reduce((sum, loan) => sum + loan.current_balance, 0)
  const totalPaid = borrowerPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const activeLoans = loans.filter(loan => loan.status === 'active').length

  if (loadingBorrower || loadingLoans || loadingPayments) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading borrower details...</div>
      </div>
    )
  }

  if (!borrower) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-lg text-gray-500">Borrower not found</div>
        <Button onClick={() => navigate('/borrowers')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Borrowers
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/borrowers')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{borrower.name}</h1>
            <p className="text-gray-600 mt-1">Borrower Details</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <IndianRupee className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Loaned</p>
                <p className="text-xl font-bold">{formatCurrency(totalLoaned)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Remaining</p>
                <p className="text-xl font-bold">{formatCurrency(totalRemaining)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-xl font-bold">{formatCurrency(totalPaid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Banknote className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Active Loans</p>
                <p className="text-xl font-bold">{activeLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Borrower Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Name</p>
                <p className="text-base">{borrower.name}</p>
              </div>
            </div>

            {borrower.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Phone</p>
                  <p className="text-base">{borrower.phone}</p>
                </div>
              </div>
            )}

            {borrower.address && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Address</p>
                  <p className="text-base">{borrower.address}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-600">Customer Since</p>
                <p className="text-base">{formatDate(borrower.created_at)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans and Payments Tabs */}
      <Tabs defaultValue="loans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="loans">Loans ({loans.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({borrowerPayments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="loans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Loan History</CardTitle>
            </CardHeader>
            <CardContent>
              {loans.length === 0 ? (
                <div className="text-center py-8">
                  <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No loans found</p>
                  <p className="text-sm text-gray-400">This borrower has no loans yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>{getLoanTypeLabel(loan.loan_type)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(loan.principal_amount)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(loan.current_balance)}
                        </TableCell>
                        <TableCell>{loan.interest_rate}%</TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(loan.start_date)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/loans/${loan.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {borrowerPayments.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No payments found</p>
                  <p className="text-sm text-gray-400">No payments have been recorded yet</p>
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
                      <TableHead className="hidden md:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {borrowerPayments
                      .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                      .map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell>
                            {payment.principal_amount > 0
                              ? formatCurrency(payment.principal_amount)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {payment.interest_amount > 0
                              ? formatCurrency(payment.interest_amount)
                              : '-'}
                          </TableCell>
                          <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-gray-500">
                            {payment.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}