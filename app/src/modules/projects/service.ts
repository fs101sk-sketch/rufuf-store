import { createId } from '../../core/ids'
import { isDueToday, isOverdue, isUpcoming, nowIso } from '../../core/dates'
import { logActivity } from '../../core/activity/activityService'
import type { ProjectRow, TaskRow } from '../../core/db/schema'
import { projectsRepository, tasksRepository } from './repository'
import { validateProjectInput, validateTaskInput } from './validation'
import type {
  ProjectFilters,
  ProjectInput,
  ProjectProgress,
  ProjectSort,
  TaskInput,
} from './types'

export class ValidationFailedError extends Error {
  errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationFailedError'
    this.errors = errors
  }
}

// ---------- Projects ----------

export async function createProject(input: ProjectInput): Promise<ProjectRow> {
  const result = validateProjectInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: ProjectRow = {
    id: createId(),
    name: input.name.trim(),
    type: input.type.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    deadline: input.deadline,
    live_url: input.live_url || null,
    repository_url: input.repository_url || null,
    tech_stack: input.tech_stack.map((t) => t.trim()).filter(Boolean),
    notes: input.notes.trim(),
    favorite: false,
    client_id: null,
    created_at: now,
    updated_at: now,
    archived_at: null,
    deleted_at: null,
  }
  await projectsRepository.create(row)
  await logActivity('project.created', 'project', row.id, { name: row.name })
  return row
}

export async function updateProject(id: string, input: ProjectInput): Promise<void> {
  const result = validateProjectInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  await projectsRepository.update(id, {
    name: input.name.trim(),
    type: input.type.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    deadline: input.deadline,
    live_url: input.live_url || null,
    repository_url: input.repository_url || null,
    tech_stack: input.tech_stack.map((t) => t.trim()).filter(Boolean),
    notes: input.notes.trim(),
    updated_at: nowIso(),
  })
  await logActivity('project.updated', 'project', id)
}

export async function toggleFavorite(id: string, favorite: boolean): Promise<void> {
  await projectsRepository.update(id, { favorite, updated_at: nowIso() })
  await logActivity('project.updated', 'project', id, { favorite })
}

export async function softDeleteProject(id: string): Promise<void> {
  await projectsRepository.update(id, { deleted_at: nowIso() })
  await logActivity('project.deleted', 'project', id)
}

export async function restoreProject(id: string): Promise<void> {
  await projectsRepository.update(id, { deleted_at: null })
  await logActivity('project.restored', 'project', id)
}

export async function permanentlyDeleteProject(id: string): Promise<void> {
  await projectsRepository.remove(id)
  await logActivity('project.deleted', 'project', id, { permanent: true })
}

export async function duplicateProject(id: string): Promise<ProjectRow> {
  const source = await projectsRepository.get(id)
  if (!source) throw new Error('المشروع غير موجود.')

  const now = nowIso()
  const clone: ProjectRow = {
    ...source,
    id: createId(),
    name: `${source.name} (نسخة)`,
    favorite: false,
    created_at: now,
    updated_at: now,
    archived_at: null,
    deleted_at: null,
  }
  await projectsRepository.create(clone)

  const sourceTasks = await tasksRepository.listByProject(id)
  for (const task of sourceTasks.filter((t) => !t.deleted_at)) {
    await tasksRepository.create({
      ...task,
      id: createId(),
      project_id: clone.id,
      created_at: now,
      updated_at: now,
    })
  }

  await logActivity('project.duplicated', 'project', clone.id, { source_id: id })
  return clone
}

export function filterAndSortProjects(
  projects: ProjectRow[],
  filters: ProjectFilters,
  sort: ProjectSort,
): ProjectRow[] {
  let result = projects.filter((p) => (filters.includeDeleted ? true : !p.deleted_at))

  if (filters.status !== 'all') {
    result = result.filter((p) => p.status === filters.status)
  }
  if (filters.priority !== 'all') {
    result = result.filter((p) => p.priority === filters.priority)
  }
  if (filters.favoriteOnly) {
    result = result.filter((p) => p.favorite)
  }
  if (filters.overdueOnly) {
    result = result.filter((p) => isOverdue(p.deadline) && p.status !== 'completed' && p.status !== 'cancelled')
  }
  if (filters.upcomingOnly) {
    result = result.filter((p) => isUpcoming(p.deadline) && p.status !== 'completed' && p.status !== 'cancelled')
  }
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q) ||
        p.tech_stack.some((t) => t.toLowerCase().includes(q)),
    )
  }

  const priorityRank: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 }
  const dir = sort.direction === 'asc' ? 1 : -1

  result = [...result].sort((a, b) => {
    switch (sort.field) {
      case 'name':
        return dir * a.name.localeCompare(b.name, 'ar')
      case 'deadline':
        if (!a.deadline && !b.deadline) return 0
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return dir * a.deadline.localeCompare(b.deadline)
      case 'priority':
        return dir * ((priorityRank[a.priority] ?? 0) - (priorityRank[b.priority] ?? 0))
      case 'created_at':
        return dir * a.created_at.localeCompare(b.created_at)
      case 'updated_at':
      default:
        return dir * a.updated_at.localeCompare(b.updated_at)
    }
  })

  return result
}

export interface ProjectStats {
  total: number
  active: number
  overdue: number
  upcoming: number
  favorites: number
  tasksDueToday: number
  tasksOverdue: number
}

export function computeStats(projects: ProjectRow[], tasks: TaskRow[]): ProjectStats {
  const live = projects.filter((p) => !p.deleted_at)
  const liveTasks = tasks.filter((t) => !t.deleted_at)
  return {
    total: live.length,
    active: live.filter((p) => p.status === 'active').length,
    overdue: live.filter((p) => isOverdue(p.deadline) && p.status !== 'completed' && p.status !== 'cancelled').length,
    upcoming: live.filter((p) => isUpcoming(p.deadline) && p.status !== 'completed' && p.status !== 'cancelled')
      .length,
    favorites: live.filter((p) => p.favorite).length,
    tasksDueToday: liveTasks.filter((t) => isDueToday(t.due_date) && t.status !== 'completed').length,
    tasksOverdue: liveTasks.filter((t) => isOverdue(t.due_date) && t.status !== 'completed').length,
  }
}

// ---------- Tasks ----------

export async function createTask(projectId: string | null, input: TaskInput): Promise<TaskRow> {
  const result = validateTaskInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: TaskRow = {
    id: createId(),
    project_id: projectId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    due_date: input.due_date,
    completed_at: input.status === 'completed' ? now : null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await tasksRepository.create(row)
  await logActivity('task.created', 'task', row.id, { project_id: projectId, title: row.title })
  return row
}

export async function updateTask(id: string, input: TaskInput): Promise<void> {
  const result = validateTaskInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const existing = await tasksRepository.get(id)
  const wasCompleted = existing?.status === 'completed'
  const nowCompleted = input.status === 'completed'

  await tasksRepository.update(id, {
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    priority: input.priority,
    due_date: input.due_date,
    completed_at: nowCompleted ? (wasCompleted ? existing?.completed_at ?? nowIso() : nowIso()) : null,
    updated_at: nowIso(),
  })
  await logActivity('task.updated', 'task', id)
}

export async function completeTask(id: string): Promise<void> {
  await tasksRepository.update(id, { status: 'completed', completed_at: nowIso(), updated_at: nowIso() })
  await logActivity('task.completed', 'task', id)
}

export async function reopenTask(id: string): Promise<void> {
  await tasksRepository.update(id, { status: 'todo', completed_at: null, updated_at: nowIso() })
  await logActivity('task.reopened', 'task', id)
}

export async function softDeleteTask(id: string): Promise<void> {
  await tasksRepository.update(id, { deleted_at: nowIso() })
  await logActivity('task.deleted', 'task', id)
}

export async function restoreTask(id: string): Promise<void> {
  await tasksRepository.update(id, { deleted_at: null })
  await logActivity('task.restored', 'task', id)
}

export function computeProgress(tasks: TaskRow[]): ProjectProgress {
  const live = tasks.filter((t) => !t.deleted_at)
  const completed = live.filter((t) => t.status === 'completed').length
  const total = live.length
  return {
    total,
    completed,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  }
}
