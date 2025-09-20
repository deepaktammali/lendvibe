import Database from '@tauri-apps/plugin-sql';
import type { Borrower, Loan, Payment } from '../types/database';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  if (db) return db;
  
  db = await Database.load('sqlite:lending.db');
  
  // Create tables if they don't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS borrowers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      borrower_id TEXT NOT NULL,
      principal_amount REAL NOT NULL,
      interest_rate REAL NOT NULL,
      term_months INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      current_balance REAL NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (borrower_id) REFERENCES borrowers (id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      loan_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_type TEXT NOT NULL,
      principal_amount REAL NOT NULL,
      interest_amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (loan_id) REFERENCES loans (id)
    );
  `);

  // Create indexes for better performance
  await db.execute('CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans (borrower_id);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_loan_id ON payments (loan_id);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status);');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_payments_date ON payments (payment_date);');

  return db;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

// Borrower operations
export async function createBorrower(borrower: Omit<Borrower, 'id' | 'created_at'>): Promise<Borrower> {
  const database = await initDatabase();
  const newBorrower: Borrower = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...borrower,
  };

  await database.execute(
    'INSERT INTO borrowers (id, name, email, phone, address, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [newBorrower.id, newBorrower.name, newBorrower.email, newBorrower.phone, newBorrower.address, newBorrower.created_at]
  );

  return newBorrower;
}

export async function getBorrowers(): Promise<Borrower[]> {
  const database = await initDatabase();
  const result = await database.select<Borrower[]>(
    'SELECT id, name, email, phone, address, created_at FROM borrowers ORDER BY name'
  );
  return result;
}

export async function getBorrower(id: string): Promise<Borrower | null> {
  const database = await initDatabase();
  const result = await database.select<Borrower[]>(
    'SELECT id, name, email, phone, address, created_at FROM borrowers WHERE id = $1',
    [id]
  );
  return result.length > 0 ? result[0] : null;
}

export async function updateBorrower(id: string, updates: Partial<Omit<Borrower, 'id' | 'created_at'>>): Promise<void> {
  const database = await initDatabase();
  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(updates.email);
  }
  if (updates.phone !== undefined) {
    fields.push(`phone = $${paramIndex++}`);
    values.push(updates.phone);
  }
  if (updates.address !== undefined) {
    fields.push(`address = $${paramIndex++}`);
    values.push(updates.address);
  }

  if (fields.length > 0) {
    values.push(id);
    await database.execute(
      `UPDATE borrowers SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }
}

export async function deleteBorrower(id: string): Promise<void> {
  const database = await initDatabase();
  await database.execute('DELETE FROM borrowers WHERE id = $1', [id]);
}

// Loan operations
export async function createLoan(loan: Omit<Loan, 'id' | 'created_at'>): Promise<Loan> {
  const database = await initDatabase();
  const newLoan: Loan = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...loan,
  };

  await database.execute(
    'INSERT INTO loans (id, borrower_id, principal_amount, interest_rate, term_months, start_date, status, current_balance, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      newLoan.id,
      newLoan.borrower_id,
      newLoan.principal_amount,
      newLoan.interest_rate,
      newLoan.term_months,
      newLoan.start_date,
      newLoan.status,
      newLoan.current_balance,
      newLoan.created_at,
    ]
  );

  return newLoan;
}

export async function getLoans(): Promise<Loan[]> {
  const database = await initDatabase();
  const result = await database.select<Loan[]>(
    'SELECT id, borrower_id, principal_amount, interest_rate, term_months, start_date, status, current_balance, created_at FROM loans ORDER BY start_date DESC'
  );
  return result;
}

export async function getLoan(id: string): Promise<Loan | null> {
  const database = await initDatabase();
  const result = await database.select<Loan[]>(
    'SELECT id, borrower_id, principal_amount, interest_rate, term_months, start_date, status, current_balance, created_at FROM loans WHERE id = $1',
    [id]
  );
  return result.length > 0 ? result[0] : null;
}

export async function getLoansByBorrower(borrowerId: string): Promise<Loan[]> {
  const database = await initDatabase();
  const result = await database.select<Loan[]>(
    'SELECT id, borrower_id, principal_amount, interest_rate, term_months, start_date, status, current_balance, created_at FROM loans WHERE borrower_id = $1 ORDER BY start_date DESC',
    [borrowerId]
  );
  return result;
}

export async function updateLoanBalance(id: string, newBalance: number): Promise<void> {
  const database = await initDatabase();
  await database.execute(
    'UPDATE loans SET current_balance = $1 WHERE id = $2',
    [newBalance, id]
  );
}

export async function updateLoanStatus(id: string, status: Loan['status']): Promise<void> {
  const database = await initDatabase();
  await database.execute(
    'UPDATE loans SET status = $1 WHERE id = $2',
    [status, id]
  );
}

export async function deleteLoan(id: string): Promise<void> {
  const database = await initDatabase();
  await database.execute('DELETE FROM loans WHERE id = $1', [id]);
}

// Payment operations
export async function createPayment(payment: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  const database = await initDatabase();
  const newPayment: Payment = {
    id: generateId(),
    created_at: getCurrentTimestamp(),
    ...payment,
  };

  await database.execute(
    'INSERT INTO payments (id, loan_id, amount, payment_type, principal_amount, interest_amount, payment_date, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      newPayment.id,
      newPayment.loan_id,
      newPayment.amount,
      newPayment.payment_type,
      newPayment.principal_amount,
      newPayment.interest_amount,
      newPayment.payment_date,
      newPayment.created_at,
    ]
  );

  return newPayment;
}

export async function getPaymentsByLoan(loanId: string): Promise<Payment[]> {
  const database = await initDatabase();
  const result = await database.select<Payment[]>(
    'SELECT id, loan_id, amount, payment_type, principal_amount, interest_amount, payment_date, created_at FROM payments WHERE loan_id = $1 ORDER BY payment_date DESC',
    [loanId]
  );
  return result;
}

export async function getPayments(): Promise<Payment[]> {
  const database = await initDatabase();
  const result = await database.select<Payment[]>(
    'SELECT id, loan_id, amount, payment_type, principal_amount, interest_amount, payment_date, created_at FROM payments ORDER BY payment_date DESC'
  );
  return result;
}