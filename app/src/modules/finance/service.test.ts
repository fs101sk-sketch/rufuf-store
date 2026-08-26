import { describe, expect, it } from 'vitest'
import type { TransactionRow } from '../../core/db/schema'
import { computeFinanceStats, computeMonthlyBreakdown, filterAndSortTransactions } from './service'
import { validateTransactionInput } from './validation'
import { DEFAULT_TRANSACTION_FILTERS, DEFAULT_TRANSACTION_SORT } from './types'

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    type: 'income',
    amount: 1000,
    category: 'مبيعات',
    description: '',
    date: now,
    project_id: null,
    contact_id: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

describe('validateTransactionInput', () => {
  it('rejects a zero or negative amount', () => {
    const result = validateTransactionInput({
      type: 'income',
      amount: 0,
      category: 'مبيعات',
      description: '',
      date: new Date().toISOString(),
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.amount).toBeDefined()
  })

  it('rejects an empty category', () => {
    const result = validateTransactionInput({
      type: 'expense',
      amount: 500,
      category: '  ',
      description: '',
      date: new Date().toISOString(),
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.category).toBeDefined()
  })

  it('rejects a missing date', () => {
    const result = validateTransactionInput({
      type: 'expense',
      amount: 500,
      category: 'تشغيلية',
      description: '',
      date: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.date).toBeDefined()
  })

  it('accepts a valid transaction', () => {
    const result = validateTransactionInput({
      type: 'income',
      amount: 2500,
      category: 'استشارات',
      description: '',
      date: new Date().toISOString(),
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

describe('filterAndSortTransactions', () => {
  const income = makeTransaction({ type: 'income', amount: 5000, category: 'مبيعات' })
  const expense = makeTransaction({ type: 'expense', amount: 1200, category: 'تسويق' })
  const deleted = makeTransaction({ deleted_at: new Date().toISOString() })
  const all = [income, expense, deleted]

  it('excludes soft-deleted transactions by default', () => {
    const result = filterAndSortTransactions(all, DEFAULT_TRANSACTION_FILTERS, DEFAULT_TRANSACTION_SORT)
    expect(result.some((t) => t.id === deleted.id)).toBe(false)
  })

  it('filters by type', () => {
    const result = filterAndSortTransactions(all, { ...DEFAULT_TRANSACTION_FILTERS, type: 'expense' }, DEFAULT_TRANSACTION_SORT)
    expect(result.map((t) => t.id)).toEqual([expense.id])
  })

  it('sorts by amount descending', () => {
    const result = filterAndSortTransactions(all, DEFAULT_TRANSACTION_FILTERS, { field: 'amount', direction: 'desc' })
    expect(result.map((t) => t.id)).toEqual([income.id, expense.id])
  })

  it('searches by category', () => {
    const result = filterAndSortTransactions(all, { ...DEFAULT_TRANSACTION_FILTERS, search: 'تسويق' }, DEFAULT_TRANSACTION_SORT)
    expect(result.map((t) => t.id)).toEqual([expense.id])
  })
})

describe('computeFinanceStats', () => {
  it('computes real totals, not hardcoded numbers', () => {
    const transactions = [
      makeTransaction({ type: 'income', amount: 5000 }),
      makeTransaction({ type: 'income', amount: 3000 }),
      makeTransaction({ type: 'expense', amount: 2000 }),
      makeTransaction({ type: 'expense', amount: 1000, deleted_at: new Date().toISOString() }),
    ]
    const stats = computeFinanceStats(transactions)
    expect(stats.totalIncome).toBe(8000)
    expect(stats.totalExpense).toBe(2000)
    expect(stats.balance).toBe(6000)
    expect(stats.transactionCount).toBe(3)
  })
})

describe('computeMonthlyBreakdown', () => {
  it('buckets real transactions into their calendar month and ignores deleted ones', () => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).toISOString()
    const transactions = [
      makeTransaction({ type: 'income', amount: 1000, date: thisMonth }),
      makeTransaction({ type: 'expense', amount: 400, date: thisMonth }),
      makeTransaction({ type: 'income', amount: 999, date: thisMonth, deleted_at: now.toISOString() }),
    ]
    const breakdown = computeMonthlyBreakdown(transactions, 3)
    expect(breakdown).toHaveLength(3)
    const current = breakdown[breakdown.length - 1]!
    expect(current.income).toBe(1000)
    expect(current.expense).toBe(400)
    expect(current.net).toBe(600)
  })

  it('returns zeroed entries for months with no data', () => {
    const breakdown = computeMonthlyBreakdown([], 6)
    expect(breakdown).toHaveLength(6)
    expect(breakdown.every((m) => m.income === 0 && m.expense === 0)).toBe(true)
  })
})
