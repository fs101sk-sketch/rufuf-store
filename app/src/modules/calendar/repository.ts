import { db } from '../../core/db/schema'
import type { EventRow } from '../../core/db/schema'

export const eventsRepository = {
  async list(): Promise<EventRow[]> {
    return db.events.toArray()
  },
  async get(id: string): Promise<EventRow | undefined> {
    return db.events.get(id)
  },
  async create(row: EventRow): Promise<void> {
    await db.events.add(row)
  },
  async update(id: string, patch: Partial<EventRow>): Promise<void> {
    await db.events.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.events.delete(id)
  },
}
