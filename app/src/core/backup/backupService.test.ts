/**
 * Runs under the `node` test environment: see the comment in
 * ../../modules/files/integration.test.ts for why the Blob round-trip test
 * here needs Node's Blob global instead of jsdom's to exercise real
 * structured-clone behavior through fake-indexeddb.
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/schema'
import { buildBackup, importBackup, parseBackup } from './backupService'

beforeEach(async () => {
  await Promise.all([
    db.files.clear(),
    db.projects.clear(),
    db.tasks.clear(),
    db.activity_log.clear(),
    db.settings.clear(),
    db.workspace.clear(),
  ])
})

describe('backup file round-trip (real Blob <-> base64 conversion)', () => {
  it('exports a file as base64 and re-imports it back to an identical Blob', async () => {
    const originalText = 'محتوى ملف حقيقي للاختبار'
    const blob = new Blob([originalText], { type: 'text/plain' })
    await db.files.add({
      id: 'f1',
      name: 'test.txt',
      mime_type: 'text/plain',
      size: blob.size,
      description: '',
      project_id: null,
      contact_id: null,
      data: blob,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })

    const backup = await buildBackup()
    expect(backup.files).toHaveLength(1)
    expect(backup.files[0]?.dataBase64).toEqual(expect.any(String))
    expect(backup.files[0]?.dataBase64.length).toBeGreaterThan(0)

    // Simulate re-importing into a cleared database (as JSON.parse(JSON.stringify(...)) would produce).
    const serialized = JSON.parse(JSON.stringify(backup))
    await db.files.clear()
    await importBackup(serialized)

    const restored = await db.files.get('f1')
    expect(restored).toBeDefined()
    expect(await restored?.data.text()).toBe(originalText)
    expect(restored?.mime_type).toBe('text/plain')
  })

  it('parseBackup defaults files to an empty array for backups older than the Files module', () => {
    const oldBackup = {
      app: 'business-os',
      version: 3,
      exportedAt: new Date().toISOString(),
      workspace: [],
      settings: [],
      projects: [],
      tasks: [],
      contacts: [],
      deals: [],
      transactions: [],
      events: [],
      // no `files` key at all
    }
    const result = parseBackup(oldBackup)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.data.files).toEqual([])
      expect(result.summary.files).toBe(0)
    }
  })
})
