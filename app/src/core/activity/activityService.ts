import { db } from '../db/schema'
import type { ActivityAction, ActivityLogRow } from '../db/schema'
import { createId } from '../ids'
import { nowIso } from '../dates'

const ACTOR = 'user'

export async function logActivity(
  action: ActivityAction,
  entityType: ActivityLogRow['entity_type'],
  entityId: string,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  await db.activity_log.add({
    id: createId(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor: ACTOR,
    metadata,
    created_at: nowIso(),
  })
}

export interface ActivityQuery {
  entityType?: ActivityLogRow['entity_type']
  entityId?: string
  search?: string
  limit?: number
}

export async function listActivity(query: ActivityQuery = {}): Promise<ActivityLogRow[]> {
  let rows = await db.activity_log.orderBy('created_at').reverse().toArray()

  if (query.entityType) {
    rows = rows.filter((r) => r.entity_type === query.entityType)
  }
  if (query.entityId) {
    rows = rows.filter((r) => r.entity_id === query.entityId)
  }
  if (query.search) {
    const q = query.search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) => r.action.toLowerCase().includes(q) || r.entity_type.toLowerCase().includes(q),
      )
    }
  }
  if (query.limit) {
    rows = rows.slice(0, query.limit)
  }
  return rows
}
