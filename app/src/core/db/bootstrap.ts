import { db } from './schema'
import { createId } from '../ids'
import { nowIso } from '../dates'

const WORKSPACE_ID = 'default'

/**
 * Ensures a single Workspace row exists. Runs on app start; React 18/19
 * StrictMode invokes effects twice in development, so the check-then-add
 * must happen inside one transaction — Dexie serializes 'rw' transactions
 * on the same table, so the second invocation's read sees the first
 * invocation's write and safely no-ops instead of racing a duplicate insert.
 */
export async function ensureWorkspace(): Promise<void> {
  await db.transaction('rw', db.workspace, async () => {
    const existing = await db.workspace.get(WORKSPACE_ID)
    if (existing) return
    const now = nowIso()
    await db.workspace.add({
      id: WORKSPACE_ID,
      name: 'مساحة العمل',
      created_at: now,
      updated_at: now,
    })
  })
}

export function newId(): string {
  return createId()
}

export { WORKSPACE_ID }
