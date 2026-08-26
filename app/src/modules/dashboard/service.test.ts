import { describe, expect, it } from 'vitest'
import type { ContactRow, DealRow, EventRow, ProjectRow, TaskRow } from '../../core/db/schema'
import { computeAttentionItems } from './service'

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'مشروع',
    type: '',
    description: '',
    status: 'active',
    priority: 'medium',
    deadline: null,
    live_url: null,
    repository_url: null,
    tech_stack: [],
    notes: '',
    favorite: false,
    client_id: null,
    created_at: now,
    updated_at: now,
    archived_at: null,
    deleted_at: null,
    ...overrides,
  }
}

function makeTask(overrides: Partial<TaskRow> = {}): TaskRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    project_id: null,
    title: 'مهمة',
    description: '',
    status: 'todo',
    priority: 'medium',
    due_date: null,
    completed_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

function makeContact(overrides: Partial<ContactRow> = {}): ContactRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'جهة اتصال',
    company: '',
    email: '',
    phone: '',
    type: 'lead',
    notes: '',
    favorite: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

function makeDeal(overrides: Partial<DealRow> = {}): DealRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    contact_id: crypto.randomUUID(),
    title: 'صفقة',
    value: 0,
    stage: 'new',
    expected_close_date: null,
    notes: '',
    created_at: now,
    updated_at: now,
    closed_at: null,
    deleted_at: null,
    ...overrides,
  }
}

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: 'حدث',
    description: '',
    start_at: now,
    end_at: null,
    all_day: false,
    location: '',
    project_id: null,
    contact_id: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

const yesterday = new Date(Date.now() - 86400000).toISOString()
const tomorrow = new Date(Date.now() + 86400000).toISOString()

describe('computeAttentionItems', () => {
  it('flags an incomplete overdue task, but not a completed or future one', () => {
    const overdue = makeTask({ title: 'متأخرة', due_date: yesterday, status: 'todo' })
    const completedOverdue = makeTask({ title: 'مكتملة متأخرة', due_date: yesterday, status: 'completed' })
    const future = makeTask({ title: 'مستقبلية', due_date: tomorrow, status: 'todo' })

    const result = computeAttentionItems({
      tasks: [overdue, completedOverdue, future],
      projects: [],
      deals: [],
      contacts: [],
      events: [],
    })
    expect(result.map((r) => r.title)).toEqual(['متأخرة'])
  })

  it('resolves an overdue task detail to its real parent project name', () => {
    const project = makeProject({ name: 'موقع تجريبي' })
    const task = makeTask({ project_id: project.id, due_date: yesterday, status: 'todo' })
    const result = computeAttentionItems({ tasks: [task], projects: [project], deals: [], contacts: [], events: [] })
    expect(result[0]?.detail).toContain('موقع تجريبي')
    expect(result[0]?.path).toBe(`/projects/${project.id}`)
  })

  it('flags an open deal past its expected close date, but not a won/lost one', () => {
    const contact = makeContact({ name: 'أحمد' })
    const overdueOpen = makeDeal({ contact_id: contact.id, stage: 'negotiation', expected_close_date: yesterday })
    const overdueWon = makeDeal({ contact_id: contact.id, stage: 'won', expected_close_date: yesterday })

    const result = computeAttentionItems({
      tasks: [],
      projects: [],
      deals: [overdueOpen, overdueWon],
      contacts: [contact],
      events: [],
    })
    expect(result.map((r) => r.id)).toEqual([overdueOpen.id])
    expect(result[0]?.detail).toContain('أحمد')
  })

  it('flags an event happening today, but not one yesterday or tomorrow', () => {
    const today = makeEvent({ title: 'اليوم', start_at: new Date().toISOString() })
    const past = makeEvent({ title: 'أمس', start_at: yesterday })
    const future = makeEvent({ title: 'غدًا', start_at: tomorrow })

    const result = computeAttentionItems({ tasks: [], projects: [], deals: [], contacts: [], events: [today, past, future] })
    expect(result.map((r) => r.title)).toEqual(['اليوم'])
  })

  it('excludes soft-deleted rows entirely', () => {
    const deletedTask = makeTask({ due_date: yesterday, status: 'todo', deleted_at: new Date().toISOString() })
    const result = computeAttentionItems({ tasks: [deletedTask], projects: [], deals: [], contacts: [], events: [] })
    expect(result).toHaveLength(0)
  })

  it('respects the limit across combined item types', () => {
    const tasks = Array.from({ length: 5 }, () => makeTask({ due_date: yesterday, status: 'todo' }))
    const result = computeAttentionItems({ tasks, projects: [], deals: [], contacts: [], events: [] }, 3)
    expect(result).toHaveLength(3)
  })
})
