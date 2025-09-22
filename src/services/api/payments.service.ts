import {
  createPayment as dbCreatePayment,
  createPaymentSchedule as dbCreatePaymentSchedule,
  deletePayment as dbDeletePayment,
  deletePaymentSchedule as dbDeletePaymentSchedule,
  getBorrower as dbGetBorrower,
  getLastPaymentByLoan as dbGetLastPaymentByLoan,
  getLastPaymentsByLoans as dbGetLastPaymentsByLoans,
  getPaymentSchedule as dbGetPaymentSchedule,
  getPaymentSchedulesByLoan as dbGetPaymentSchedulesByLoan,
  getPayments as dbGetPayments,
  getPaymentsByLoan as dbGetPaymentsByLoan,
  updatePayment as dbUpdatePayment,
  updatePaymentSchedule as dbUpdatePaymentSchedule,
  deleteAllPaymentSchedulesAndPaymentsForLoan,
  getLoan,
  updateLoanBalance,
  updateLoanStatus,
} from '@/lib/database'
import { calculateAccruedInterest } from '@/lib/finance'
import { isFixedIncomeType } from '@/lib/loans'
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

  async ensurePaymentSchedulesExist(loanId: string): Promise<void> {
    const loan = await getLoan(loanId)
    if (!loan) {
      throw new Error('Loan not found')
    }

    // Bullet loans don't have payment schedules - they have payments only
    if (loan.loan_type === 'bullet') {
      return
    }

    // Get existing schedules
    const existingSchedules = await dbGetPaymentSchedulesByLoan(loanId)

    // If no schedules exist, create them from loan start date to a reasonable future date
    if (existingSchedules.length === 0) {
      await this.createMissedPaymentSchedules(
        loanId,
        {
          start_date: loan.start_date,
          repayment_interval_unit: loan.repayment_interval_unit,
          repayment_interval_value: loan.repayment_interval_value,
          current_balance: loan.current_balance,
          interest_rate: loan.interest_rate,
          loan_type: loan.loan_type,
        },
        new Date()
      )
    }
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
      repayment_interval_unit?: 'days' | 'weeks' | 'months' | 'years'
      repayment_interval_value?: number
      current_balance?: number
      interest_rate?: number
      loan_type?: 'installment' | 'bullet'
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
      // Calculate expected amounts for this period
      const expectedPrincipalDue = principalAmount
      let expectedInterestDue = interestAmount

      // If the payment amounts are less than what should be expected, calculate proper amounts
      if (
        loan.current_balance &&
        loan.interest_rate &&
        loan.interest_rate > 0 &&
        loan.loan_type &&
        loan.loan_type !== 'bullet'
      ) {
        const calculatedInterest = calculateAccruedInterest({
          current_balance: loan.current_balance,
          interest_rate: loan.interest_rate,
          repayment_interval_unit: loan.repayment_interval_unit,
          repayment_interval_value: loan.repayment_interval_value,
          loan_type: loan.loan_type,
        })
        expectedInterestDue = Math.max(interestAmount, calculatedInterest)
      }

      // Create new payment schedule for this period
      paymentSchedule = await dbCreatePaymentSchedule({
        loan_id: loanId,
        period_start_date: periodDates.periodStartStr,
        period_end_date: periodDates.periodEndStr,
        due_date: periodDates.dueDateStr,
        total_principal_due: expectedPrincipalDue,
        total_interest_due: expectedInterestDue,
        total_principal_paid: 0,
        total_interest_paid: 0,
        status: 'pending' as const,
      })
    } else {
      // Update existing schedule with the actual amounts being paid
      await dbUpdatePaymentSchedule(paymentSchedule.id, {
        total_principal_due: Math.max(paymentSchedule.total_principal_due, principalAmount),
        total_interest_due: Math.max(paymentSchedule.total_interest_due, interestAmount),
      })
      // Refresh the schedule object
      paymentSchedule = (await dbGetPaymentSchedule(paymentSchedule.id)) || paymentSchedule
    }

    return paymentSchedule
  },

  // Helper method to calculate payment period dates based on loan start date + interval
  calculatePaymentPeriod(
    loan: {
      start_date: string
      repayment_interval_unit?: string
      repayment_interval_value?: number
    },
    paymentDate: Date
  ): { periodStartStr: string; periodEndStr: string; dueDateStr: string } {
    const loanStartDate = new Date(loan.start_date)
    const intervalUnit = loan.repayment_interval_unit || 'months'
    const intervalValue = loan.repayment_interval_value || 1

    // Calculate which payment period this payment falls into based on loan start date
    let periodStart: Date
    let periodEnd: Date

    if (intervalUnit === 'months') {
      // For monthly payments, calculate which month period this payment belongs to
      const monthsSinceStart = Math.floor(
        (paymentDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
          paymentDate.getMonth() -
          loanStartDate.getMonth()
      )

      // Find the period number (0-based)
      const periodNumber = Math.floor(monthsSinceStart / intervalValue)

      // Calculate period start: loan start date + (periodNumber * interval) months
      periodStart = new Date(loanStartDate)
      periodStart.setMonth(loanStartDate.getMonth() + periodNumber * intervalValue)

      // Period end: period start + interval - 1 day
      periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodStart.getMonth() + intervalValue)
      periodEnd.setDate(periodEnd.getDate() - 1)
    } else if (intervalUnit === 'weeks') {
      // For weekly payments
      const weeksSinceStart = Math.floor(
        (paymentDate.getTime() - loanStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
      const periodNumber = Math.floor(weeksSinceStart / intervalValue)

      periodStart = new Date(loanStartDate)
      periodStart.setDate(loanStartDate.getDate() + periodNumber * intervalValue * 7)

      periodEnd = new Date(periodStart)
      periodEnd.setDate(periodStart.getDate() + intervalValue * 7 - 1)
    } else if (intervalUnit === 'years') {
      // For yearly payments
      const yearsSinceStart = paymentDate.getFullYear() - loanStartDate.getFullYear()
      const periodNumber = Math.floor(yearsSinceStart / intervalValue)

      periodStart = new Date(loanStartDate)
      periodStart.setFullYear(loanStartDate.getFullYear() + periodNumber * intervalValue)

      periodEnd = new Date(periodStart)
      periodEnd.setFullYear(periodStart.getFullYear() + intervalValue)
      periodEnd.setDate(periodEnd.getDate() - 1)
    } else {
      // Default to monthly for any other interval
      const monthsSinceStart = Math.floor(
        (paymentDate.getFullYear() - loanStartDate.getFullYear()) * 12 +
          paymentDate.getMonth() -
          loanStartDate.getMonth()
      )
      const periodNumber = Math.floor(monthsSinceStart / intervalValue)

      periodStart = new Date(loanStartDate)
      periodStart.setMonth(loanStartDate.getMonth() + periodNumber * intervalValue)

      periodEnd = new Date(periodStart)
      periodEnd.setMonth(periodStart.getMonth() + intervalValue)
      periodEnd.setDate(periodEnd.getDate() - 1)
    }

    // Due date is the same as period end
    const dueDate = new Date(periodEnd)

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

    const totalAmount = data.principal_amount + data.interest_amount
    const newBalance = loan.current_balance - data.principal_amount

    let paymentScheduleId: string

    if (loan.loan_type === 'bullet') {
      // Bullet loans don't use payment schedules - create payment directly
      if (data.payment_schedule_id) {
        throw new Error('Bullet loans should not have payment_schedule_id')
      }

      // For bullet loans, we create a special "bullet payment" schedule entry
      // This maintains database consistency while indicating it's a bullet loan payment
      const bulletSchedule = await dbCreatePaymentSchedule({
        loan_id: data.loan_id,
        period_start_date: data.payment_date,
        period_end_date: data.payment_date,
        due_date: data.payment_date,
        total_principal_due: 0, // No expected amounts for bullet loans
        total_interest_due: 0,
        total_principal_paid: data.principal_amount,
        total_interest_paid: data.interest_amount,
        status: 'paid',
      })
      paymentScheduleId = bulletSchedule.id
    } else {
      // Installment loans require existing payment schedules
      if (!data.payment_schedule_id) {
        throw new Error('Installment loans require payment_schedule_id')
      }

      const paymentSchedule = await dbGetPaymentSchedule(data.payment_schedule_id)
      if (!paymentSchedule) {
        throw new Error('Payment schedule not found')
      }

      if (paymentSchedule.loan_id !== data.loan_id) {
        throw new Error('Payment schedule does not belong to the specified loan')
      }

      paymentScheduleId = data.payment_schedule_id
    }

    const paymentData = {
      payment_schedule_id: paymentScheduleId,
      amount: totalAmount,
      payment_date: data.payment_date,
      principal_amount: data.principal_amount,
      interest_amount: data.interest_amount,
      payment_type: (data.principal_amount > 0 && data.interest_amount > 0
        ? 'mixed'
        : data.principal_amount > 0
          ? 'principal'
          : 'interest') as Payment['payment_type'],
      notes: data.notes,
    }

    const dbPayment = await dbCreatePayment(paymentData)

    // Update payment schedule totals only for installment loans
    if (loan.loan_type !== 'bullet') {
      await this.updatePaymentScheduleTotals(
        paymentScheduleId,
        data.principal_amount,
        data.interest_amount
      )

      // Update payment schedule status based on payments
      await this.updatePaymentScheduleStatus(paymentScheduleId)
    }

    // Update loan balance if there's a principal payment
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

    // Update payment schedule totals
    await this.updatePaymentScheduleTotals(
      originalSchedule.id,
      -originalPayment.principal_amount,
      -originalPayment.interest_amount
    )
    await this.updatePaymentScheduleTotals(newSchedule.id, newPrincipalAmount, newInterestAmount)

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

    // For bullet loans, also delete the special payment schedule we created
    if (loan.loan_type === 'bullet') {
      await dbDeletePaymentSchedule(schedule.id)
    } else {
      // Update payment schedule totals only for installment loans
      await this.updatePaymentScheduleTotals(
        schedule.id,
        -payment.principal_amount,
        -payment.interest_amount
      )

      // Update payment schedule status
      await this.updatePaymentScheduleStatus(schedule.id)
    }
  },

  // Helper method to create payment schedules for any missed periods
  async createMissedPaymentSchedules(
    loanId: string,
    loan: {
      start_date: string
      repayment_interval_unit?: 'days' | 'weeks' | 'months' | 'years'
      repayment_interval_value?: number
      current_balance?: number
      interest_rate?: number
      loan_type?: 'installment' | 'bullet'
    },
    upToDate: Date
  ): Promise<void> {
    // Bullet loans don't have payment schedules
    if (loan.loan_type === 'bullet') {
      return
    }
    const existingSchedules = await dbGetPaymentSchedulesByLoan(loanId)
    const loanStartDate = new Date(loan.start_date)
    const intervalUnit = loan.repayment_interval_unit || 'months'
    const intervalValue = loan.repayment_interval_value || 1

    // Safety limit to prevent infinite loops (max 1000 periods)
    let iterations = 0
    const maxIterations = 1000

    // Calculate periods from loan start date using the new logic
    let periodNumber = 0

    while (iterations < maxIterations) {
      iterations++
      let periodStart: Date
      let periodEnd: Date

      // Calculate period start: loan start date + (periodNumber * interval)
      if (intervalUnit === 'months') {
        periodStart = new Date(loanStartDate)
        periodStart.setMonth(loanStartDate.getMonth() + periodNumber * intervalValue)

        periodEnd = new Date(periodStart)
        periodEnd.setMonth(periodStart.getMonth() + intervalValue)
        periodEnd.setDate(periodEnd.getDate() - 1)
      } else if (intervalUnit === 'weeks') {
        periodStart = new Date(loanStartDate)
        periodStart.setDate(loanStartDate.getDate() + periodNumber * intervalValue * 7)

        periodEnd = new Date(periodStart)
        periodEnd.setDate(periodStart.getDate() + intervalValue * 7 - 1)
      } else if (intervalUnit === 'years') {
        periodStart = new Date(loanStartDate)
        periodStart.setFullYear(loanStartDate.getFullYear() + periodNumber * intervalValue)

        periodEnd = new Date(periodStart)
        periodEnd.setFullYear(periodStart.getFullYear() + intervalValue)
        periodEnd.setDate(periodEnd.getDate() - 1)
      } else {
        break
      }

      // If period start is after the target date, we're done
      if (periodStart > upToDate) {
        break
      }

      // Calculate due date as start of next period (not end of current period)
      let dueDate: Date
      if (intervalUnit === 'months') {
        dueDate = new Date(periodStart)
        dueDate.setMonth(periodStart.getMonth() + intervalValue)
      } else if (intervalUnit === 'weeks') {
        dueDate = new Date(periodStart)
        dueDate.setDate(periodStart.getDate() + intervalValue * 7)
      } else if (intervalUnit === 'years') {
        dueDate = new Date(periodStart)
        dueDate.setFullYear(periodStart.getFullYear() + intervalValue)
      } else {
        dueDate = periodEnd // fallback to current logic for days
      }

      const periodStartStr = periodStart.toISOString().split('T')[0]
      const periodEndStr = periodEnd.toISOString().split('T')[0]
      const dueDateStr = dueDate.toISOString().split('T')[0]

      // Check if schedule already exists
      const existingSchedule = existingSchedules.find(
        (schedule) =>
          schedule.period_start_date === periodStartStr && schedule.period_end_date === periodEndStr
      )

      if (!existingSchedule) {
        // Determine status: if due date has passed, mark as overdue
        const now = new Date()
        let status: PaymentSchedule['status'] = 'pending'

        if (periodEnd < now) {
          status = 'overdue'
        }

        // Calculate expected amounts for this period
        let principalDue = 0
        let interestDue = 0

        if (
          loan.current_balance &&
          loan.interest_rate &&
          loan.interest_rate > 0 &&
          loan.loan_type
        ) {
          // For fixed income types, the interest is the expected payment amount
          if (isFixedIncomeType(loan.loan_type as any)) {
            // For fixed income loans, the amount is typically pure income/interest
            interestDue = calculateAccruedInterest({
              current_balance: loan.current_balance,
              interest_rate: loan.interest_rate,
              repayment_interval_unit: loan.repayment_interval_unit,
              repayment_interval_value: loan.repayment_interval_value,
              loan_type: loan.loan_type,
            })
          } else if (loan.loan_type === 'installment') {
            // For installment loans only, calculate accrued interest
            interestDue = calculateAccruedInterest({
              current_balance: loan.current_balance,
              interest_rate: loan.interest_rate,
              repayment_interval_unit: loan.repayment_interval_unit,
              repayment_interval_value: loan.repayment_interval_value,
              loan_type: loan.loan_type,
            })

            // For installment loans, we might expect principal payments too
            // This could be extended based on loan amortization schedule
            principalDue = 0
          }
          // Bullet loans don't have expected interest amounts - they are manual
        }

        // Create the missed schedule with calculated amounts
        const newSchedule = await dbCreatePaymentSchedule({
          loan_id: loanId,
          period_start_date: periodStartStr,
          period_end_date: periodEndStr,
          due_date: dueDateStr,
          total_principal_due: principalDue,
          total_interest_due: interestDue,
          total_principal_paid: 0,
          total_interest_paid: 0,
          status: status,
        })

        // Add the newly created schedule to our local array to avoid duplicate attempts
        existingSchedules.push(newSchedule)
      }

      periodNumber++
    }
  },

  // Helper method to update payment schedule accumulated totals
  async updatePaymentScheduleTotals(
    scheduleId: string,
    principalAmount: number,
    interestAmount: number
  ): Promise<void> {
    const schedule = await dbGetPaymentSchedule(scheduleId)
    if (!schedule) return

    const newPrincipalTotal = schedule.total_principal_paid + principalAmount
    const newInterestTotal = schedule.total_interest_paid + interestAmount

    await dbUpdatePaymentSchedule(scheduleId, {
      total_principal_paid: Math.max(0, newPrincipalTotal),
      total_interest_paid: Math.max(0, newInterestTotal),
    })
  },

  // Helper method to update payment schedule status based on accumulated totals
  async updatePaymentScheduleStatus(scheduleId: string): Promise<void> {
    const schedule = await dbGetPaymentSchedule(scheduleId)
    if (!schedule) return

    const totalDue = schedule.total_principal_due + schedule.total_interest_due
    const totalPaid = schedule.total_principal_paid + schedule.total_interest_paid
    let newStatus: PaymentSchedule['status']

    if (totalPaid >= totalDue && totalDue > 0) {
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

  async deleteAllPaymentSchedulesAndPaymentsForLoan(loanId: string): Promise<void> {
    await deleteAllPaymentSchedulesAndPaymentsForLoan(loanId)
  },
}
