import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useContact, useContactDeals, useCrmActivityForEntity } from './hooks'
import { DealsPanel } from './components/DealsPanel'
import { ContactForm } from './components/ContactForm'
import { EmptyState, ErrorState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import { formatDate, formatDateTime } from '../../core/dates'
import { CONTACT_TYPE_LABELS } from './types'
import { restoreContact, softDeleteContact, toggleContactFavorite, updateContact, ValidationFailedError } from './service'

const ACTION_LABELS: Record<string, string> = {
  'contact.created': 'تم إنشاء جهة الاتصال',
  'contact.updated': 'تم تحديث جهة الاتصال',
  'contact.deleted': 'تم حذف جهة الاتصال',
  'contact.restored': 'تمت استعادة جهة الاتصال',
  'deal.created': 'تمت إضافة صفقة',
  'deal.updated': 'تم تحديث صفقة',
  'deal.deleted': 'تم حذف صفقة',
  'deal.restored': 'تمت استعادة صفقة',
  'deal.stage_changed': 'تغيّرت مرحلة صفقة',
}

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const contact = useContact(id)
  const deals = useContactDeals(id)
  const activity = useCrmActivityForEntity(id)
  const [editOpen, setEditOpen] = useState(false)
  const pushToast = useToastStore((s) => s.push)

  if (contact === undefined || deals === undefined) {
    return <LoadingState label="جارٍ تحميل جهة الاتصال…" />
  }

  if (!contact || contact.deleted_at) {
    return <ErrorState title="جهة الاتصال غير موجودة" detail="ربما تم حذفها، أو أن الرابط غير صحيح." />
  }

  async function handleUpdate(input: Parameters<typeof updateContact>[1]) {
    if (!contact) return
    try {
      await updateContact(contact.id, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete() {
    if (!contact) return
    await softDeleteContact(contact.id)
    pushToast({
      message: `تم حذف "${contact.name}".`,
      actionLabel: 'تراجع',
      onAction: () => restoreContact(contact.id),
    })
    navigate('/crm')
  }

  return (
    <div className="page">
      <Link to="/crm" className="back-link">
        ← رجوع إلى العملاء
      </Link>

      <header className="detail-header">
        <div>
          <div className="detail-title-row">
            <h1>{contact.name}</h1>
            <button
              type="button"
              className={'star-btn' + (contact.favorite ? ' active' : '')}
              onClick={() => toggleContactFavorite(contact.id, !contact.favorite)}
              aria-pressed={contact.favorite}
            >
              {contact.favorite ? '★' : '☆'}
            </button>
          </div>
          <div className="detail-badges">
            <span className={`badge badge-contact-${contact.type}`}>{CONTACT_TYPE_LABELS[contact.type]}</span>
            {contact.company && <span className="progress-label">{contact.company}</span>}
          </div>
        </div>
        <div className="detail-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)}>
            تعديل
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            حذف
          </button>
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-main">
          <div className="detail-card">
            <h3>معلومات الاتصال</h3>
            <dl className="info-list">
              <div>
                <dt>البريد الإلكتروني</dt>
                <dd>
                  {contact.email ? (
                    <a href={`mailto:${contact.email}`}>{contact.email}</a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>الهاتف</dt>
                <dd>{contact.phone || '—'}</dd>
              </div>
              <div>
                <dt>أُنشئت</dt>
                <dd>{formatDate(contact.created_at)}</dd>
              </div>
              <div>
                <dt>آخر تحديث</dt>
                <dd>{formatDate(contact.updated_at)}</dd>
              </div>
            </dl>
          </div>

          {contact.notes && (
            <div className="detail-card">
              <h3>ملاحظات</h3>
              <p>{contact.notes}</p>
            </div>
          )}

          <div className="detail-card">
            <DealsPanel contactId={contact.id} deals={deals} />
          </div>
        </section>

        <aside className="detail-side">
          <div className="detail-card">
            <h3>النشاط</h3>
            {!activity || activity.length === 0 ? (
              <EmptyState title="لا يوجد نشاط بعد" />
            ) : (
              <ul className="activity-list">
                {activity.slice(0, 20).map((entry) => (
                  <li key={entry.id}>
                    <span>{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    <time>{formatDateTime(entry.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {editOpen && <ContactForm contact={contact} onSubmit={handleUpdate} onClose={() => setEditOpen(false)} />}
    </div>
  )
}
