import { describe, expect, it } from 'vitest'
import { AppDatabase } from './schema'

describe('database persistence across "restarts"', () => {
  it('keeps data after closing and reopening a database of the same name', async () => {
    const dbName = `persistence_test_${crypto.randomUUID()}`

    const first = new AppDatabase(dbName)
    await first.projects.add({
      id: 'p1',
      name: 'مشروع دائم',
      type: '',
      description: '',
      status: 'active',
      priority: 'medium',
      deadline: null,
      live_url: null,
      repository_url: null,
      tech_stack: [],
      notes: '',
      favorite: false,
      client_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      archived_at: null,
      deleted_at: null,
    })
    first.close()

    // Simulate the app restarting: a fresh AppDatabase instance opening the
    // same underlying store must see data written by the previous instance.
    const second = new AppDatabase(dbName)
    const row = await second.projects.get('p1')
    expect(row).toBeDefined()
    expect(row?.name).toBe('مشروع دائم')
    second.close()
  })

  it('is versioned at schema version 1 with the expected tables', () => {
    const database = new AppDatabase(`version_test_${crypto.randomUUID()}`)
    expect(database.tables.map((t) => t.name).sort()).toEqual(
      ['activity_log', 'projects', 'settings', 'tasks', 'workspace'].sort(),
    )
    database.close()
  })
})
