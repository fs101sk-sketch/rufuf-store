import { db } from '../../core/db/schema'
import type { ContactRow, DealRow } from '../../core/db/schema'

export const contactsRepository = {
  async list(): Promise<ContactRow[]> {
    return db.contacts.toArray()
  },
  async get(id: string): Promise<ContactRow | undefined> {
    return db.contacts.get(id)
  },
  async create(row: ContactRow): Promise<void> {
    await db.contacts.add(row)
  },
  async update(id: string, patch: Partial<ContactRow>): Promise<void> {
    await db.contacts.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.transaction('rw', db.contacts, db.deals, async () => {
      await db.contacts.delete(id)
      await db.deals.where('contact_id').equals(id).delete()
    })
  },
}

export const dealsRepository = {
  async listByContact(contactId: string): Promise<DealRow[]> {
    return db.deals.where('contact_id').equals(contactId).toArray()
  },
  async listAll(): Promise<DealRow[]> {
    return db.deals.toArray()
  },
  async get(id: string): Promise<DealRow | undefined> {
    return db.deals.get(id)
  },
  async create(row: DealRow): Promise<void> {
    await db.deals.add(row)
  },
  async update(id: string, patch: Partial<DealRow>): Promise<void> {
    await db.deals.update(id, patch)
  },
  async remove(id: string): Promise<void> {
    await db.deals.delete(id)
  },
}
