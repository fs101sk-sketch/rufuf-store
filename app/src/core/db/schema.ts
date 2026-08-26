import Dexie, { type EntityTable } from 'dexie'

export interface WorkspaceRow {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface SettingRow {
  key: string
  value: unknown
  scope: string
  updated_at: string
}

export type ActivityAction =
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.restored'
  | 'project.duplicated'
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.restored'
  | 'task.completed'
  | 'task.reopened'
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  | 'contact.restored'
  | 'deal.created'
  | 'deal.updated'
  | 'deal.deleted'
  | 'deal.restored'
  | 'deal.stage_changed'
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.deleted'
  | 'transaction.restored'
  | 'event.created'
  | 'event.updated'
  | 'event.deleted'
  | 'event.restored'
  | 'file.created'
  | 'file.updated'
  | 'file.deleted'
  | 'file.restored'
  | 'settings.updated'
  | 'backup.exported'
  | 'backup.imported'

export interface ActivityLogRow {
  id: string
  action: ActivityAction
  entity_type: 'project' | 'task' | 'contact' | 'deal' | 'transaction' | 'event' | 'file' | 'settings' | 'backup'
  entity_id: string
  actor: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface ProjectRow {
  id: string
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
  favorite: boolean
  client_id: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
  deleted_at: string | null
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed'

export interface TaskRow {
  id: string
  project_id: string | null
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type ContactType = 'lead' | 'customer'

export interface ContactRow {
  id: string
  name: string
  company: string
  email: string
  phone: string
  type: ContactType
  notes: string
  favorite: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type DealStage = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost'

export interface DealRow {
  id: string
  contact_id: string
  title: string
  value: number
  stage: DealStage
  expected_close_date: string | null
  notes: string
  created_at: string
  updated_at: string
  closed_at: string | null
  deleted_at: string | null
}

export type TransactionType = 'income' | 'expense'

export interface TransactionRow {
  id: string
  type: TransactionType
  amount: number
  category: string
  description: string
  date: string
  project_id: string | null
  contact_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface EventRow {
  id: string
  title: string
  description: string
  start_at: string
  end_at: string | null
  all_day: boolean
  location: string
  project_id: string | null
  contact_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface FileRow {
  id: string
  name: string
  mime_type: string
  size: number
  description: string
  project_id: string | null
  contact_id: string | null
  data: Blob
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/**
 * Dexie schema. Each `.version(n)` block is a real, additive migration —
 * once a version ships, its `.stores()` definition must never be edited;
 * schema changes land as a new `.version(n + 1)` block (with `.upgrade()`
 * when data needs transforming), so existing local databases upgrade in
 * place instead of losing data.
 */
export class AppDatabase extends Dexie {
  workspace!: EntityTable<WorkspaceRow, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  activity_log!: EntityTable<ActivityLogRow, 'id'>
  projects!: EntityTable<ProjectRow, 'id'>
  tasks!: EntityTable<TaskRow, 'id'>
  contacts!: EntityTable<ContactRow, 'id'>
  deals!: EntityTable<DealRow, 'id'>
  transactions!: EntityTable<TransactionRow, 'id'>
  events!: EntityTable<EventRow, 'id'>
  files!: EntityTable<FileRow, 'id'>

  constructor(name = 'business_os') {
    super(name)

    this.version(1).stores({
      workspace: 'id',
      settings: 'key, scope',
      activity_log: 'id, entity_type, entity_id, action, created_at',
      projects: 'id, status, priority, favorite, deadline, archived_at, deleted_at, created_at, name',
      tasks: 'id, project_id, status, priority, due_date, deleted_at, created_at',
    })

    this.version(2).stores({
      contacts: 'id, type, favorite, deleted_at, created_at, name',
      deals: 'id, contact_id, stage, expected_close_date, deleted_at, created_at',
    })

    this.version(3).stores({
      transactions: 'id, type, category, date, project_id, contact_id, deleted_at, created_at',
      events: 'id, start_at, end_at, deleted_at, created_at',
    })

    this.version(4).stores({
      files: 'id, project_id, contact_id, deleted_at, created_at, name',
    })
  }
}

export const db = new AppDatabase()
