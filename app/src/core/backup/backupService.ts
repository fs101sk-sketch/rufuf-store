import { db } from '../db/schema'
import type {
  ContactRow,
  DealRow,
  EventRow,
  FileRow,
  ProjectRow,
  SettingRow,
  TaskRow,
  TransactionRow,
  WorkspaceRow,
} from '../db/schema'
import { logActivity } from '../activity/activityService'
import { createId } from '../ids'
import { nowIso } from '../dates'

const APP_NAME = 'business-os'
const BACKUP_VERSION = 4

/** JSON can't hold a Blob, so backed-up files carry their bytes as base64 instead of a real Blob. */
export interface BackupFileEntry extends Omit<FileRow, 'data'> {
  dataBase64: string
}

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
  transactions: TransactionRow[]
  events: EventRow[]
  files: BackupFileEntry[]
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType })
}

export async function buildBackup(): Promise<BackupFile> {
  const [workspace, settings, projects, tasks, contacts, deals, transactions, events, files] = await Promise.all([
    db.workspace.toArray(),
    db.settings.toArray(),
    db.projects.toArray(),
    db.tasks.toArray(),
    db.contacts.toArray(),
    db.deals.toArray(),
    db.transactions.toArray(),
    db.events.toArray(),
    db.files.toArray(),
  ])
  const fileEntries: BackupFileEntry[] = await Promise.all(
    files.map(async ({ data, ...rest }) => ({ ...rest, dataBase64: await blobToBase64(data) })),
  )
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
    transactions,
    events,
    files: fileEntries,
  }
}

export async function exportBackup(): Promise<BackupFile> {
  const backup = await buildBackup()
  await logActivity('backup.exported', 'backup', createId(), {
    projects: backup.projects.length,
    tasks: backup.tasks.length,
    contacts: backup.contacts.length,
    deals: backup.deals.length,
    transactions: backup.transactions.length,
    events: backup.events.length,
    files: backup.files.length,
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
  transactions: number
  events: number
  files: number
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
    // Backups created before the Finance/Calendar modules (version 2) predate these tables.
    transactions: Array.isArray(candidate.transactions) ? candidate.transactions : [],
    events: Array.isArray(candidate.events) ? candidate.events : [],
    // Backups created before the Files module (version 3) predate this table.
    files: Array.isArray(candidate.files) ? candidate.files : [],
  }
  return {
    data,
    summary: {
      projects: data.projects.length,
      tasks: data.tasks.length,
      contacts: data.contacts.length,
      deals: data.deals.length,
      transactions: data.transactions.length,
      events: data.events.length,
      files: data.files.length,
      settings: data.settings.length,
      exportedAt: data.exportedAt,
    },
  }
}

/** Imports a validated backup, upserting by id inside one transaction. */
export async function importBackup(data: BackupFile): Promise<BackupSummary> {
  const fileRows: FileRow[] = data.files.map(({ dataBase64, ...rest }) => ({
    ...rest,
    data: base64ToBlob(dataBase64, rest.mime_type),
  }))

  await db.transaction(
    'rw',
    [db.workspace, db.settings, db.projects, db.tasks, db.contacts, db.deals, db.transactions, db.events, db.files],
    async () => {
      for (const w of data.workspace) await db.workspace.put(w)
      for (const s of data.settings) await db.settings.put(s)
      for (const p of data.projects) await db.projects.put(p)
      for (const t of data.tasks) await db.tasks.put(t)
      for (const c of data.contacts) await db.contacts.put(c)
      for (const d of data.deals) await db.deals.put(d)
      for (const tx of data.transactions) await db.transactions.put(tx)
      for (const e of data.events) await db.events.put(e)
      for (const f of fileRows) await db.files.put(f)
    },
  )
  const summary: BackupSummary = {
    projects: data.projects.length,
    tasks: data.tasks.length,
    contacts: data.contacts.length,
    deals: data.deals.length,
    transactions: data.transactions.length,
    events: data.events.length,
    files: data.files.length,
    settings: data.settings.length,
    exportedAt: data.exportedAt,
  }
  await logActivity('backup.imported', 'backup', createId(), { ...summary })
  return summary
}
