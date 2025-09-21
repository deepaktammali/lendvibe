import { Database } from "bun:sqlite"
import { join } from "path"
import { homedir } from "os"

const borrowersData = [
  {
    name: 'Naruto Uzumaki'
  },
  {
    name: 'Sakura Haruno'
  },
  {
    name: 'Sasuke Uchiha'
  },
  {
    name: 'Kakashi Hatake'
  },
  {
    name: 'Hinata Hyuga'
  },
  {
    name: 'Shikamaru Nara'
  },
  {
    name: 'Gaara'
  },
  {
    name: 'Tsunade Senju'
  }
]

function generateId(): string {
  return crypto.randomUUID()
}

function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

function createTestData() {
  try {
    console.log('🚀 Starting database population...')

    // Connect to the SQLite database
    const dbPath = join(homedir(), 'Library', 'Application Support', 'com.deepaktammali.lendvibe', 'lending.db')
    const db = new Database(dbPath)
    console.log('✅ Database connected:', dbPath)

    // Create borrowers first
    console.log('👥 Creating borrowers...')
    const createdBorrowers = []

    const insertBorrower = db.prepare('INSERT INTO borrowers (id, name, email, phone, address, created_at) VALUES (?, ?, ?, ?, ?, ?)')

    for (const borrowerData of borrowersData) {
      const borrower = {
        id: generateId(),
        ...borrowerData,
        email: null,
        phone: null,
        address: null,
        created_at: getCurrentTimestamp()
      }

      insertBorrower.run(borrower.id, borrower.name, borrower.email, borrower.phone, borrower.address, borrower.created_at)
      createdBorrowers.push(borrower)
      console.log(`   ✓ Created borrower: ${borrower.name}`)
    }

    console.log(`✅ Created ${createdBorrowers.length} borrowers`)

    // Create loans with various intervals and types
    console.log('💰 Creating loans...')
    const loansData = [
      {
        borrower_id: createdBorrowers[0].id,
        loan_type: 'installment' as const,
        principal_amount: 500000,
        interest_rate: 12,
        start_date: '2024-01-15',
        status: 'active' as const,
        current_balance: 450000,
        repayment_interval_unit: 'months' as const,
        repayment_interval_value: 1,
        notes: 'Home renovation loan'
      },
      {
        borrower_id: createdBorrowers[1].id,
        loan_type: 'bullet' as const,
        principal_amount: 1000000,
        interest_rate: 10,
        start_date: '2024-02-01',
        end_date: '2025-02-01',
        status: 'active' as const,
        current_balance: 1000000,
        repayment_interval_unit: 'months' as const,
        repayment_interval_value: 1,
        notes: 'Business expansion loan'
      },
      {
        borrower_id: createdBorrowers[2].id,
        loan_type: 'installment' as const,
        principal_amount: 250000,
        interest_rate: 15,
        start_date: '2024-03-01',
        status: 'active' as const,
        current_balance: 200000,
        repayment_interval_unit: 'months' as const,
        repayment_interval_value: 1,
        notes: 'Personal loan'
      },
      {
        borrower_id: createdBorrowers[3].id,
        loan_type: 'installment' as const,
        principal_amount: 750000,
        interest_rate: 8,
        start_date: '2024-01-01',
        status: 'active' as const,
        current_balance: 600000,
        repayment_interval_unit: 'months' as const,
        repayment_interval_value: 3,
        notes: 'Quarterly payment loan'
      },
      {
        borrower_id: createdBorrowers[4].id,
        loan_type: 'bullet' as const,
        principal_amount: 2000000,
        interest_rate: 9,
        start_date: '2024-06-01',
        end_date: '2025-06-01',
        status: 'active' as const,
        current_balance: 2000000,
        repayment_interval_unit: 'years' as const,
        repayment_interval_value: 1,
        notes: 'Annual payment loan'
      },
      {
        borrower_id: createdBorrowers[5].id,
        loan_type: 'installment' as const,
        principal_amount: 150000,
        interest_rate: 18,
        start_date: '2024-05-15',
        status: 'active' as const,
        current_balance: 120000,
        repayment_interval_unit: 'weeks' as const,
        repayment_interval_value: 2,
        notes: 'Bi-weekly payment loan'
      },
      {
        borrower_id: createdBorrowers[6].id,
        loan_type: 'installment' as const,
        principal_amount: 300000,
        interest_rate: 14,
        start_date: '2024-04-01',
        status: 'active' as const,
        current_balance: 250000,
        repayment_interval_unit: 'months' as const,
        repayment_interval_value: 1,
        notes: 'Vehicle loan'
      },
      {
        borrower_id: createdBorrowers[7].id,
        loan_type: 'bullet' as const,
        principal_amount: 800000,
        interest_rate: 11,
        start_date: '2024-07-01',
        end_date: '2025-07-01',
        status: 'active' as const,
        current_balance: 800000,
        repayment_interval_unit: 'months' as const,
        repayment_interval_value: 6,
        notes: 'Semi-annual payment loan'
      }
    ]

    const insertLoan = db.prepare('INSERT INTO loans (id, borrower_id, principal_amount, interest_rate, start_date, end_date, status, current_balance, created_at, loan_type, repayment_interval_unit, repayment_interval_value, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

    const createdLoans = []
    for (const loanData of loansData) {
      const loan = {
        id: generateId(),
        ...loanData,
        created_at: getCurrentTimestamp()
      }

      insertLoan.run(
        loan.id,
        loan.borrower_id,
        loan.principal_amount,
        loan.interest_rate,
        loan.start_date,
        loan.end_date || null,
        loan.status,
        loan.current_balance,
        loan.created_at,
        loan.loan_type,
        loan.repayment_interval_unit,
        loan.repayment_interval_value,
        loan.notes
      )

      createdLoans.push(loan)
      const borrower = createdBorrowers.find(b => b.id === loan.borrower_id)
      console.log(`   ✓ Created ${loan.loan_type} loan for ${borrower?.name}: ₹${loan.principal_amount.toLocaleString()} at ${loan.interest_rate}%`)
    }

    console.log(`✅ Created ${createdLoans.length} loans`)

    // Create fixed income assets
    console.log('🏠 Creating fixed income assets...')
    const fixedIncomeData = [
      {
        tenant_id: createdBorrowers[0].id,
        income_type: 'land_lease' as const,
        principal_amount: 5000000,
        income_rate: 6,
        payment_interval_unit: 'months' as const,
        payment_interval_value: 1,
        start_date: '2024-01-01',
        status: 'active' as const
      },
      {
        tenant_id: createdBorrowers[1].id,
        income_type: 'rent_agreement' as const,
        principal_amount: 3000000,
        income_rate: 8,
        payment_interval_unit: 'months' as const,
        payment_interval_value: 1,
        start_date: '2024-02-01',
        status: 'active' as const
      },
      {
        tenant_id: createdBorrowers[2].id,
        income_type: 'fixed_deposit_income' as const,
        principal_amount: 1000000,
        income_rate: 7,
        payment_interval_unit: 'months' as const,
        payment_interval_value: 3,
        start_date: '2024-03-01',
        status: 'active' as const
      },
      {
        tenant_id: createdBorrowers[3].id,
        income_type: 'land_lease' as const,
        principal_amount: 8000000,
        income_rate: 5,
        payment_interval_unit: 'years' as const,
        payment_interval_value: 1,
        start_date: '2024-01-01',
        status: 'active' as const
      },
      {
        tenant_id: createdBorrowers[4].id,
        income_type: 'rent_agreement' as const,
        principal_amount: 2500000,
        income_rate: 9,
        payment_interval_unit: 'months' as const,
        payment_interval_value: 1,
        start_date: '2024-04-01',
        status: 'active' as const
      }
    ]

    const insertFixedIncome = db.prepare('INSERT INTO fixed_income (id, tenant_id, income_type, principal_amount, income_rate, payment_interval_unit, payment_interval_value, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')

    const createdFixedIncomes = []
    for (const data of fixedIncomeData) {
      const fixedIncome = {
        id: generateId(),
        ...data,
        created_at: getCurrentTimestamp()
      }

      insertFixedIncome.run(
        fixedIncome.id,
        fixedIncome.tenant_id,
        fixedIncome.income_type,
        fixedIncome.principal_amount,
        fixedIncome.income_rate,
        fixedIncome.payment_interval_unit,
        fixedIncome.payment_interval_value,
        fixedIncome.start_date,
        (fixedIncome as any).end_date || null,
        fixedIncome.status,
        fixedIncome.created_at
      )

      createdFixedIncomes.push(fixedIncome)
      const tenant = createdBorrowers.find(b => b.id === fixedIncome.tenant_id)
      console.log(`   ✓ Created ${fixedIncome.income_type} for ${tenant?.name}: ₹${fixedIncome.principal_amount.toLocaleString()} at ${fixedIncome.income_rate}%`)
    }

    console.log(`✅ Created ${createdFixedIncomes.length} fixed income assets`)

    console.log('\n🎉 Test data population completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`   • ${createdBorrowers.length} borrowers`)
    console.log(`   • ${createdLoans.length} loans`)
    console.log(`   • ${createdFixedIncomes.length} fixed income assets`)

    console.log('\n💡 You can now test the filtering and sorting features with this data!')
    console.log('   • Different repayment intervals: monthly, quarterly, bi-weekly, semi-annual, annual')
    console.log('   • Different loan types: installment and bullet loans')
    console.log('   • Various income types: land lease, rent agreements, fixed deposits')
    console.log('   • Multiple borrowers with different amounts and rates')

    // Close database connection
    db.close()

  } catch (error) {
    console.error('❌ Error creating test data:', error)
    process.exit(1)
  }
}

// Run the script
createTestData()