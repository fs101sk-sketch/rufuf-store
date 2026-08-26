import { Link } from 'react-router-dom'
import { formatCurrency } from '../format'
import { CONTACT_TYPE_LABELS } from '../types'
import type { ContactRow } from '../types'

export function ContactCard({
  contact,
  dealsCount,
  pipelineValue,
  onToggleFavorite,
  onDelete,
}: {
  contact: ContactRow
  dealsCount: number
  pipelineValue: number
  onToggleFavorite: () => void
  onDelete: () => void
}) {
  return (
    <div className="project-card">
      <div className="project-card-top">
        <button
          type="button"
          className={'star-btn' + (contact.favorite ? ' active' : '')}
          onClick={onToggleFavorite}
          aria-pressed={contact.favorite}
          aria-label={contact.favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        >
          {contact.favorite ? '★' : '☆'}
        </button>
        <span className={`badge badge-contact-${contact.type}`}>{CONTACT_TYPE_LABELS[contact.type]}</span>
      </div>

      <Link to={`/crm/contacts/${contact.id}`} className="project-card-title">
        {contact.name}
      </Link>
      {contact.company && <div className="project-card-type">{contact.company}</div>}
      {(contact.email || contact.phone) && (
        <p className="project-card-desc">
          {[contact.email, contact.phone].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="project-card-footer">
        <span className="progress-label">
          {dealsCount === 0 ? 'لا صفقات بعد' : `${dealsCount} صفقة نشطة · ${formatCurrency(pipelineValue)}`}
        </span>
        <div className="project-card-actions">
          <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف جهة الاتصال">
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
