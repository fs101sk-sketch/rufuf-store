import { useMemo, useState } from 'react'
import { useTransactions } from './hooks'
import { TransactionForm } from './components/TransactionForm'
import { TransactionItem } from './components/TransactionItem'
import { EmptyState, ErrorState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import { confirmAction } from '../../core/ui/confirmStore'
import { formatCurrency } from '../../core/format'
import { DEFAULT_TRANSACTION_FILTERS, DEFAULT_TRANSACTION_SORT, TRANSACTION_TYPE_LABELS } from './types'
import type { TransactionFilters, TransactionRow, TransactionSort } from './types'
import {
  computeFinanceStats,
  computeMonthlyBreakdown,
  createTransaction,
  filterAndSortTransactions,
  permanentlyDeleteTransaction,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction,
  ValidationFailedError,
} from './service'

const MONTH_FORMATTER = new Intl.DateTimeFormat('ar', { month: 'long', year: 'numeric' })

function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return MONTH_FORMATTER.format(new Date(year!, (month ?? 1) - 1, 1))
}

export function FinancePage() {
  const transactions = useTransactions()
  const [filters, setFilters] = useState<TransactionFilters>(DEFAULT_TRANSACTION_FILTERS)
  const [sort, setSort] = useState<TransactionSort>(DEFAULT_TRANSACTION_SORT)
  const [formOpen, setFormOpen] = useState(false)
  const [editingTx, setEditingTx] = useState<TransactionRow | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const pushToast = useToastStore((s) => s.push)

  const stats = useMemo(() => (transactions ? computeFinanceStats(transactions) : null), [transactions])
  const monthly = useMemo(() => (transactions ? computeMonthlyBreakdown(transactions) : []), [transactions])
  const maxMonthlyAbs = useMemo(
    () => Math.max(1, ...monthly.map((m) => Math.max(m.income, m.expense))),
    [monthly],
  )

  const visible = useMemo(() => {
    if (!transactions) return []
    return filterAndSortTransactions(transactions, filters, sort)
  }, [transactions, filters, sort])

  const deletedCount = useMemo(
    () => (transactions ? transactions.filter((t) => t.deleted_at).length : 0),
    [transactions],
  )

  if (transactions === undefined) {
    return <LoadingState label="جارٍ تحميل الحركات المالية…" />
  }

  async function handleCreate(input: Parameters<typeof createTransaction>[0]) {
    try {
      await createTransaction(input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleUpdate(input: Parameters<typeof updateTransaction>[1]) {
    if (!editingTx) return
    try {
      await updateTransaction(editingTx.id, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete(tx: TransactionRow) {
    setError(null)
    try {
      await softDeleteTransaction(tx.id)
      pushToast({
        message: `تم حذف الحركة "${tx.category}".`,
        actionLabel: 'تراجع',
        onAction: () => restoreTransaction(tx.id),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الحركة المالية.')
    }
  }

  async function handlePermanentDelete(tx: TransactionRow) {
    const ok = await confirmAction({
      title: 'حذف نهائي للحركة المالية',
      description: `سيتم حذف "${tx.category}" (${formatCurrency(tx.amount)}) نهائيًا ولن تتمكن من التراجع عن هذا الإجراء. هل تريد المتابعة؟`,
      confirmLabel: 'حذف نهائيًا',
      danger: true,
    })
    if (!ok) return
    await permanentlyDeleteTransaction(tx.id)
    pushToast({ message: `تم حذف "${tx.category}" نهائيًا.` })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>المالية</h1>
          <p className="page-subtitle">الإيرادات والمصروفات في مكان واحد.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
          + حركة مالية جديدة
        </button>
      </header>

      {error && <ErrorState title="حدث خطأ" detail={error} />}

      {stats && (
        <div className="stats-row">
          <StatCard label="إجمالي الإيرادات" valueLabel={formatCurrency(stats.totalIncome)} />
          <StatCard label="إجمالي المصروفات" valueLabel={formatCurrency(stats.totalExpense)} />
          <StatCard
            label="الرصيد الصافي"
            valueLabel={formatCurrency(stats.balance)}
            negative={stats.balance < 0}
          />
          <StatCard label="عدد الحركات" value={stats.transactionCount} />
        </div>
      )}

      <div className="detail-card">
        <h3>آخر 6 أشهر</h3>
        <div className="monthly-breakdown">
          {monthly.map((m) => (
            <div key={m.month} className="monthly-row">
              <span className="monthly-label">{formatMonth(m.month)}</span>
              <div className="monthly-bars">
                <div
                  className="monthly-bar monthly-bar-income"
                  style={{ width: `${(m.income / maxMonthlyAbs) * 100}%` }}
                  title={`إيرادات: ${formatCurrency(m.income)}`}
                />
                <div
                  className="monthly-bar monthly-bar-expense"
                  style={{ width: `${(m.expense / maxMonthlyAbs) * 100}%` }}
                  title={`مصروفات: ${formatCurrency(m.expense)}`}
                />
              </div>
              <span className={'monthly-net' + (m.net < 0 ? ' negative' : '')}>{formatCurrency(m.net)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="ابحث بالفئة أو الوصف…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value as TransactionFilters['type'] })}
        >
          <option value="all">الكل</option>
          {Object.entries(TRANSACTION_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={`${sort.field}:${sort.direction}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split(':') as [
              TransactionSort['field'],
              TransactionSort['direction'],
            ]
            setSort({ field, direction })
          }}
        >
          <option value="date:desc">الأحدث تاريخًا</option>
          <option value="amount:desc">الأعلى مبلغًا</option>
          <option value="created_at:desc">الأحدث إضافةً</option>
        </select>
        {(filters.type !== 'all' || filters.search) && (
          <button type="button" className="btn btn-ghost" onClick={() => setFilters(DEFAULT_TRANSACTION_FILTERS)}>
            مسح الفلاتر
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={transactions.length === 0 ? 'لا توجد حركات مالية بعد' : 'لا توجد نتائج مطابقة'}
          description={
            transactions.length === 0 ? 'ابدأ بإضافة أول حركة مالية.' : 'جرّب تعديل البحث أو الفلاتر.'
          }
          action={
            transactions.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
                + حركة مالية جديدة
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="task-list">
          {visible.map((tx) => (
            <TransactionItem
              key={tx.id}
              transaction={tx}
              onEdit={() => setEditingTx(tx)}
              onDelete={() => handleDelete(tx)}
            />
          ))}
        </ul>
      )}

      {deletedCount > 0 && (
        <details className="trash-panel">
          <summary>المحذوفة مؤخرًا ({deletedCount})</summary>
          <ul>
            {transactions
              .filter((t) => t.deleted_at)
              .map((t) => (
                <li key={t.id}>
                  <span>
                    {t.category} · {formatCurrency(t.amount)}
                  </span>
                  <div className="trash-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => restoreTransaction(t.id)}>
                      استعادة
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handlePermanentDelete(t)}>
                      حذف نهائي
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      )}

      {formOpen && <TransactionForm onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
      {editingTx && (
        <TransactionForm transaction={editingTx} onSubmit={handleUpdate} onClose={() => setEditingTx(undefined)} />
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  valueLabel,
  negative,
}: {
  label: string
  value?: number
  valueLabel?: string
  negative?: boolean
}) {
  return (
    <div className="stat-card">
      <span className={'stat-value' + (negative ? ' negative' : '')}>{valueLabel ?? value}</span>
      <span className="stat-label">{label}</span>
    </div>
  )
}
