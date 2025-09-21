import {
  createPayment as dbCreatePayment,
  createPaymentSchedule as dbCreatePaymentSchedule,
  deletePayment as dbDeletePayment,
  getLastPaymentByLoan as dbGetLastPaymentByLoan,
  getLastPaymentsByLoans as dbGetLastPaymentsByLoans,
  getPaymentSchedule as dbGetPaymentSchedule,
  getPaymentSchedulesByLoan as dbGetPaymentSchedulesByLoan,
  getPayments as dbGetPayments,
  getPaymentsByLoan as dbGetPaymentsByLoan,
  getPaymentsByPaymentSchedule as dbGetPaymentsByPaymentSchedule,
  updatePayment as dbUpdatePayment,
  updatePaymentSchedule as dbUpdatePaymentSchedule,
  getLoan,
  updateLoanBalance,
  updateLoanStatus,
  getBorrower as dbGetBorrower,
} from '@/lib/database'
import type { CreatePayment, Payment } from '@/types/api/payments'
import type { PaymentSchedule } from '@/types/database'

export type CreatePaymentData = CreatePayment.Payload
export type UpdatePaymentData = {
  payment_schedule_id?: string
  amount?: number
  payment_type?: Payment['payment_type']
  principal_amount?: number
  interest_amount?: number
  payment_date?: string
  notes?: string
}

export interface PaymentWithDetails extends Payment {
  borrower_name: string
  loan_principal: number
  loan_id: string
  payment_schedule: PaymentSchedule
}

export const paymentService = {
  async getPayments(): Promise<PaymentWithDetails[]> {
    const dbPayments = await dbGetPayments()
    // Transform database types to API types with payment schedule information
    const paymentsWithDetails: PaymentWithDetails[] = []

    for (const dbPayment of dbPayments) {
      const schedule = await dbGetPaymentSchedule(dbPayment.payment_schedule_id)
      if (schedule) {
        const loan = await getLoan(schedule.loan_id)
        const borrower = loan ? await dbGetBorrower(loan.borrower_id) : null

        paymentsWithDetails.push({
          id: dbPayment.id,
          payment_schedule_id: dbPayment.payment_schedule_id,
          amount: dbPayment.amount,
          payment_type: dbPayment.payment_type,
          principal_amount: dbPayment.principal_amount,
          interest_amount: dbPayment.interest_amount,
          payment_date: dbPayment.payment_date,
          created_at: dbPayment.created_at,
          borrower_name: borrower?.name || 'Unknown',
          loan_principal: loan?.principal_amount || 0,
          loan_id: schedule.loan_id,
          payment_schedule: schedule,
        })
      }
    }

    return paymentsWithDetails
  },

  async getPaymentsByLoan(loanId: string): Promise<Payment[]> {
    const dbPayments = await dbGetPaymentsByLoan(loanId)
    // Transform database types to API types
    return dbPayments.map((dbPayment) => ({
      id: dbPayment.id,
      payment_schedule_id: dbPayment.payment_schedule_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }))
  },

  async getLastPaymentByLoan(loanId: string): Promise<Payment | null> {
    const dbPayment = await dbGetLastPaymentByLoan(loanId)
    if (!dbPayment) return null

    // Transform database type to API type
    return {
      id: dbPayment.id,
      payment_schedule_id: dbPayment.payment_schedule_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }
  },

  async getLastPaymentsByLoans(loanIds: string[]): Promise<Map<string, Payment>> {
    const dbPaymentsMap = await dbGetLastPaymentsByLoans(loanIds)
    const apiPaymentsMap = new Map<string, Payment>()

    for (const [loanId, dbPayment] of dbPaymentsMap) {
      if (dbPayment) {
        apiPaymentsMap.set(loanId, {
          id: dbPayment.id,
          payment_schedule_id: dbPayment.payment_schedule_id,
          amount: dbPayment.amount,
          payment_type: dbPayment.payment_type,
          principal_amount: dbPayment.principal_amount,
          interest_amount: dbPayment.interest_amount,
          payment_date: dbPayment.payment_date,
          created_at: dbPayment.created_at,
        })
      }
    }

    return apiPaymentsMap
  },

  // Helper method to find or create payment schedule for a specific payment date
  async findOrCreatePaymentSchedule(
    loanId: string,
    loan: {
      start_date: string
      repayment_interval_unit?: string
      repayment_interval_value?: number
    },
    paymentDate: Date,
    principalAmount: number,
    interestAmount: number
  ): Promise<PaymentSchedule> {
    const existingSchedules = await dbGetPaymentSchedulesByLoan(loanId)

    // Calculate period dates based on loan interval
    const periodDates = this.calculatePaymentPeriod(loan, paymentDate)

    // Look for existing schedule in this period
    let paymentSchedule = existingSchedules.find(
      (schedule) =>
        schedule.period_start_date === periodDates.periodStartStr &&
        schedule.period_end_date === periodDates.periodEndStr
    )

    if (!paymentSchedule) {
      // Create new payment schedule for this period
      paymentSchedule = await dbCreatePaymentSchedule({
        loan_id: loanId,
        period_start_date: periodDates.periodStartStr,
        period_end_date: periodDates.periodEndStr,
        due_date: periodDates.dueDateStr,
        total_principal_due: principalAmount,
        total_interest_due: interestAmount,
        status: 'pending',
      })
    } else {
      // Update existing schedule with the actual amounts being paid
      await dbUpdatePaymentSchedule(paymentSchedule.id, {
        total_principal_due: Math.max(paymentSchedule.total_principal_due, principalAmount),
        total_interest_due: Math.max(paymentSchedule.total_interest_due, interestAmount),
      })
      // Refresh the schedule object
      paymentSchedule = await dbGetPaymentSchedule(paymentSchedule.id) || paymentSchedule
    }

    return paymentSchedule
  },

  // Helper method to calculate payment period dates based on loan interval
  calculatePaymentPeriod(
    loan: {
      start_date: string
      repayment_interval_unit?: string
      repayment_interval_value?: number
    },
    paymentDate: Date
  ): { periodStartStr: string; periodEndStr: string; dueDateStr: string } {
    const loanStartDate = new Date(loan.start_date)
    let periodStart: Date
    let periodEnd: Date
    let dueDate: Date

    // Default to monthly if no interval specified
    if (!loan.repayment_interval_unit || !loan.repayment_interval_value) {
      periodStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1)
      periodEnd = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0)
      dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), loanStartDate.getDate())
    } else {
      switch (loan.repayment_interval_unit) {
        case 'weeks': {
          // Find the week containing the payment date
          const weekStart = new Date(paymentDate)
          weekStart.setDate(paymentDate.getDate() - paymentDate.getDay()) // Start of week (Sunday)
          periodStart = weekStart
          periodEnd = new Date(weekStart)
          periodEnd.setDate(weekStart.getDate() + 6) // End of week (Saturday)
          dueDate = new Date(weekStart)
          break
        }

        case 'months':
          periodStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1)
          periodEnd = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0)
          dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), loanStartDate.getDate())
          break

        case 'years':
          periodStart = new Date(paymentDate.getFullYear(), 0, 1)
          periodEnd = new Date(paymentDate.getFullYear(), 11, 31)
          dueDate = new Date(paymentDate.getFullYear(), loanStartDate.getMonth(), loanStartDate.getDate())
          break

        default:
          // Fallback to monthly
          periodStart = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), 1)
          periodEnd = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0)
          dueDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), loanStartDate.getDate())
      }
    }

    return {
      periodStartStr: periodStart.toISOString().split('T')[0],
      periodEndStr: periodEnd.toISOString().split('T')[0],
      dueDateStr: dueDate.toISOString().split('T')[0],
    }
  },

  async createPayment(data: CreatePaymentData): Promise<Payment> {
    const loan = await getLoan(data.loan_id)
    if (!loan) {
      throw new Error('Loan not found')
    }

    const paymentDate = new Date(data.payment_date)

    // IMPORTANT: Create schedules for any missed periods
    await this.createMissedPaymentSchedules(data.loan_id, loan, paymentDate)

    // Find or create payment schedule for this payment based on repayment interval
    const paymentSchedule = await this.findOrCreatePaymentSchedule(data.loan_id, loan, paymentDate, data.principal_amount, data.interest_amount)

    const totalAmount = data.principal_amount + data.interest_amount
    const newBalance = loan.current_balance - data.principal_amount

    const paymentData = {
      payment_schedule_id: paymentSchedule.id,
      amount: totalAmount,
      payment_date: data.payment_date,
      principal_amount: data.principal_amount,
      interest_amount: data.interest_amount,
      payment_type: (data.principal_amount > 0 && data.interest_amount > 0
        ? 'mixed'
        : data.principal_amount > 0
          ? 'principal'
          : 'interest') as Payment['payment_type'],
    }

    const dbPayment = await dbCreatePayment(paymentData)

    // Update payment schedule status based on payments
    await this.updatePaymentScheduleStatus(paymentSchedule.id)

    // Only update loan balance if there's a principal payment
    if (data.principal_amount > 0) {
      await updateLoanBalance(data.loan_id, Math.max(0, newBalance))

      if (newBalance <= 0.005) {
        await updateLoanStatus(data.loan_id, 'paid_off')
      }
    }

    // Transform database type to API type
    return {
      id: dbPayment.id,
      payment_schedule_id: dbPayment.payment_schedule_id,
      amount: dbPayment.amount,
      payment_type: dbPayment.payment_type,
      principal_amount: dbPayment.principal_amount,
      interest_amount: dbPayment.interest_amount,
      payment_date: dbPayment.payment_date,
      created_at: dbPayment.created_at,
    }
  },

  async updatePayment(
    id: string,
    data: UpdatePaymentData,
    originalPayment: Payment
  ): Promise<void> {
    const originalSchedule = await dbGetPaymentSchedule(originalPayment.payment_schedule_id)
    const newSchedule = data.payment_schedule_id
      ? await dbGetPaymentSchedule(data.payment_schedule_id)
      : originalSchedule

    if (!originalSchedule || !newSchedule) {
      throw new Error('Payment schedule not found')
    }

    const oldLoan = await getLoan(originalSchedule.loan_id)
    const newLoan = await getLoan(newSchedule.loan_id)

    if (!oldLoan || !newLoan) {
      throw new Error('Loan not found')
    }

    const newPrincipalAmount = data.principal_amount ?? originalPayment.principal_amount
    const newInterestAmount = data.interest_amount ?? originalPayment.interest_amount
    const totalAmount = newPrincipalAmount + newInterestAmount

    const updateData: UpdatePaymentData = {
      ...data,
      amount: totalAmount,
      payment_type:
        newPrincipalAmount > 0 && newInterestAmount > 0
          ? 'mixed'
          : newPrincipalAmount > 0
            ? 'principal'
            : 'interest',
    }

    await dbUpdatePayment(id, updateData)

    // Update payment schedule statuses
    await this.updatePaymentScheduleStatus(originalSchedule.id)
    if (originalSchedule.id !== newSchedule.id) {
      await this.updatePaymentScheduleStatus(newSchedule.id)
    }

    // Recalculate loan balances
    if (originalSchedule.loan_id === newSchedule.loan_id) {
      // Same loan - adjust balance by the difference
      const balanceDifference = newPrincipalAmount - originalPayment.principal_amount
      const newBalance = oldLoan.current_balance - balanceDifference
      await updateLoanBalance(originalSchedule.loan_id, Math.max(0, newBalance))
    } else {
      // Different loans - restore old loan balance and reduce new loan balance
      const oldLoanNewBalance = oldLoan.current_balance + originalPayment.principal_amount
      await updateLoanBalance(originalSchedule.loan_id, oldLoanNewBalance)

      const newLoanNewBalance = newLoan.current_balance - newPrincipalAmount
      await updateLoanBalance(newSchedule.loan_id, Math.max(0, newLoanNewBalance))
    }
  },

  async deletePayment(id: string, payment: Payment): Promise<void> {
    const schedule = await dbGetPaymentSchedule(payment.payment_schedule_id)
    if (!schedule) {
      throw new Error('Payment schedule not found')
    }

    const loan = await getLoan(schedule.loan_id)
    if (!loan) {
      throw new Error('Loan not found')
    }

    // Restore the principal amount to the loan balance
    const newBalance = loan.current_balance + payment.principal_amount
    await updateLoanBalance(schedule.loan_id, newBalance)

    await dbDeletePayment(id)

    // Update payment schedule status
    await this.updatePaymentScheduleStatus(schedule.id)
  },

  // Helper method to create payment schedules for any missed periods
  async createMissedPaymentSchedules(
    loanId: string,
    loan: {
      start_date: string
      repayment_interval_unit?: string
      repayment_interval_value?: number
    },
    paymentDate: Date
  ): Promise<void> {
    const existingSchedules = await dbGetPaymentSchedulesByLoan(loanId)
    const loanStartDate = new Date(loan.start_date)

    // Handle weeks, months, and years
    if (
      !loan.repayment_interval_unit ||
      !loan.repayment_interval_value ||
      !['weeks', 'months', 'years'].includes(loan.repayment_interval_unit)
    ) {
      return
    }

    // Generate schedules from loan start until payment date
    const currentDate = new Date(loanStartDate)
    const payDate = new Date(paymentDate)

    // Safety limit to prevent infinite loops (max 1000 periods)
    let iterations = 0
    const maxIterations = 1000

    while (currentDate <= payDate && iterations < maxIterations) {
      iterations++
      let periodStart: Date
      let periodEnd: Date
      let dueDate: Date

      // Calculate period dates based on interval unit
      if (loan.repayment_interval_unit === 'weeks') {
        // Weekly: period is the week itself
        periodStart = new Date(currentDate)
        periodEnd = new Date(currentDate)
        periodEnd.setDate(periodEnd.getDate() + 6) // End of week
        dueDate = new Date(currentDate)
      } else if (loan.repayment_interval_unit === 'months') {
        // Monthly: period is the month
        periodStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        dueDate = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          loanStartDate.getDate()
        )
      } else if (loan.repayment_interval_unit === 'years') {
        // Yearly: period is the year
        periodStart = new Date(currentDate.getFullYear(), 0, 1)
        periodEnd = new Date(currentDate.getFullYear(), 11, 31)
        dueDate = new Date(
          currentDate.getFullYear(),
          loanStartDate.getMonth(),
          loanStartDate.getDate()
        )
      } else {
        break // Should not reach here
      }

      const periodStartStr = periodStart.toISOString().split('T')[0]
      const periodEndStr = periodEnd.toISOString().split('T')[0]

      // Check if schedule already exists
      const existingSchedule = existingSchedules.find(
        (schedule) =>
          schedule.period_start_date === periodStartStr && schedule.period_end_date === periodEndStr
      )

      if (!existingSchedule) {
        // Determine status: if due date has passed and we're past the period, mark as overdue
        const now = new Date()
        let status: PaymentSchedule['status'] = 'pending'

        if (dueDate < now && periodEnd < now) {
          // Period has ended and no schedule existed - mark as overdue
          status = 'overdue'
        }

        // Create the missed schedule with default/zero amounts
        // These can be updated later when actual payments are expected
        await dbCreatePaymentSchedule({
          loan_id: loanId,
          period_start_date: periodStartStr,
          period_end_date: periodEndStr,
          due_date: dueDate.toISOString().split('T')[0],
          total_principal_due: 0, // Will be set when payments are expected
          total_interest_due: 0, // Will be set when payments are expected
          status: status,
        })
      }

      // Move to next period
      if (loan.repayment_interval_unit === 'weeks') {
        currentDate.setDate(currentDate.getDate() + loan.repayment_interval_value * 7)
      } else if (loan.repayment_interval_unit === 'months') {
        currentDate.setMonth(currentDate.getMonth() + loan.repayment_interval_value)
      } else if (loan.repayment_interval_unit === 'years') {
        currentDate.setFullYear(currentDate.getFullYear() + loan.repayment_interval_value)
      }
    }
  },

  // Helper method to update payment schedule status based on payments
  async updatePaymentScheduleStatus(scheduleId: string): Promise<void> {
    const payments = await dbGetPaymentsByPaymentSchedule(scheduleId)
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const schedule = await dbGetPaymentSchedule(scheduleId)

    if (!schedule) return

    const totalDue = schedule.total_principal_due + schedule.total_interest_due
    let newStatus: PaymentSchedule['status']

    if (totalPaid >= totalDue) {
      newStatus = 'paid'
    } else if (totalPaid > 0) {
      newStatus = 'partially_paid'
    } else {
      // Check if due date has passed
      const now = new Date()
      const dueDate = new Date(schedule.due_date)
      newStatus = now > dueDate ? 'overdue' : 'pending'
    }

    if (newStatus !== schedule.status) {
      await dbUpdatePaymentSchedule(scheduleId, { status: newStatus })
    }
  },
}
