import { describe, expect, it } from 'vitest'
import type { FileRow } from '../../core/db/schema'
import { computeFileStats, filterAndSortFiles } from './service'
import { validateFileUpload } from './validation'
import { DEFAULT_FILE_FILTERS, DEFAULT_FILE_SORT, MAX_FILE_SIZE } from './types'

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

describe('validateFileUpload', () => {
  it('rejects an empty name', () => {
    const result = validateFileUpload({
      name: '  ',
      mime_type: 'text/plain',
      size: 100,
      data: new Blob(['x']),
      description: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('rejects an empty file (size 0)', () => {
    const result = validateFileUpload({
      name: 'ملف.txt',
      mime_type: 'text/plain',
      size: 0,
      data: new Blob([]),
      description: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.data).toBeDefined()
  })

  it('rejects a file larger than the max size', () => {
    const result = validateFileUpload({
      name: 'ملف.zip',
      mime_type: 'application/zip',
      size: MAX_FILE_SIZE + 1,
      data: new Blob(['x']),
      description: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.data).toBeDefined()
  })

  it('accepts a valid upload', () => {
    const result = validateFileUpload({
      name: 'تقرير.pdf',
      mime_type: 'application/pdf',
      size: 2048,
      data: new Blob(['x']),
      description: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

describe('filterAndSortFiles', () => {
  const small = makeFile({ name: 'ب - صغير', size: 100 })
  const large = makeFile({ name: 'أ - كبير', size: 5000, description: 'عقد موقّع' })
  const deleted = makeFile({ name: 'محذوف', deleted_at: new Date().toISOString() })
  const all = [small, large, deleted]

  it('excludes soft-deleted files by default', () => {
    const result = filterAndSortFiles(all, DEFAULT_FILE_FILTERS, DEFAULT_FILE_SORT)
    expect(result.some((f) => f.id === deleted.id)).toBe(false)
  })

  it('includes soft-deleted files when includeDeleted is set', () => {
    const result = filterAndSortFiles(all, { ...DEFAULT_FILE_FILTERS, includeDeleted: true }, DEFAULT_FILE_SORT)
    expect(result.some((f) => f.id === deleted.id)).toBe(true)
  })

  it('sorts by size descending', () => {
    const result = filterAndSortFiles(all, DEFAULT_FILE_FILTERS, { field: 'size', direction: 'desc' })
    expect(result.map((f) => f.id)).toEqual([large.id, small.id])
  })

  it('sorts by name ascending using Arabic collation', () => {
    const result = filterAndSortFiles(all, DEFAULT_FILE_FILTERS, { field: 'name', direction: 'asc' })
    expect(result.map((f) => f.name)).toEqual(['أ - كبير', 'ب - صغير'])
  })

  it('searches by name and description', () => {
    const result = filterAndSortFiles(all, { ...DEFAULT_FILE_FILTERS, search: 'موقّع' }, DEFAULT_FILE_SORT)
    expect(result.map((f) => f.id)).toEqual([large.id])
  })
})

describe('computeFileStats', () => {
  it('computes real count and total size, excluding deleted files', () => {
    const files = [
      makeFile({ size: 1000 }),
      makeFile({ size: 2000 }),
      makeFile({ size: 5000, deleted_at: new Date().toISOString() }),
    ]
    const stats = computeFileStats(files)
    expect(stats.count).toBe(2)
    expect(stats.totalSize).toBe(3000)
  })
})
