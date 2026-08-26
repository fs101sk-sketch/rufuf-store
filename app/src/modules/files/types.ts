import type { FileRow } from '../../core/db/schema'

export type { FileRow }

export interface FileUploadInput {
  name: string
  mime_type: string
  size: number
  data: Blob
  description: string
  project_id: string | null
  contact_id: string | null
}

export interface FileMetaInput {
  description: string
  project_id: string | null
  contact_id: string | null
}

export interface FileFilters {
  search: string
  includeDeleted: boolean
}

export type FileSortField = 'name' | 'size' | 'created_at'
export type SortDirection = 'asc' | 'desc'

export interface FileSort {
  field: FileSortField
  direction: SortDirection
}

export const DEFAULT_FILE_FILTERS: FileFilters = {
  search: '',
  includeDeleted: false,
}

export const DEFAULT_FILE_SORT: FileSort = { field: 'created_at', direction: 'desc' }

/** 20MB per-file cap, kept sane for a browser-local IndexedDB store. */
export const MAX_FILE_SIZE = 20 * 1024 * 1024
