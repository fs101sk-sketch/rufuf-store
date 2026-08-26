import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useContacts, useAllDeals } from './hooks'
import { ContactCard } from './components/ContactCard'
import { ContactForm } from './components/ContactForm'
import { EmptyState, ErrorState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import { confirmAction } from '../../core/ui/confirmStore'
import { formatCurrency } from './format'
import { CONTACT_TYPE_LABELS, DEFAULT_CONTACT_FILTERS, DEFAULT_CONTACT_SORT } from './types'
import type { ContactFilters, ContactRow, ContactSort, DealRow } from './types'
import {
  computeCrmStats,
  createContact,
  filterAndSortContacts,
  permanentlyDeleteContact,
  restoreContact,
  softDeleteContact,
  toggleContactFavorite,
  ValidationFailedError,
} from './service'

export function ContactsPage() {
  const contacts = useContacts()
  const deals = useAllDeals()
  const [filters, setFilters] = useState<ContactFilters>(DEFAULT_CONTACT_FILTERS)
  const [sort, setSort] = useState<ContactSort>(DEFAULT_CONTACT_SORT)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pushToast = useToastStore((s) => s.push)

  const dealsByContact = useMemo(() => {
    const map = new Map<string, DealRow[]>()
    if (!deals) return map
    for (const d of deals) {
      if (d.deleted_at) continue
      const list = map.get(d.contact_id) ?? []
      list.push(d)
      map.set(d.contact_id, list)
    }
    return map
  }, [deals])

  const stats = useMemo(() => {
    if (!contacts || !deals) return null
    return computeCrmStats(contacts, deals)
  }, [contacts, deals])

  const visible = useMemo(() => {
    if (!contacts) return []
    return filterAndSortContacts(contacts, filters, sort)
  }, [contacts, filters, sort])

  const deletedCount = useMemo(() => (contacts ? contacts.filter((c) => c.deleted_at).length : 0), [contacts])

  if (contacts === undefined || deals === undefined) {
    return <LoadingState label="جارٍ تحميل جهات الاتصال…" />
  }

  async function handleCreate(input: Parameters<typeof createContact>[0]) {
    try {
      await createContact(input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete(contact: ContactRow) {
    setError(null)
    try {
      await softDeleteContact(contact.id)
      pushToast({
        message: `تم حذف "${contact.name}".`,
        actionLabel: 'تراجع',
        onAction: () => restoreContact(contact.id),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف جهة الاتصال.')
    }
  }

  async function handlePermanentDelete(contact: ContactRow) {
    const ok = await confirmAction({
      title: 'حذف نهائي لجهة الاتصال',
      description: `سيتم حذف "${contact.name}" وكل صفقاته نهائيًا ولن تتمكن من التراجع عن هذا الإجراء. هل تريد المتابعة؟`,
      confirmLabel: 'حذف نهائيًا',
      danger: true,
    })
    if (!ok) return
    await permanentlyDeleteContact(contact.id)
    pushToast({ message: `تم حذف "${contact.name}" نهائيًا.` })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>العملاء (CRM)</h1>
          <p className="page-subtitle">جهات الاتصال والصفقات في مكان واحد.</p>
        </div>
        <div className="header-actions">
          <Link to="/crm/pipeline" className="btn btn-ghost">
            لوحة الصفقات
          </Link>
          <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
            + جهة اتصال جديدة
          </button>
        </div>
      </header>

      {error && <ErrorState title="حدث خطأ" detail={error} />}

      {stats && (
        <div className="stats-row">
          <StatCard
            label="عملاء محتملون"
            value={stats.leads}
            active={filters.type === 'lead'}
            onClick={() => setFilters({ ...DEFAULT_CONTACT_FILTERS, type: filters.type === 'lead' ? 'all' : 'lead' })}
          />
          <StatCard
            label="عملاء"
            value={stats.customers}
            active={filters.type === 'customer'}
            onClick={() =>
              setFilters({ ...DEFAULT_CONTACT_FILTERS, type: filters.type === 'customer' ? 'all' : 'customer' })
            }
          />
          <StatCard
            label="المفضّلة"
            value={stats.favorites}
            active={filters.favoriteOnly}
            onClick={() => setFilters({ ...DEFAULT_CONTACT_FILTERS, favoriteOnly: !filters.favoriteOnly })}
          />
          <StatCard label="صفقات مفتوحة" value={stats.openDeals} />
          <StatCard label="قيمة خط الأنابيب" valueLabel={formatCurrency(stats.pipelineValue)} />
          <StatCard label="صفقات مربوحة" valueLabel={`${stats.wonDeals} · ${formatCurrency(stats.wonValue)}`} />
        </div>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="ابحث بالاسم أو الشركة أو البريد أو الهاتف…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value as ContactFilters['type'] })}
        >
          <option value="all">كل الأنواع</option>
          {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={`${sort.field}:${sort.direction}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split(':') as [ContactSort['field'], ContactSort['direction']]
            setSort({ field, direction })
          }}
        >
          <option value="updated_at:desc">آخر تحديث</option>
          <option value="created_at:desc">الأحدث إنشاءً</option>
          <option value="name:asc">الاسم (أ-ي)</option>
        </select>
        {(filters.type !== 'all' || filters.favoriteOnly || filters.search) && (
          <button type="button" className="btn btn-ghost" onClick={() => setFilters(DEFAULT_CONTACT_FILTERS)}>
            مسح الفلاتر
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={contacts.length === 0 ? 'لا توجد جهات اتصال بعد' : 'لا توجد نتائج مطابقة'}
          description={
            contacts.length === 0 ? 'ابدأ بإضافة أول جهة اتصال لك.' : 'جرّب تعديل البحث أو الفلاتر.'
          }
          action={
            contacts.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
                + جهة اتصال جديدة
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="project-grid">
          {visible.map((contact) => {
            const contactDeals = dealsByContact.get(contact.id) ?? []
            const open = contactDeals.filter((d) => d.stage !== 'won' && d.stage !== 'lost')
            return (
              <ContactCard
                key={contact.id}
                contact={contact}
                dealsCount={open.length}
                pipelineValue={open.reduce((sum, d) => sum + d.value, 0)}
                onToggleFavorite={() => toggleContactFavorite(contact.id, !contact.favorite)}
                onDelete={() => handleDelete(contact)}
              />
            )
          })}
        </div>
      )}

      {deletedCount > 0 && (
        <details className="trash-panel">
          <summary>المحذوفة مؤخرًا ({deletedCount})</summary>
          <ul>
            {contacts
              .filter((c) => c.deleted_at)
              .map((c) => (
                <li key={c.id}>
                  <span>{c.name}</span>
                  <div className="trash-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => restoreContact(c.id)}>
                      استعادة
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handlePermanentDelete(c)}>
                      حذف نهائي
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      )}

      {formOpen && <ContactForm onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function StatCard({
  label,
  value,
  valueLabel,
  active,
  onClick,
}: {
  label: string
  value?: number
  valueLabel?: string
  active?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="stat-value">{valueLabel ?? value}</span>
      <span className="stat-label">{label}</span>
    </>
  )
  if (!onClick) {
    return <div className="stat-card">{content}</div>
  }
  return (
    <button type="button" className={'stat-card stat-card-clickable' + (active ? ' active' : '')} onClick={onClick}>
      {content}
    </button>
  )
}
