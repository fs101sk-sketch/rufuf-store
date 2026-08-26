import { db } from '../../core/db/schema'
import type { FileRow } from '../../core/db/schema'

export const filesRepository = {
  async list(): Promise<FileRow[]> {
    return db.files.toArray()
  },
  async get(id: string): Promise<FileRow | undefined> {
    return db.files.get(id)
  },
  async create(row: FileRow): Promise<void> {
    await db.files.add(row)
  },
  async update(id: string, patch: Partial<FileRow>): Promise<void> {
    await db.files.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.files.delete(id)
  },
}
