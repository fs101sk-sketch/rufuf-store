import { db } from '../../core/db/schema'
import type { TransactionRow } from '../../core/db/schema'

export const transactionsRepository = {
  async list(): Promise<TransactionRow[]> {
    return db.transactions.toArray()
  },
  async get(id: string): Promise<TransactionRow | undefined> {
    return db.transactions.get(id)
  },
  async create(row: TransactionRow): Promise<void> {
    await db.transactions.add(row)
  },
  async update(id: string, patch: Partial<TransactionRow>): Promise<void> {
    await db.transactions.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.transactions.delete(id)
  },
}
