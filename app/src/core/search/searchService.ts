import type { ContactRow, DealRow, EventRow, FileRow, ProjectRow, TaskRow, TransactionRow } from '../db/schema'

export type SearchResultType = 'project' | 'task' | 'contact' | 'deal' | 'transaction' | 'event' | 'file'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  subtitle: string
  path: string
}

export const SEARCH_TYPE_LABELS: Record<SearchResultType, string> = {
  project: 'مشروع',
  task: 'مهمة',
  contact: 'جهة اتصال',
  deal: 'صفقة',
  transaction: 'حركة مالية',
  event: 'حدث',
  file: 'ملف',
}

export interface SearchIndexInput {
  projects: ProjectRow[]
  tasks: TaskRow[]
  contacts: ContactRow[]
  deals: DealRow[]
  transactions: TransactionRow[]
  events: EventRow[]
  files: FileRow[]
}

/** Builds a flat, real, in-memory search index from live data (no fake entries). */
export function buildSearchIndex(input: SearchIndexInput): SearchResult[] {
  const projectNameById = new Map(input.projects.map((p) => [p.id, p.name]))
  const contactNameById = new Map(input.contacts.map((c) => [c.id, c.name]))

  const results: SearchResult[] = []

  for (const p of input.projects) {
    if (p.deleted_at) continue
    results.push({ id: p.id, type: 'project', title: p.name, subtitle: p.type || 'مشروع', path: `/projects/${p.id}` })
  }

  for (const t of input.tasks) {
    if (t.deleted_at) continue
    const parentName = t.project_id ? (projectNameById.get(t.project_id) ?? 'مشروع محذوف') : 'بلا مشروع'
    results.push({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: parentName,
      path: t.project_id ? `/projects/${t.project_id}` : '/projects',
    })
  }

  for (const c of input.contacts) {
    if (c.deleted_at) continue
    results.push({
      id: c.id,
      type: 'contact',
      title: c.name,
      subtitle: c.company || 'جهة اتصال',
      path: `/crm/contacts/${c.id}`,
    })
  }

  for (const d of input.deals) {
    if (d.deleted_at) continue
    const parentName = contactNameById.get(d.contact_id) ?? 'جهة اتصال محذوفة'
    results.push({ id: d.id, type: 'deal', title: d.title, subtitle: parentName, path: `/crm/contacts/${d.contact_id}` })
  }

  for (const tx of input.transactions) {
    if (tx.deleted_at) continue
    results.push({
      id: tx.id,
      type: 'transaction',
      title: tx.category,
      subtitle: tx.description || (tx.type === 'income' ? 'إيراد' : 'مصروف'),
      path: '/finance',
    })
  }

  for (const e of input.events) {
    if (e.deleted_at) continue
    results.push({ id: e.id, type: 'event', title: e.title, subtitle: e.location || 'حدث', path: '/calendar' })
  }

  for (const f of input.files) {
    if (f.deleted_at) continue
    results.push({ id: f.id, type: 'file', title: f.name, subtitle: f.description || 'ملف', path: '/files' })
  }

  return results
}

/** Real substring search across title and subtitle, case-insensitive. */
export function searchAll(index: SearchResult[], query: string, limit = 30): SearchResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return index
    .filter((r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q))
    .slice(0, limit)
}
