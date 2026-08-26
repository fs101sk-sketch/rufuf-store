import type { TransactionRow, TransactionType } from '../../core/db/schema'

export type { TransactionRow, TransactionType }

export interface TransactionInput {
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  project_id: string | null
  contact_id: string | null
}

export interface TransactionFilters {
  search: string
  type: TransactionType | 'all'
  includeDeleted: boolean
}

export type TransactionSortField = 'date' | 'amount' | 'created_at'
export type SortDirection = 'asc' | 'desc'

export interface TransactionSort {
  field: TransactionSortField
  direction: SortDirection
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilters = {
  search: '',
  type: 'all',
  includeDeleted: false,
}

export const DEFAULT_TRANSACTION_SORT: TransactionSort = { field: 'date', direction: 'desc' }

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'إيراد',
  expense: 'مصروف',
}

export const DEFAULT_INCOME_CATEGORIES = ['مبيعات', 'استشارات', 'أخرى']
export const DEFAULT_EXPENSE_CATEGORIES = ['تشغيلية', 'رواتب', 'تسويق', 'أخرى']
