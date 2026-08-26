import { createId } from '../../core/ids'
import { nowIso } from '../../core/dates'
import { logActivity } from '../../core/activity/activityService'
import type { FileRow } from '../../core/db/schema'
import { filesRepository } from './repository'
import { validateFileUpload } from './validation'
import type { FileFilters, FileMetaInput, FileSort, FileUploadInput } from './types'

export class ValidationFailedError extends Error {
  errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationFailedError'
    this.errors = errors
  }
}

export async function uploadFile(input: FileUploadInput): Promise<FileRow> {
  const result = validateFileUpload(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: FileRow = {
    id: createId(),
    name: input.name.trim(),
    mime_type: input.mime_type,
    size: input.size,
    description: input.description.trim(),
    project_id: input.project_id,
    contact_id: input.contact_id,
    data: input.data,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await filesRepository.create(row)
  await logActivity('file.created', 'file', row.id, { name: row.name, size: row.size })
  return row
}

export async function updateFileMeta(id: string, input: FileMetaInput): Promise<void> {
  await filesRepository.update(id, {
    description: input.description.trim(),
    project_id: input.project_id,
    contact_id: input.contact_id,
    updated_at: nowIso(),
  })
  await logActivity('file.updated', 'file', id)
}

export async function softDeleteFile(id: string): Promise<void> {
  await filesRepository.update(id, { deleted_at: nowIso() })
  await logActivity('file.deleted', 'file', id)
}

export async function restoreFile(id: string): Promise<void> {
  await filesRepository.update(id, { deleted_at: null })
  await logActivity('file.restored', 'file', id)
}

export async function permanentlyDeleteFile(id: string): Promise<void> {
  await filesRepository.remove(id)
  await logActivity('file.deleted', 'file', id, { permanent: true })
}

export function filterAndSortFiles(files: FileRow[], filters: FileFilters, sort: FileSort): FileRow[] {
  let result = files.filter((f) => (filters.includeDeleted ? true : !f.deleted_at))

  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter(
      (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q),
    )
  }

  const dir = sort.direction === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => {
    switch (sort.field) {
      case 'name':
        return dir * a.name.localeCompare(b.name, 'ar')
      case 'size':
        return dir * (a.size - b.size)
      case 'created_at':
      default:
        return dir * a.created_at.localeCompare(b.created_at)
    }
  })

  return result
}

export interface FileStats {
  count: number
  totalSize: number
}

export function computeFileStats(files: FileRow[]): FileStats {
  const live = files.filter((f) => !f.deleted_at)
  return {
    count: live.length,
    totalSize: live.reduce((sum, f) => sum + f.size, 0),
  }
}
