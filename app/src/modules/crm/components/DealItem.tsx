import { formatDate } from '../../../core/dates'
import { formatCurrency } from '../format'
import { DEAL_STAGE_LABELS } from '../types'
import type { DealRow } from '../types'

export function DealItem({
  deal,
  onEdit,
  onDelete,
}: {
  deal: DealRow
  onEdit: () => void
  onDelete: () => void
}) {
  const closed = deal.stage === 'won' || deal.stage === 'lost'
  return (
    <li className={'task-item' + (closed ? ' completed' : '')}>
      <span className="task-checkbox">
        <span className="task-title">{deal.title}</span>
      </span>
      <div className="task-meta">
        <span className={`badge badge-stage-${deal.stage}`}>{DEAL_STAGE_LABELS[deal.stage]}</span>
        <span className="progress-label">{formatCurrency(deal.value)}</span>
        {deal.expected_close_date && (
          <span className="deadline-label">{formatDate(deal.expected_close_date)}</span>
        )}
        <button type="button" className="icon-btn" onClick={onEdit} title="تعديل الصفقة">
          ✎
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف الصفقة">
          🗑
        </button>
      </div>
    </li>
  )
}
