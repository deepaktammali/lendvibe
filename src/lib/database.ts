import Database from '@tauri-apps/plugin-sql'
import type {
  Borrower,
  FixedIncome,
  IncomePayment,
  Loan,
  Payment,
  PaymentSchedule,
} from '../types/database'

let db: Database | null = null

export async function initDatabase(): Promise<Database> {
  if (db) return db
  db = await Database.load('sqlite:lending.db')
  return db
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

// Borrower operations
export async function createBorrower(
  borrower: Omit<Borrower, 'id' | 'created_at'>
): Promise<Borrower> {
  const database = await initDatabase()
  const newBorrower: Borrower = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...borrower,
  }

  await database.execute(
    'INSERT INTO borrowers (id, name, email, phone, address, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [
      newBorrower.id,
      newBorrower.name,
      newBorrower.email,
      newBorrower.phone,
      newBorrower.address,
      newBorrower.created_at,
    ]
  )

  return newBorrower
}

export async function getBorrowers(): Promise<Borrower[]> {
  const database = await initDatabase()
  const result = await database.select<Borrower[]>('SELECT * FROM borrowers ORDER BY name')
  return result
}

export async function getBorrower(id: string): Promise<Borrower | null> {
  const database = await initDatabase()
  const result = await database.select<Borrower[]>('SELECT * FROM borrowers WHERE id = $1', [id])
  return result.length > 0 ? result[0] : null
}

export async function updateBorrower(
  id: string,
  updates: Partial<Omit<Borrower, 'id' | 'created_at'>>
): Promise<void> {
  const database = await initDatabase()
  const fields = []
  const values = []
  let paramIndex = 1

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`)
    values.push(updates.name)
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`)
    values.push(updates.email)
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`)
    values.push(updates.phone)
  }
  if (updates.address !== undefined) {
    fields.push(`address = $${paramIndex++}`)
    values.push(updates.address)
  }

  if (fields.length > 0) {
    values.push(id)
    await database.execute(
      `UPDATE borrowers SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }
}

export async function deleteBorrower(id: string): Promise<void> {
  const database = await initDatabase()
  await database.execute('DELETE FROM borrowers WHERE id = $1', [id])
}

// Loan operations
export async function createLoan(loan: Omit<Loan, 'id' | 'created_at'>): Promise<Loan> {
  const database = await initDatabase()
  const newLoan: Loan = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...loan,
  }

  await database.execute(
    'INSERT INTO loans (id, borrower_id, principal_amount, interest_rate, start_date, end_date, status, current_balance, created_at, loan_type, repayment_interval_unit, repayment_interval_value, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
    [
      newLoan.id,
      newLoan.borrower_id,
      newLoan.principal_amount,
      newLoan.interest_rate,
      newLoan.start_date,
      newLoan.end_date,
      newLoan.status,
      newLoan.current_balance,
      newLoan.created_at,
      newLoan.loan_type,
      newLoan.repayment_interval_unit,
      newLoan.repayment_interval_value,
      newLoan.notes,
    ]
  )

  return newLoan
}

export async function getLoans(): Promise<Loan[]> {
  const database = await initDatabase()
  const result = await database.select<Loan[]>('SELECT * FROM loans ORDER BY start_date DESC')
  return result
}

export async function getLoan(id: string): Promise<Loan | null> {
  const database = await initDatabase()
  const result = await database.select<Loan[]>('SELECT * FROM loans WHERE id = $1', [id])
  return result.length > 0 ? result[0] : null
}

export async function getLoansByBorrower(borrowerId: string): Promise<Loan[]> {
  const database = await initDatabase()
  const result = await database.select<Loan[]>(
    'SELECT * FROM loans WHERE borrower_id = $1 ORDER BY start_date DESC',
    [borrowerId]
  )
  return result
}

export async function updateLoanBalance(id: string, newBalance: number): Promise<void> {
  const database = await initDatabase()
  await database.execute('UPDATE loans SET current_balance = $1 WHERE id = $2', [newBalance, id])
}

export async function updateLoanStatus(id: string, status: Loan['status']): Promise<void> {
  const database = await initDatabase()
  await database.execute('UPDATE loans SET status = $1 WHERE id = $2', [status, id])
}

export async function updateLoan(
  id: string,
  updates: Partial<Omit<Loan, 'id' | 'created_at'>>
): Promise<void> {
  const database = await initDatabase()
  const fields = []
  const values = []
  let paramIndex = 1

  if (updates.borrower_id !== undefined) {
    fields.push(`borrower_id = $${paramIndex++}`)
    values.push(updates.borrower_id)
  }
  if (updates.loan_type !== undefined) {
    fields.push(`loan_type = $${paramIndex++}`)
    values.push(updates.loan_type)
  }
  if (updates.principal_amount !== undefined) {
    fields.push(`principal_amount = $${paramIndex++}`)
    values.push(updates.principal_amount)
  }
  if (updates.interest_rate !== undefined) {
    fields.push(`interest_rate = $${paramIndex++}`)
    values.push(updates.interest_rate)
  }
  if (updates.start_date !== undefined) {
    fields.push(`start_date = $${paramIndex++}`)
    values.push(updates.start_date)
  }
  if (updates.end_date !== undefined) {
    fields.push(`end_date = $${paramIndex++}`)
    values.push(updates.end_date)
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`)
    values.push(updates.status)
  }
  if (updates.current_balance !== undefined) {
    fields.push(`current_balance = $${paramIndex++}`)
    values.push(updates.current_balance)
  }
  if (updates.repayment_interval_unit !== undefined) {
    fields.push(`repayment_interval_unit = $${paramIndex++}`)
    values.push(updates.repayment_interval_unit)
  }
  if (updates.repayment_interval_value !== undefined) {
    fields.push(`repayment_interval_value = $${paramIndex++}`)
    values.push(updates.repayment_interval_value)
  }

  if (fields.length > 0) {
    values.push(id)
    await database.execute(
      `UPDATE loans SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }
}

export async function deleteLoan(id: string): Promise<void> {
  const database = await initDatabase()
  await database.execute('DELETE FROM loans WHERE id = $1', [id])
}

// Payment Schedule operations
export async function createPaymentSchedule(
  schedule: Omit<PaymentSchedule, 'id' | 'created_at'>
): Promise<PaymentSchedule> {
  const database = await initDatabase()
  const newSchedule: PaymentSchedule = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...schedule,
  }

  await database.execute(
    'INSERT INTO payment_schedules (id, loan_id, period_start_date, period_end_date, due_date, total_principal_due, total_interest_due, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      newSchedule.id,
      newSchedule.loan_id,
      newSchedule.period_start_date,
      newSchedule.period_end_date,
      newSchedule.due_date,
      newSchedule.total_principal_due,
      newSchedule.total_interest_due,
      newSchedule.status,
      newSchedule.created_at,
    ]
  )

  return newSchedule
}

export async function getPaymentSchedules(): Promise<PaymentSchedule[]> {
  const database = await initDatabase()
  const result = await database.select<PaymentSchedule[]>(
    'SELECT * FROM payment_schedules ORDER BY due_date DESC'
  )
  return result
}

export async function getPaymentSchedule(id: string): Promise<PaymentSchedule | null> {
  const database = await initDatabase()
  const result = await database.select<PaymentSchedule[]>(
    'SELECT * FROM payment_schedules WHERE id = $1',
    [id]
  )
  return result.length > 0 ? result[0] : null
}

export async function getPaymentSchedulesByLoan(loanId: string): Promise<PaymentSchedule[]> {
  const database = await initDatabase()
  const result = await database.select<PaymentSchedule[]>(
    'SELECT * FROM payment_schedules WHERE loan_id = $1 ORDER BY due_date DESC',
    [loanId]
  )
  return result
}

export async function updatePaymentSchedule(
  id: string,
  updates: Partial<Omit<PaymentSchedule, 'id' | 'created_at'>>
): Promise<void> {
  const database = await initDatabase()
  const fields = []
  const values = []
  let paramIndex = 1

  if (updates.loan_id !== undefined) {
    fields.push(`loan_id = $${paramIndex++}`)
    values.push(updates.loan_id)
  }
  if (updates.period_start_date !== undefined) {
    fields.push(`period_start_date = $${paramIndex++}`)
    values.push(updates.period_start_date)
  }
  if (updates.period_end_date !== undefined) {
    fields.push(`period_end_date = $${paramIndex++}`)
    values.push(updates.period_end_date)
  }
  if (updates.due_date !== undefined) {
    fields.push(`due_date = $${paramIndex++}`)
    values.push(updates.due_date)
  }
  if (updates.total_principal_due !== undefined) {
    fields.push(`total_principal_due = $${paramIndex++}`)
    values.push(updates.total_principal_due)
  }
  if (updates.total_interest_due !== undefined) {
    fields.push(`total_interest_due = $${paramIndex++}`)
    values.push(updates.total_interest_due)
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`)
    values.push(updates.status)
  }

  if (fields.length > 0) {
    values.push(id)
    await database.execute(
      `UPDATE payment_schedules SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }
}

export async function deletePaymentSchedule(id: string): Promise<void> {
  const database = await initDatabase()
  await database.execute('DELETE FROM payment_schedules WHERE id = $1', [id])
}

// Payment operations
export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const database = await initDatabase()
  const newPayment: Payment = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...payment,
  }

  await database.execute(
    'INSERT INTO payments (id, payment_schedule_id, amount, payment_type, principal_amount, interest_amount, payment_date, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      newPayment.id,
      newPayment.payment_schedule_id,
      newPayment.amount,
      newPayment.payment_type,
      newPayment.principal_amount,
      newPayment.interest_amount,
      newPayment.payment_date,
      newPayment.notes,
      newPayment.created_at,
    ]
  )

  return newPayment
}

export async function getPaymentsByPaymentSchedule(paymentScheduleId: string): Promise<Payment[]> {
  const database = await initDatabase()
  const result = await database.select<Payment[]>(
    'SELECT * FROM payments WHERE payment_schedule_id = $1 ORDER BY payment_date DESC',
    [paymentScheduleId]
  )
  return result
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
  const database = await initDatabase()
  const result = await database.select<Payment[]>(
    `SELECT p.* FROM payments p
     JOIN payment_schedules ps ON p.payment_schedule_id = ps.id
     WHERE ps.loan_id = $1 ORDER BY p.payment_date DESC`,
    [loanId]
  )
  return result
}

export async function getPayments(): Promise<Payment[]> {
  const database = await initDatabase()
  const result = await database.select<Payment[]>(
    'SELECT * FROM payments ORDER BY payment_date DESC'
  )
  return result
}

export async function getLastPaymentByLoan(loanId: string): Promise<Payment | null> {
  const database = await initDatabase()
  const result = await database.select<Payment[]>(
    `SELECT p.* FROM payments p
     JOIN payment_schedules ps ON p.payment_schedule_id = ps.id
     WHERE ps.loan_id = $1 ORDER BY p.payment_date DESC LIMIT 1`,
    [loanId]
  )
  return result.length > 0 ? result[0] : null
}

export async function getLastPaymentsByLoans(loanIds: string[]): Promise<Map<string, Payment>> {
  if (loanIds.length === 0) return new Map()

  const database = await initDatabase()
  const placeholders = loanIds.map((_, i) => `$${i + 1}`).join(',')
  const result = await database.select<(Payment & { loan_id: string })[]>(
    `SELECT p1.*, ps.loan_id FROM payments p1
     JOIN payment_schedules ps ON p1.payment_schedule_id = ps.id
     INNER JOIN (
       SELECT ps_inner.loan_id, MAX(p_inner.payment_date) as max_date
       FROM payments p_inner
       JOIN payment_schedules ps_inner ON p_inner.payment_schedule_id = ps_inner.id
       WHERE ps_inner.loan_id IN (${placeholders})
       GROUP BY ps_inner.loan_id
     ) p2 ON ps.loan_id = p2.loan_id AND p1.payment_date = p2.max_date
     WHERE ps.loan_id IN (${placeholders})`,
    [...loanIds, ...loanIds]
  )

  const lastPayments = new Map<string, Payment>()
  result.forEach((payment) => {
    lastPayments.set(payment.loan_id, payment)
  })

  return lastPayments
}

export async function updatePayment(
  id: string,
  updates: Partial<Omit<Payment, 'id' | 'created_at'>>
): Promise<void> {
  const database = await initDatabase()
  const fields = []
  const values = []
  let paramIndex = 1

  if (updates.payment_schedule_id !== undefined) {
    fields.push(`payment_schedule_id = $${paramIndex++}`)
    values.push(updates.payment_schedule_id)
  }
  if (updates.amount !== undefined) {
    fields.push(`amount = $${paramIndex++}`)
    values.push(updates.amount)
  }
  if (updates.payment_type !== undefined) {
    fields.push(`payment_type = $${paramIndex++}`)
    values.push(updates.payment_type)
  }
  if (updates.principal_amount !== undefined) {
    fields.push(`principal_amount = $${paramIndex++}`)
    values.push(updates.principal_amount)
  }
  if (updates.interest_amount !== undefined) {
    fields.push(`interest_amount = $${paramIndex++}`)
    values.push(updates.interest_amount)
  }
  if (updates.payment_date !== undefined) {
    fields.push(`payment_date = $${paramIndex++}`)
    values.push(updates.payment_date)
  }

  if (fields.length > 0) {
    values.push(id)
    await database.execute(
      `UPDATE payments SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }
}

export async function deletePayment(id: string): Promise<void> {
  const database = await initDatabase()
  await database.execute('DELETE FROM payments WHERE id = $1', [id])
}

export async function getRealRemainingPrincipal(loanId: string): Promise<number> {
  const database = await initDatabase()

  // Get the loan's original principal amount
  const loan = await getLoan(loanId)
  if (!loan) return 0

  // Get sum of all principal payments for this loan
  const result = await database.select<{ total_principal_paid: number }[]>(
    'SELECT COALESCE(SUM(principal_amount), 0) as total_principal_paid FROM payments WHERE loan_id = $1',
    [loanId]
  )

  const totalPrincipalPaid = result[0]?.total_principal_paid || 0
  const remainingPrincipal = loan.principal_amount - totalPrincipalPaid

  return Math.max(0, remainingPrincipal)
}

export async function getLoansWithBorrowers(): Promise<(Loan & { borrower_name: string })[]> {
  const database = await initDatabase()
  const result = await database.select<(Loan & { borrower_name: string })[]>(
    'SELECT l.*, b.name as borrower_name FROM loans l JOIN borrowers b ON l.borrower_id = b.id WHERE l.status = "active" ORDER BY l.start_date DESC'
  )
  return result
}

export async function getLoansWithCalculatedBalances(): Promise<
  (Loan & { borrower_name: string; real_remaining_principal: number })[]
> {
  const database = await initDatabase()

  // Get loans with borrower names and calculated remaining principal
  const result = await database.select<
    (Loan & { borrower_name: string; total_principal_paid: number })[]
  >(
    `SELECT
      l.*,
      b.name as borrower_name,
      COALESCE(p.total_principal_paid, 0) as total_principal_paid
    FROM loans l
    JOIN borrowers b ON l.borrower_id = b.id
    LEFT JOIN (
      SELECT loan_id, SUM(principal_amount) as total_principal_paid
      FROM payments
      GROUP BY loan_id
    ) p ON l.id = p.loan_id
    WHERE l.status = "active"
    ORDER BY l.start_date DESC`
  )

  return result.map((loan) => ({
    ...loan,
    real_remaining_principal: Math.max(0, loan.principal_amount - (loan.total_principal_paid || 0)),
  }))
}

export async function syncAllLoanBalances(): Promise<void> {
  const database = await initDatabase()

  // Get all loans with their calculated remaining principal
  const result = await database.select<(Loan & { total_principal_paid: number })[]>(
    `SELECT
      l.*,
      COALESCE(p.total_principal_paid, 0) as total_principal_paid
    FROM loans l
    LEFT JOIN (
      SELECT loan_id, SUM(principal_amount) as total_principal_paid
      FROM payments
      GROUP BY loan_id
    ) p ON l.id = p.loan_id
    WHERE l.status = "active"`
  )

  // Update each loan's current_balance to match the calculated remaining principal
  for (const loan of result) {
    const realRemainingPrincipal = Math.max(
      0,
      loan.principal_amount - (loan.total_principal_paid || 0)
    )
    await updateLoanBalance(loan.id, realRemainingPrincipal)
  }
}

// Fixed Income operations
export async function createFixedIncome(
  fixedIncome: Omit<FixedIncome, 'id' | 'created_at'>
): Promise<FixedIncome> {
  const database = await initDatabase()
  const newFixedIncome: FixedIncome = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...fixedIncome,
  }

  await database.execute(
    'INSERT INTO fixed_income (id, tenant_id, income_type, principal_amount, income_rate, payment_interval_unit, payment_interval_value, start_date, end_date, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
    [
      newFixedIncome.id,
      newFixedIncome.tenant_id,
      newFixedIncome.income_type,
      newFixedIncome.principal_amount,
      newFixedIncome.income_rate,
      newFixedIncome.payment_interval_unit,
      newFixedIncome.payment_interval_value,
      newFixedIncome.start_date,
      newFixedIncome.end_date,
      newFixedIncome.status,
      newFixedIncome.created_at,
    ]
  )

  return newFixedIncome
}

export async function getFixedIncomes(): Promise<FixedIncome[]> {
  const database = await initDatabase()
  const result = await database.select<FixedIncome[]>(
    'SELECT * FROM fixed_income ORDER BY start_date DESC'
  )
  return result
}

export async function getFixedIncome(id: string): Promise<FixedIncome | null> {
  const database = await initDatabase()
  const result = await database.select<FixedIncome[]>('SELECT * FROM fixed_income WHERE id = $1', [
    id,
  ])
  return result.length > 0 ? result[0] : null
}

export async function getFixedIncomesByTenant(tenantId: string): Promise<FixedIncome[]> {
  const database = await initDatabase()
  const result = await database.select<FixedIncome[]>(
    'SELECT * FROM fixed_income WHERE tenant_id = $1 ORDER BY start_date DESC',
    [tenantId]
  )
  return result
}

export async function updateFixedIncomeStatus(
  id: string,
  status: FixedIncome['status']
): Promise<void> {
  const database = await initDatabase()
  await database.execute('UPDATE fixed_income SET status = $1 WHERE id = $2', [status, id])
}

export async function deleteFixedIncome(id: string): Promise<void> {
  const database = await initDatabase()
  await database.execute('DELETE FROM fixed_income WHERE id = $1', [id])
}

export async function getFixedIncomesWithTenants(): Promise<
  (FixedIncome & { tenant_name: string })[]
> {
  const database = await initDatabase()
  const result = await database.select<(FixedIncome & { tenant_name: string })[]>(
    'SELECT f.*, b.name as tenant_name FROM fixed_income f JOIN borrowers b ON f.tenant_id = b.id WHERE f.status = "active" ORDER BY f.start_date DESC'
  )
  return result
}

// Income Payment operations
export async function createIncomePayment(
  payment: Omit<IncomePayment, 'id' | 'created_at'>
): Promise<IncomePayment> {
  const database = await initDatabase()
  const newPayment: IncomePayment = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...payment,
  }

  await database.execute(
    'INSERT INTO income_payments (id, fixed_income_id, amount, payment_date, notes, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [
      newPayment.id,
      newPayment.fixed_income_id,
      newPayment.amount,
      newPayment.payment_date,
      newPayment.notes,
      newPayment.created_at,
    ]
  )

  return newPayment
}

export async function getIncomePaymentsByFixedIncome(
  fixedIncomeId: string
): Promise<IncomePayment[]> {
  const database = await initDatabase()
  const result = await database.select<IncomePayment[]>(
    'SELECT * FROM income_payments WHERE fixed_income_id = $1 ORDER BY payment_date DESC',
    [fixedIncomeId]
  )
  return result
}

export async function getIncomePayments(): Promise<IncomePayment[]> {
  const database = await initDatabase()
  const result = await database.select<IncomePayment[]>(
    'SELECT * FROM income_payments ORDER BY payment_date DESC'
  )
  return result
}

export async function getLastIncomePaymentByFixedIncome(
  fixedIncomeId: string
): Promise<IncomePayment | null> {
  const database = await initDatabase()
  const result = await database.select<IncomePayment[]>(
    'SELECT * FROM income_payments WHERE fixed_income_id = $1 ORDER BY payment_date DESC LIMIT 1',
    [fixedIncomeId]
  )
  return result.length > 0 ? result[0] : null
}

export async function getLastIncomePaymentsByFixedIncomes(
  fixedIncomeIds: string[]
): Promise<Map<string, IncomePayment>> {
  if (fixedIncomeIds.length === 0) return new Map()

  const database = await initDatabase()
  const placeholders = fixedIncomeIds.map((_, i) => `$${i + 1}`).join(',')
  const result = await database.select<IncomePayment[]>(
    `SELECT p1.* FROM income_payments p1
     INNER JOIN (
       SELECT fixed_income_id, MAX(payment_date) as max_date
       FROM income_payments
       WHERE fixed_income_id IN (${placeholders})
       GROUP BY fixed_income_id
     ) p2 ON p1.fixed_income_id = p2.fixed_income_id AND p1.payment_date = p2.max_date
     WHERE p1.fixed_income_id IN (${placeholders})`,
    [...fixedIncomeIds, ...fixedIncomeIds]
  )

  const lastPayments = new Map<string, IncomePayment>()
  result.forEach((payment) => {
    lastPayments.set(payment.fixed_income_id, payment)
  })

  return lastPayments
}

export async function updateIncomePayment(
  id: string,
  updates: Partial<Omit<IncomePayment, 'id' | 'created_at'>>
): Promise<void> {
  const database = await initDatabase()
  const fields = []
  const values = []
  let paramIndex = 1

  if (updates.fixed_income_id !== undefined) {
    fields.push(`fixed_income_id = $${paramIndex++}`)
    values.push(updates.fixed_income_id)
  }
  if (updates.amount !== undefined) {
    fields.push(`amount = $${paramIndex++}`)
    values.push(updates.amount)
  }
  if (updates.payment_date !== undefined) {
    fields.push(`payment_date = $${paramIndex++}`)
    values.push(updates.payment_date)
  }

  if (fields.length > 0) {
    values.push(id)
    await database.execute(
      `UPDATE income_payments SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    )
  }
}

export async function deleteIncomePayment(id: string): Promise<void> {
  const database = await initDatabase()
  await database.execute('DELETE FROM income_payments WHERE id = $1', [id])
}
