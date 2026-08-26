import { format, parseISO } from 'date-fns'
import { formatDate } from '../../../core/dates'
import type { EventRow } from '../types'

export function EventItem({
  event,
  showDate,
  onEdit,
  onDelete,
}: {
  event: EventRow
  showDate?: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="task-item">
      <span className="task-checkbox">
        <span className="task-title">{event.title}</span>
        <span className="progress-label">
          {showDate && `${formatDate(event.start_at)} · `}
          {event.all_day ? 'طوال اليوم' : format(parseISO(event.start_at), 'HH:mm')}
          {event.location && ` · ${event.location}`}
        </span>
      </span>
      <div className="task-meta">
        <button type="button" className="icon-btn" onClick={onEdit} title="تعديل الحدث">
          ✎
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف الحدث">
          🗑
        </button>
      </div>
    </li>
  )
}
