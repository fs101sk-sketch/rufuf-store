import { describe, expect, it } from 'vitest'
import type { ContactRow, DealRow, EventRow, FileRow, ProjectRow, TaskRow, TransactionRow } from '../db/schema'
import { buildSearchIndex, searchAll } from './searchService'

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

function makeTransaction(overrides: Partial<TransactionRow> = {}): TransactionRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    type: 'income',
    amount: 100,
    category: 'فئة',
    description: '',
    date: now,
    project_id: null,
    contact_id: null,
    created_at: now,
    updated_at: now,
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

function makeFile(overrides: Partial<FileRow> = {}): FileRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'ملف.pdf',
    mime_type: 'application/pdf',
    size: 1024,
    description: '',
    project_id: null,
    contact_id: null,
    data: new Blob(['x']),
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

describe('buildSearchIndex', () => {
  it('excludes soft-deleted rows from every entity type', () => {
    const project = makeProject({ deleted_at: new Date().toISOString() })
    const index = buildSearchIndex({
      projects: [project],
      tasks: [],
      contacts: [],
      deals: [],
      transactions: [],
      events: [],
      files: [],
    })
    expect(index).toHaveLength(0)
  })

  it('resolves a task subtitle to its real parent project name', () => {
    const project = makeProject({ name: 'موقع تجريبي' })
    const task = makeTask({ project_id: project.id, title: 'تصميم الواجهة' })
    const index = buildSearchIndex({
      projects: [project],
      tasks: [task],
      contacts: [],
      deals: [],
      transactions: [],
      events: [],
      files: [],
    })
    const taskResult = index.find((r) => r.type === 'task')
    expect(taskResult?.subtitle).toBe('موقع تجريبي')
    expect(taskResult?.path).toBe(`/projects/${project.id}`)
  })

  it('resolves a deal subtitle to its real parent contact name and links to the contact', () => {
    const contact = makeContact({ name: 'أحمد' })
    const deal = makeDeal({ contact_id: contact.id, title: 'صفقة كبيرة' })
    const index = buildSearchIndex({
      projects: [],
      tasks: [],
      contacts: [contact],
      deals: [deal],
      transactions: [],
      events: [],
      files: [],
    })
    const dealResult = index.find((r) => r.type === 'deal')
    expect(dealResult?.subtitle).toBe('أحمد')
    expect(dealResult?.path).toBe(`/crm/contacts/${contact.id}`)
  })

  it('includes transactions and events with their real fields', () => {
    const tx = makeTransaction({ category: 'استشارات', description: 'دفعة' })
    const event = makeEvent({ title: 'اجتماع', location: 'المكتب' })
    const index = buildSearchIndex({
      projects: [],
      tasks: [],
      contacts: [],
      deals: [],
      transactions: [tx],
      events: [event],
      files: [],
    })
    expect(index.find((r) => r.type === 'transaction')?.title).toBe('استشارات')
    expect(index.find((r) => r.type === 'event')?.subtitle).toBe('المكتب')
  })

  it('includes files with their real name and description, excluding deleted ones', () => {
    const file = makeFile({ name: 'عقد.pdf', description: 'عقد موقّع' })
    const deletedFile = makeFile({ name: 'محذوف.pdf', deleted_at: new Date().toISOString() })
    const index = buildSearchIndex({
      projects: [],
      tasks: [],
      contacts: [],
      deals: [],
      transactions: [],
      events: [],
      files: [file, deletedFile],
    })
    expect(index).toHaveLength(1)
    expect(index[0]?.title).toBe('عقد.pdf')
    expect(index[0]?.subtitle).toBe('عقد موقّع')
    expect(index[0]?.path).toBe('/files')
  })
})

describe('searchAll', () => {
  const index = buildSearchIndex({
    projects: [makeProject({ name: 'نظام إدارة المخزون' })],
    tasks: [makeTask({ title: 'كتابة الاختبارات' })],
    contacts: [makeContact({ name: 'شركة الأفق' })],
    deals: [],
    transactions: [],
    events: [],
    files: [],
  })

  it('returns nothing for an empty query', () => {
    expect(searchAll(index, '')).toEqual([])
    expect(searchAll(index, '   ')).toEqual([])
  })

  it('matches case-insensitively across title and subtitle', () => {
    const result = searchAll(index, 'المخزون')
    expect(result.map((r) => r.title)).toContain('نظام إدارة المخزون')
  })

  it('respects the result limit', () => {
    const bigIndex = buildSearchIndex({
      projects: Array.from({ length: 50 }, () => makeProject({ name: 'مشروع مطابق' })),
      tasks: [],
      contacts: [],
      deals: [],
      transactions: [],
      events: [],
      files: [],
    })
    expect(searchAll(bigIndex, 'مطابق', 10)).toHaveLength(10)
  })
})
