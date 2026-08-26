import { isDueToday, isOverdue } from '../../core/dates'
import type { ContactRow, DealRow, EventRow, ProjectRow, TaskRow } from '../../core/db/schema'

export type AttentionItemType = 'task' | 'deal' | 'event'

export interface AttentionItem {
  id: string
  type: AttentionItemType
  title: string
  detail: string
  path: string
}

export interface AttentionInput {
  tasks: TaskRow[]
  projects: ProjectRow[]
  deals: DealRow[]
  contacts: ContactRow[]
  events: EventRow[]
}

/** Real items needing attention today: overdue tasks, deals overdue on their expected close date, and today's events. */
export function computeAttentionItems(input: AttentionInput, limit = 10): AttentionItem[] {
  const projectNameById = new Map(input.projects.map((p) => [p.id, p.name]))
  const contactNameById = new Map(input.contacts.map((c) => [c.id, c.name]))

  const overdueTasks: AttentionItem[] = input.tasks
    .filter((t) => !t.deleted_at && t.status !== 'completed' && isOverdue(t.due_date))
    .map((t) => ({
      id: t.id,
      type: 'task',
      title: t.title,
      detail: t.project_id ? `متأخرة · ${projectNameById.get(t.project_id) ?? 'مشروع محذوف'}` : 'متأخرة',
      path: t.project_id ? `/projects/${t.project_id}` : '/projects',
    }))

  const overdueDeals: AttentionItem[] = input.deals
    .filter((d) => !d.deleted_at && d.stage !== 'won' && d.stage !== 'lost' && isOverdue(d.expected_close_date))
    .map((d) => ({
      id: d.id,
      type: 'deal',
      title: d.title,
      detail: `تجاوزت الإغلاق المتوقع · ${contactNameById.get(d.contact_id) ?? 'جهة اتصال محذوفة'}`,
      path: `/crm/contacts/${d.contact_id}`,
    }))

  const todayEvents: AttentionItem[] = input.events
    .filter((e) => !e.deleted_at && isDueToday(e.start_at))
    .map((e) => ({
      id: e.id,
      type: 'event',
      title: e.title,
      detail: 'اليوم' + (e.location ? ` · ${e.location}` : ''),
      path: '/calendar',
    }))

  return [...overdueTasks, ...overdueDeals, ...todayEvents].slice(0, limit)
}
