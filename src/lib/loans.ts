import type { Loan, LoanCategory } from '@/types/database'

export const LOAN_TYPE_LABELS: Record<Loan['loan_type'], string> = {
  installment: 'Installment',
  bullet: 'Bullet',
}

export const LOAN_CATEGORY_LABELS: Record<LoanCategory, string> = {
  traditional_loan: 'Traditional Loans',
  fixed_income: 'Fixed Income',
}

export function getLoanTypeLabel(loanType: Loan['loan_type']): string {
  return LOAN_TYPE_LABELS[loanType] || loanType.replace('_', ' ')
}

export function getLoanCategory(loanType: Loan['loan_type']): LoanCategory {
  const categories: Record<Loan['loan_type'], LoanCategory> = {
    installment: 'traditional_loan',
    bullet: 'traditional_loan',
  }
  return categories[loanType]
}

export function getLoanTypesByCategory() {
  const traditional: Loan['loan_type'][] = []
  const fixedIncome: Loan['loan_type'][] = []

  ;(Object.keys(LOAN_TYPE_LABELS) as Loan['loan_type'][]).forEach((type) => {
    if (getLoanCategory(type) === 'traditional_loan') {
      traditional.push(type)
    } else {
      fixedIncome.push(type)
    }
  })

  return {
    traditional_loan: traditional,
    fixed_income: fixedIncome,
  }
}

export function isFixedIncomeType(_loanType: Loan['loan_type']): boolean {
  return false
}

export function isTraditionalLoanType(loanType: Loan['loan_type']): boolean {
  return getLoanCategory(loanType) === 'traditional_loan'
}
