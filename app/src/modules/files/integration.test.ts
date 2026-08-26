/**
 * Runs under the `node` test environment rather than the suite's default
 * `jsdom`: fake-indexeddb's structured-clone step checks for Node's Blob
 * class internally, and jsdom's own Blob global fails that check (it clones
 * as an empty plain object instead), which never happens with a real
 * browser's native IndexedDB. `node` gives Node's Blob as the global here,
 * so structured clone round-trips real bytes and this test verifies actual
 * storage behavior instead of a jsdom/fake-indexeddb interop artifact.
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/schema'
import {
  permanentlyDeleteFile,
  restoreFile,
  softDeleteFile,
  updateFileMeta,
  uploadFile,
  ValidationFailedError,
} from './service'
import { filesRepository } from './repository'

function makeInput(overrides: Partial<Parameters<typeof uploadFile>[0]> = {}) {
  const blob = new Blob(['hello world'], { type: 'text/plain' })
  return {
    name: 'ملاحظات.txt',
    mime_type: 'text/plain',
    size: blob.size,
    data: blob,
    description: 'ملاحظات اجتماع',
    project_id: null,
    contact_id: null,
    ...overrides,
  }
}

beforeEach(async () => {
  await Promise.all([db.files.clear(), db.activity_log.clear(), db.settings.clear(), db.workspace.clear()])
})

describe('file CRUD (real IndexedDB via Dexie, real Blob storage)', () => {
  it('uploads a file and persists the exact blob content in the database', async () => {
    const created = await uploadFile(makeInput())
    const fromDb = await filesRepository.get(created.id)
    expect(fromDb).toBeDefined()
    expect(fromDb?.name).toBe('ملاحظات.txt')
    const text = await fromDb?.data.text()
    expect(text).toBe('hello world')
  })

  it('rejects uploading a file with an empty name', async () => {
    await expect(uploadFile(makeInput({ name: '' }))).rejects.toBeInstanceOf(ValidationFailedError)
  })

  it('updates file metadata without touching the stored blob', async () => {
    const created = await uploadFile(makeInput())
    await updateFileMeta(created.id, { description: 'وصف جديد', project_id: null, contact_id: null })
    const fromDb = await filesRepository.get(created.id)
    expect(fromDb?.description).toBe('وصف جديد')
    expect(await fromDb?.data.text()).toBe('hello world')
  })

  it('soft-deletes and restores a file (undo)', async () => {
    const created = await uploadFile(makeInput())
    await softDeleteFile(created.id)
    let fromDb = await filesRepository.get(created.id)
    expect(fromDb?.deleted_at).not.toBeNull()

    await restoreFile(created.id)
    fromDb = await filesRepository.get(created.id)
    expect(fromDb?.deleted_at).toBeNull()
  })

  it('permanently deletes a file', async () => {
    const created = await uploadFile(makeInput())
    await permanentlyDeleteFile(created.id)
    expect(await filesRepository.get(created.id)).toBeUndefined()
  })
})
