import { describe, expect, it } from 'vitest'
import type { ProjectRow, TaskRow } from '../../core/db/schema'
import { computeProgress, computeStats, filterAndSortProjects } from './service'
import { validateProjectInput, validateTaskInput } from './validation'
import { DEFAULT_FILTERS, DEFAULT_SORT } from './types'

function makeProject(overrides: Partial<ProjectRow> = {}): ProjectRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'مشروع تجريبي',
    type: 'ويب',
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

describe('validateProjectInput', () => {
  it('rejects an empty name', () => {
    const result = validateProjectInput({
      name: '  ',
      type: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      deadline: null,
      live_url: null,
      repository_url: null,
      tech_stack: [],
      notes: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('rejects an invalid live_url', () => {
    const result = validateProjectInput({
      name: 'مشروع',
      type: '',
      description: '',
      status: 'planning',
      priority: 'medium',
      deadline: null,
      live_url: 'not-a-url',
      repository_url: null,
      tech_stack: [],
      notes: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.live_url).toBeDefined()
  })

  it('accepts a valid project', () => {
    const result = validateProjectInput({
      name: 'مشروع صالح',
      type: 'ويب',
      description: '',
      status: 'planning',
      priority: 'high',
      deadline: new Date().toISOString(),
      live_url: 'https://example.com',
      repository_url: 'https://github.com/example/repo',
      tech_stack: ['React'],
      notes: '',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

describe('validateTaskInput', () => {
  it('rejects an empty title', () => {
    const result = validateTaskInput({
      title: '',
      description: '',
      status: 'todo',
      priority: 'low',
      due_date: null,
    })
    expect(result.valid).toBe(false)
  })

  it('rejects an invalid due_date', () => {
    const result = validateTaskInput({
      title: 'مهمة',
      description: '',
      status: 'todo',
      priority: 'low',
      due_date: 'not-a-date',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.due_date).toBeDefined()
  })
})

describe('computeProgress', () => {
  it('returns 0% for a project with no tasks', () => {
    expect(computeProgress([])).toEqual({ total: 0, completed: 0, percent: 0 })
  })

  it('computes percent complete from real task rows, ignoring soft-deleted ones', () => {
    const tasks = [
      makeTask({ status: 'completed' }),
      makeTask({ status: 'completed' }),
      makeTask({ status: 'todo' }),
      makeTask({ status: 'completed', deleted_at: new Date().toISOString() }),
    ]
    expect(computeProgress(tasks)).toEqual({ total: 3, completed: 2, percent: 67 })
  })
})

describe('filterAndSortProjects', () => {
  const active = makeProject({ name: 'ب - نشط', status: 'active', favorite: true })
  const planning = makeProject({ name: 'أ - تخطيط', status: 'planning' })
  const overdue = makeProject({
    name: 'ج - متأخر',
    status: 'active',
    deadline: new Date(Date.now() - 5 * 86400000).toISOString(),
  })
  const deleted = makeProject({ name: 'محذوف', deleted_at: new Date().toISOString() })
  const all = [active, planning, overdue, deleted]

  it('excludes soft-deleted projects by default', () => {
    const result = filterAndSortProjects(all, DEFAULT_FILTERS, DEFAULT_SORT)
    expect(result.some((p) => p.id === deleted.id)).toBe(false)
  })

  it('includes soft-deleted projects when includeDeleted is set', () => {
    const result = filterAndSortProjects(all, { ...DEFAULT_FILTERS, includeDeleted: true }, DEFAULT_SORT)
    expect(result.some((p) => p.id === deleted.id)).toBe(true)
  })

  it('filters by status', () => {
    const result = filterAndSortProjects(all, { ...DEFAULT_FILTERS, status: 'planning' }, DEFAULT_SORT)
    expect(result.map((p) => p.id)).toEqual([planning.id])
  })

  it('filters by favoriteOnly', () => {
    const result = filterAndSortProjects(all, { ...DEFAULT_FILTERS, favoriteOnly: true }, DEFAULT_SORT)
    expect(result.map((p) => p.id)).toEqual([active.id])
  })

  it('filters by overdueOnly', () => {
    const result = filterAndSortProjects(all, { ...DEFAULT_FILTERS, overdueOnly: true }, DEFAULT_SORT)
    expect(result.map((p) => p.id)).toEqual([overdue.id])
  })

  it('sorts by name ascending using Arabic collation', () => {
    const result = filterAndSortProjects(all, DEFAULT_FILTERS, { field: 'name', direction: 'asc' })
    expect(result.map((p) => p.name)).toEqual(['أ - تخطيط', 'ب - نشط', 'ج - متأخر'])
  })

  it('searches across name, description and tech_stack', () => {
    const withTech = makeProject({ name: 'س', tech_stack: ['Rust'] })
    const result = filterAndSortProjects([withTech, active], { ...DEFAULT_FILTERS, search: 'rust' }, DEFAULT_SORT)
    expect(result.map((p) => p.id)).toEqual([withTech.id])
  })
})

describe('computeStats', () => {
  it('computes real aggregate counts, not hardcoded numbers', () => {
    const projects = [
      makeProject({ status: 'active' }),
      makeProject({ status: 'active', deadline: new Date(Date.now() - 86400000).toISOString() }),
      makeProject({ status: 'planning', favorite: true }),
    ]
    const tasks = [
      makeTask({ due_date: new Date().toISOString(), status: 'todo' }),
      makeTask({ due_date: new Date(Date.now() - 86400000).toISOString(), status: 'todo' }),
      makeTask({ due_date: new Date(Date.now() - 86400000).toISOString(), status: 'completed' }),
    ]
    const stats = computeStats(projects, tasks)
    expect(stats.total).toBe(3)
    expect(stats.active).toBe(2)
    expect(stats.overdue).toBe(1)
    expect(stats.favorites).toBe(1)
    expect(stats.tasksDueToday).toBe(1)
    expect(stats.tasksOverdue).toBe(1)
  })
})
