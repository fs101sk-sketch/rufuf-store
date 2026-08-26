import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProjects, useAllTasks } from '../projects/hooks'
import { useContacts, useAllDeals } from '../crm/hooks'
import { useTransactions } from '../finance/hooks'
import { useEvents } from '../calendar/hooks'
import { buildSearchIndex, searchAll, SEARCH_TYPE_LABELS } from '../../core/search/searchService'

export function GlobalSearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const projects = useProjects()
  const tasks = useAllTasks()
  const contacts = useContacts()
  const deals = useAllDeals()
  const transactions = useTransactions()
  const events = useEvents()

  const index = useMemo(
    () =>
      buildSearchIndex({
        projects: projects ?? [],
        tasks: tasks ?? [],
        contacts: contacts ?? [],
        deals: deals ?? [],
        transactions: transactions ?? [],
        events: events ?? [],
      }),
    [projects, tasks, contacts, deals, transactions, events],
  )

  const results = useMemo(() => searchAll(index, query), [index, query])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  function goTo(path: string) {
    navigate(path)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="search-palette" role="dialog" aria-modal="true" aria-label="البحث الشامل" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-palette-input"
          placeholder="ابحث في المشاريع، المهام، العملاء، الصفقات، الحركات المالية، الأحداث…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="search-palette-results">
          {query.trim() === '' ? (
            <p className="search-palette-hint">اكتب للبحث في كل بياناتك. Esc للإغلاق.</p>
          ) : results.length === 0 ? (
            <p className="search-palette-hint">لا نتائج مطابقة لـ "{query}".</p>
          ) : (
            <ul className="search-palette-list">
              {results.map((r) => (
                <li key={`${r.type}-${r.id}`}>
                  <button type="button" className="search-palette-item" onClick={() => goTo(r.path)}>
                    <span className={`badge search-palette-type-${r.type}`}>{SEARCH_TYPE_LABELS[r.type]}</span>
                    <span className="search-palette-title">{r.title}</span>
                    <span className="search-palette-subtitle">{r.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
