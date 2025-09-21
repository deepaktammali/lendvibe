import { ArrowLeft, Calendar, IndianRupee, Receipt, TrendingUp } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import FixedIncomePaymentDialog from '@/components/FixedIncomePaymentDialog'
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
import {
  useGetFixedIncomesWithTenants,
  useGetIncomePaymentsByFixedIncome,
} from '@/hooks/api/useFixedIncome'
import { formatDate } from '@/lib/utils'

export default function FixedIncomeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: fixedIncomesWithTenants = [], isLoading: loadingFixedIncome } =
    useGetFixedIncomesWithTenants()
  const { data: payments = [], isLoading: loadingPayments } = useGetIncomePaymentsByFixedIncome(id!)

  const fixedIncome = fixedIncomesWithTenants.find((fi) => fi.id === id)

  const handlePaymentSuccess = () => {
    // Refresh functionality can be implemented when needed
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount)
  }


  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'default',
      terminated: 'destructive',
      expired: 'outline',
    } as const

    return <Badge variant={variants[status as keyof typeof variants]}>{status}</Badge>
  }

  // Calculate total payments
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0)

  if (loadingFixedIncome || loadingPayments) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading fixed income details...</div>
      </div>
    )
  }

  if (!fixedIncome) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-lg text-gray-500">Fixed income asset not found</div>
        <Button onClick={() => navigate('/fixed-income')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Fixed Income
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/fixed-income')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fixed Income Details</h1>
            <p className="text-gray-600 mt-1">
              {fixedIncome.label || 'Fixed Income'} • {fixedIncome.tenant_name || 'No payer assigned'}
            </p>
          </div>
        </div>

        <FixedIncomePaymentDialog onSuccess={handlePaymentSuccess} />
      </div>

      {/* Fixed Income Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <IndianRupee className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Payment Amount</p>
                <p className="text-xl font-bold">{formatCurrency(fixedIncome.amount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Payment Frequency</p>
                <p className="text-xl font-bold">Every {fixedIncome.payment_interval_value} {fixedIncome.payment_interval_unit}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Receipt className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Received</p>
                <p className="text-xl font-bold">{formatCurrency(totalPayments)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Status</p>
                <div className="mt-1">{getStatusBadge(fixedIncome.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fixed Income Details */}
      <Card>
        <CardHeader>
          <CardTitle>Asset Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Tenant</p>
              <p className="text-base">{fixedIncome.tenant_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Income Type</p>
              <div className="mt-1">
                <Badge variant="default">{fixedIncome.label || 'Fixed Income'}</Badge>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Payment Schedule</p>
              <p className="text-base">
                Every {fixedIncome.payment_interval_value} {fixedIncome.payment_interval_unit}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Start Date</p>
              <p className="text-base">{formatDate(fixedIncome.start_date, 'medium')}</p>
            </div>
            {fixedIncome.end_date && (
              <div>
                <p className="text-sm font-medium text-gray-600">End Date</p>
                <p className="text-base">{formatDate(fixedIncome.end_date, 'medium')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payment History ({payments.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payments recorded yet</p>
              <p className="text-sm text-gray-400">Record the first payment to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Notes</TableHead>
                  <TableHead className="hidden lg:table-cell">Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.payment_date, 'short')}
                    </TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      {payment.notes || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                      {formatDate(payment.created_at, 'relative')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
