import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/schema'
import {
  createTransaction,
  permanentlyDeleteTransaction,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction,
  ValidationFailedError,
} from './service'
import { transactionsRepository } from './repository'

const BASE_INPUT = {
  type: 'income' as const,
  amount: 4500,
  category: 'استشارات',
  description: 'دفعة أولى',
  date: new Date().toISOString(),
  project_id: null,
  contact_id: null,
}

beforeEach(async () => {
  await Promise.all([db.transactions.clear(), db.activity_log.clear(), db.settings.clear(), db.workspace.clear()])
})

describe('transaction CRUD (real IndexedDB via Dexie)', () => {
  it('creates a transaction and persists it in the database', async () => {
    const created = await createTransaction(BASE_INPUT)
    const fromDb = await transactionsRepository.get(created.id)
    expect(fromDb).toBeDefined()
    expect(fromDb?.amount).toBe(4500)
    expect(fromDb?.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects creating a transaction with a non-positive amount', async () => {
    await expect(createTransaction({ ...BASE_INPUT, amount: 0 })).rejects.toBeInstanceOf(ValidationFailedError)
  })

  it('updates a transaction', async () => {
    const created = await createTransaction(BASE_INPUT)
    await updateTransaction(created.id, { ...BASE_INPUT, amount: 9000, type: 'expense' })
    const fromDb = await transactionsRepository.get(created.id)
    expect(fromDb?.amount).toBe(9000)
    expect(fromDb?.type).toBe('expense')
  })

  it('soft-deletes and restores a transaction (undo)', async () => {
    const created = await createTransaction(BASE_INPUT)
    await softDeleteTransaction(created.id)
    let fromDb = await transactionsRepository.get(created.id)
    expect(fromDb?.deleted_at).not.toBeNull()

    await restoreTransaction(created.id)
    fromDb = await transactionsRepository.get(created.id)
    expect(fromDb?.deleted_at).toBeNull()
  })

  it('permanently deletes a transaction', async () => {
    const created = await createTransaction(BASE_INPUT)
    await permanentlyDeleteTransaction(created.id)
    expect(await transactionsRepository.get(created.id)).toBeUndefined()
  })
})
