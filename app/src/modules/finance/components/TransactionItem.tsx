import { formatDate } from '../../../core/dates'
import { formatCurrency } from '../../../core/format'
import { TRANSACTION_TYPE_LABELS } from '../types'
import type { TransactionRow } from '../types'

export function TransactionItem({
  transaction,
  onEdit,
  onDelete,
}: {
  transaction: TransactionRow
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="task-item">
      <span className="task-checkbox">
        <span className={`badge badge-tx-${transaction.type}`}>{TRANSACTION_TYPE_LABELS[transaction.type]}</span>
        <span className="task-title">{transaction.category}</span>
        {transaction.description && <span className="progress-label">{transaction.description}</span>}
      </span>
      <div className="task-meta">
        <span className={transaction.type === 'income' ? 'amount-positive' : 'amount-negative'}>
          {transaction.type === 'income' ? '+' : '-'}
          {formatCurrency(transaction.amount)}
        </span>
        <span className="deadline-label">{formatDate(transaction.date)}</span>
        <button type="button" className="icon-btn" onClick={onEdit} title="تعديل الحركة">
          ✎
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف الحركة">
          🗑
        </button>
      </div>
    </li>
  )
}
