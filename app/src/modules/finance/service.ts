import { createId } from '../../core/ids'
import { nowIso } from '../../core/dates'
import { logActivity } from '../../core/activity/activityService'
import type { TransactionRow } from '../../core/db/schema'
import { transactionsRepository } from './repository'
import { validateTransactionInput } from './validation'
import type { TransactionFilters, TransactionInput, TransactionSort } from './types'

export class ValidationFailedError extends Error {
  errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationFailedError'
    this.errors = errors
  }
}

export async function createTransaction(input: TransactionInput): Promise<TransactionRow> {
  const result = validateTransactionInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: TransactionRow = {
    id: createId(),
    type: input.type,
    amount: input.amount,
    category: input.category.trim(),
    description: input.description.trim(),
    date: input.date,
    project_id: input.project_id,
    contact_id: input.contact_id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await transactionsRepository.create(row)
  await logActivity('transaction.created', 'transaction', row.id, { type: row.type, amount: row.amount })
  return row
}

export async function updateTransaction(id: string, input: TransactionInput): Promise<void> {
  const result = validateTransactionInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  await transactionsRepository.update(id, {
    type: input.type,
    amount: input.amount,
    category: input.category.trim(),
    description: input.description.trim(),
    date: input.date,
    project_id: input.project_id,
    contact_id: input.contact_id,
    updated_at: nowIso(),
  })
  await logActivity('transaction.updated', 'transaction', id)
}

export async function softDeleteTransaction(id: string): Promise<void> {
  await transactionsRepository.update(id, { deleted_at: nowIso() })
  await logActivity('transaction.deleted', 'transaction', id)
}

export async function restoreTransaction(id: string): Promise<void> {
  await transactionsRepository.update(id, { deleted_at: null })
  await logActivity('transaction.restored', 'transaction', id)
}

export async function permanentlyDeleteTransaction(id: string): Promise<void> {
  await transactionsRepository.remove(id)
  await logActivity('transaction.deleted', 'transaction', id, { permanent: true })
}

export function filterAndSortTransactions(
  transactions: TransactionRow[],
  filters: TransactionFilters,
  sort: TransactionSort,
): TransactionRow[] {
  let result = transactions.filter((t) => (filters.includeDeleted ? true : !t.deleted_at))

  if (filters.type !== 'all') {
    result = result.filter((t) => t.type === filters.type)
  }
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter(
      (t) => t.category.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    )
  }

  const dir = sort.direction === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => {
    switch (sort.field) {
      case 'amount':
        return dir * (a.amount - b.amount)
      case 'created_at':
        return dir * a.created_at.localeCompare(b.created_at)
      case 'date':
      default:
        return dir * a.date.localeCompare(b.date)
    }
  })

  return result
}

export interface FinanceStats {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
}

export function computeFinanceStats(transactions: TransactionRow[]): FinanceStats {
  const live = transactions.filter((t) => !t.deleted_at)
  const totalIncome = live.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = live.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: live.length,
  }
}

export interface MonthlyBreakdownEntry {
  month: string
  income: number
  expense: number
  net: number
}

/** Real computed totals per calendar month (most recent `months` months, ending this month). */
export function computeMonthlyBreakdown(transactions: TransactionRow[], months = 6): MonthlyBreakdownEntry[] {
  const live = transactions.filter((t) => !t.deleted_at)
  const now = new Date()
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const totals = new Map<string, { income: number; expense: number }>()
  for (const key of keys) totals.set(key, { income: 0, expense: 0 })

  for (const t of live) {
    const key = t.date.slice(0, 7)
    const entry = totals.get(key)
    if (!entry) continue
    if (t.type === 'income') entry.income += t.amount
    else entry.expense += t.amount
  }

  return keys.map((key) => {
    const entry = totals.get(key)!
    return { month: key, income: entry.income, expense: entry.expense, net: entry.income - entry.expense }
  })
}
