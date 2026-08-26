import { Link } from 'react-router-dom'
import { formatDate } from '../../../core/dates'
import { formatCurrency } from '../format'
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER } from '../types'
import type { DealRow, DealStage } from '../types'

export function DealPipelineCard({
  deal,
  contactName,
  onStageChange,
}: {
  deal: DealRow
  contactName: string
  onStageChange: (stage: DealStage) => void
}) {
  return (
    <div className="pipeline-card">
      <div className="pipeline-card-title">{deal.title}</div>
      <Link to={`/crm/contacts/${deal.contact_id}`} className="pipeline-card-contact">
        {contactName}
      </Link>
      <div className="pipeline-card-value">{formatCurrency(deal.value)}</div>
      {deal.expected_close_date && (
        <div className="deadline-label">إغلاق متوقع: {formatDate(deal.expected_close_date)}</div>
      )}
      <select
        className="pipeline-card-stage-select"
        value={deal.stage}
        onChange={(e) => onStageChange(e.target.value as DealStage)}
        aria-label={`مرحلة الصفقة: ${deal.title}`}
      >
        {DEAL_STAGE_ORDER.map((stage) => (
          <option key={stage} value={stage}>
            {DEAL_STAGE_LABELS[stage]}
          </option>
        ))}
      </select>
    </div>
  )
}
