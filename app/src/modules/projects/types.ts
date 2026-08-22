import type { Priority, ProjectRow, ProjectStatus, TaskRow, TaskStatus } from '../../core/db/schema'

export type { ProjectRow, TaskRow, ProjectStatus, TaskStatus, Priority }

export interface ProjectInput {
  name: string
  type: string
  description: string
  status: ProjectStatus
  priority: Priority
  deadline: string | null
  live_url: string | null
  repository_url: string | null
  tech_stack: string[]
  notes: string
}

export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  due_date: string | null
}

export interface ProjectFilters {
  search: string
  status: ProjectStatus | 'all'
  priority: Priority | 'all'
  favoriteOnly: boolean
  overdueOnly: boolean
  upcomingOnly: boolean
  includeDeleted: boolean
}

export type ProjectSortField = 'name' | 'created_at' | 'updated_at' | 'deadline' | 'priority'
export type SortDirection = 'asc' | 'desc'

export interface ProjectSort {
  field: ProjectSortField
  direction: SortDirection
}

export const DEFAULT_FILTERS: ProjectFilters = {
  search: '',
  status: 'all',
  priority: 'all',
  favoriteOnly: false,
  overdueOnly: false,
  upcomingOnly: false,
  includeDeleted: false,
}

export const DEFAULT_SORT: ProjectSort = { field: 'updated_at', direction: 'desc' }

export interface ProjectProgress {
  total: number
  completed: number
  percent: number
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'تخطيط',
  active: 'نشط',
  on_hold: 'متوقف مؤقتًا',
  completed: 'مكتمل',
  cancelled: 'ملغى',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'لم يبدأ',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجلة',
}
