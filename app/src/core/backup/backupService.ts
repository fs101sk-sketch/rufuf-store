import { db } from '../db/schema'
import type { ContactRow, DealRow, ProjectRow, SettingRow, TaskRow, WorkspaceRow } from '../db/schema'
import { logActivity } from '../activity/activityService'
import { createId } from '../ids'
import { nowIso } from '../dates'

const APP_NAME = 'business-os'
const BACKUP_VERSION = 2

export interface BackupFile {
  app: string
  version: number
  exportedAt: string
  workspace: WorkspaceRow[]
  settings: SettingRow[]
  projects: ProjectRow[]
  tasks: TaskRow[]
  contacts: ContactRow[]
  deals: DealRow[]
}

export async function buildBackup(): Promise<BackupFile> {
  const [workspace, settings, projects, tasks, contacts, deals] = await Promise.all([
    db.workspace.toArray(),
    db.settings.toArray(),
    db.projects.toArray(),
    db.tasks.toArray(),
    db.contacts.toArray(),
    db.deals.toArray(),
  ])
  return {
    app: APP_NAME,
    version: BACKUP_VERSION,
    exportedAt: nowIso(),
    workspace,
    settings,
    projects,
    tasks,
    contacts,
    deals,
  }
}

export async function exportBackup(): Promise<BackupFile> {
  const backup = await buildBackup()
  await logActivity('backup.exported', 'backup', createId(), {
    projects: backup.projects.length,
    tasks: backup.tasks.length,
    contacts: backup.contacts.length,
    deals: backup.deals.length,
  })
  return backup
}

export interface BackupValidationError {
  message: string
}

export interface BackupSummary {
  projects: number
  tasks: number
  contacts: number
  deals: number
  settings: number
  exportedAt: string
}

/** Parses and validates a backup file's shape without touching the database. */
export function parseBackup(raw: unknown): { data: BackupFile; summary: BackupSummary } | { error: BackupValidationError } {
  if (typeof raw !== 'object' || raw === null) {
    return { error: { message: 'الملف ليس نسخة احتياطية صالحة (JSON غير صحيح).' } }
  }
  const candidate = raw as Partial<BackupFile>
  if (candidate.app !== APP_NAME) {
    return { error: { message: `الملف ليس نسخة احتياطية من هذا التطبيق (app=${String(candidate.app)}).` } }
  }
  if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) {
    return { error: { message: `إصدار النسخة الاحتياطية (${String(candidate.version)}) غير مدعوم في هذا الإصدار من التطبيق.` } }
  }
  if (!Array.isArray(candidate.projects) || !Array.isArray(candidate.tasks)) {
    return { error: { message: 'الملف لا يحتوي على بيانات المشاريع أو المهام المتوقعة.' } }
  }
  const data: BackupFile = {
    app: candidate.app,
    version: candidate.version,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : nowIso(),
    workspace: Array.isArray(candidate.workspace) ? candidate.workspace : [],
    settings: Array.isArray(candidate.settings) ? candidate.settings : [],
    projects: candidate.projects,
    tasks: candidate.tasks,
    // Backups created before the CRM module (version 1) predate these tables.
    contacts: Array.isArray(candidate.contacts) ? candidate.contacts : [],
    deals: Array.isArray(candidate.deals) ? candidate.deals : [],
  }
  return {
    data,
    summary: {
      projects: data.projects.length,
      tasks: data.tasks.length,
      contacts: data.contacts.length,
      deals: data.deals.length,
      settings: data.settings.length,
      exportedAt: data.exportedAt,
    },
  }
}

/** Imports a validated backup, upserting by id inside one transaction. */
export async function importBackup(data: BackupFile): Promise<BackupSummary> {
  await db.transaction(
    'rw',
    [db.workspace, db.settings, db.projects, db.tasks, db.contacts, db.deals],
    async () => {
      for (const w of data.workspace) await db.workspace.put(w)
      for (const s of data.settings) await db.settings.put(s)
      for (const p of data.projects) await db.projects.put(p)
      for (const t of data.tasks) await db.tasks.put(t)
      for (const c of data.contacts) await db.contacts.put(c)
      for (const d of data.deals) await db.deals.put(d)
    },
  )
  const summary: BackupSummary = {
    projects: data.projects.length,
    tasks: data.tasks.length,
    contacts: data.contacts.length,
    deals: data.deals.length,
    settings: data.settings.length,
    exportedAt: data.exportedAt,
  }
  await logActivity('backup.imported', 'backup', createId(), { ...summary })
  return summary
}
