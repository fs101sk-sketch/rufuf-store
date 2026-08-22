import { beforeEach, describe, expect, it } from 'vitest'
import { AppDatabase, db } from './schema'
import { ensureWorkspace } from './bootstrap'

beforeEach(async () => {
  await db.workspace.clear()
})

// React 18/19 StrictMode invokes effects twice in development, so
// ensureWorkspace() can genuinely run twice concurrently on startup.
// Regression test for a ConstraintError this used to throw in that case.
describe('ensureWorkspace', () => {
  it('is safe to call concurrently without throwing a duplicate-key error', async () => {
    await expect(Promise.all([ensureWorkspace(), ensureWorkspace()])).resolves.toBeDefined()

    const rows = await db.workspace.toArray()
    expect(rows).toHaveLength(1)
  })

  it('does not overwrite an existing workspace row on a later call', async () => {
    await ensureWorkspace()
    const first = await db.workspace.get('default')

    await ensureWorkspace()
    const second = await db.workspace.get('default')

    expect(second?.created_at).toBe(first?.created_at)
  })
})

describe('AppDatabase isolation', () => {
  it('separately named databases do not share data', async () => {
    const a = new AppDatabase(`iso_a_${crypto.randomUUID()}`)
    const b = new AppDatabase(`iso_b_${crypto.randomUUID()}`)
    await a.workspace.add({ id: 'x', name: 'A', created_at: '', updated_at: '' })
    expect(await b.workspace.get('x')).toBeUndefined()
    a.close()
    b.close()
  })
})
