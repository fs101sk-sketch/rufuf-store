import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/schema'
import {
  changeDealStage,
  createContact,
  createDeal,
  permanentlyDeleteContact,
  restoreContact,
  softDeleteContact,
  softDeleteDeal,
  toggleContactFavorite,
  updateContact,
  updateDeal,
  ValidationFailedError,
} from './service'
import { contactsRepository, dealsRepository } from './repository'

const BASE_CONTACT_INPUT = {
  name: 'شركة الأفق للتقنية',
  company: 'الأفق',
  email: 'contact@example.com',
  phone: '0501234567',
  type: 'lead' as const,
  notes: '',
}

const BASE_DEAL_INPUT = {
  title: 'اشتراك سنوي',
  value: 12000,
  stage: 'new' as const,
  expected_close_date: null,
  notes: '',
}

beforeEach(async () => {
  await Promise.all([
    db.contacts.clear(),
    db.deals.clear(),
    db.activity_log.clear(),
    db.settings.clear(),
    db.workspace.clear(),
  ])
})

describe('contact CRUD (real IndexedDB via Dexie)', () => {
  it('creates a contact and persists it in the database', async () => {
    const created = await createContact(BASE_CONTACT_INPUT)
    const fromDb = await contactsRepository.get(created.id)
    expect(fromDb).toBeDefined()
    expect(fromDb?.name).toBe('شركة الأفق للتقنية')
    expect(fromDb?.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects creating a contact with an empty name', async () => {
    await expect(createContact({ ...BASE_CONTACT_INPUT, name: '' })).rejects.toBeInstanceOf(ValidationFailedError)
  })

  it('updates a contact', async () => {
    const created = await createContact(BASE_CONTACT_INPUT)
    await updateContact(created.id, { ...BASE_CONTACT_INPUT, name: 'اسم جديد', type: 'customer' })
    const fromDb = await contactsRepository.get(created.id)
    expect(fromDb?.name).toBe('اسم جديد')
    expect(fromDb?.type).toBe('customer')
  })

  it('toggles favorite', async () => {
    const created = await createContact(BASE_CONTACT_INPUT)
    await toggleContactFavorite(created.id, true)
    expect((await contactsRepository.get(created.id))?.favorite).toBe(true)
  })

  it('soft-deletes and restores a contact (undo)', async () => {
    const created = await createContact(BASE_CONTACT_INPUT)
    await softDeleteContact(created.id)
    let fromDb = await contactsRepository.get(created.id)
    expect(fromDb?.deleted_at).not.toBeNull()

    await restoreContact(created.id)
    fromDb = await contactsRepository.get(created.id)
    expect(fromDb?.deleted_at).toBeNull()
  })

  it('permanently deletes a contact and cascades to its deals', async () => {
    const created = await createContact(BASE_CONTACT_INPUT)
    await createDeal(created.id, BASE_DEAL_INPUT)
    expect(await dealsRepository.listByContact(created.id)).toHaveLength(1)

    await permanentlyDeleteContact(created.id)

    expect(await contactsRepository.get(created.id)).toBeUndefined()
    expect(await dealsRepository.listByContact(created.id)).toHaveLength(0)
  })
})

describe('deal lifecycle', () => {
  it('creating a deal already in a closed stage sets closed_at', async () => {
    const contact = await createContact(BASE_CONTACT_INPUT)
    const deal = await createDeal(contact.id, { ...BASE_DEAL_INPUT, stage: 'won' })
    expect(deal.closed_at).not.toBeNull()
  })

  it('changing stage to won/lost sets closed_at, and back to open clears it', async () => {
    const contact = await createContact(BASE_CONTACT_INPUT)
    const deal = await createDeal(contact.id, BASE_DEAL_INPUT)
    expect((await dealsRepository.get(deal.id))?.closed_at).toBeNull()

    await changeDealStage(deal.id, 'won')
    expect((await dealsRepository.get(deal.id))?.closed_at).not.toBeNull()

    await changeDealStage(deal.id, 'negotiation')
    expect((await dealsRepository.get(deal.id))?.closed_at).toBeNull()
  })

  it('updateDeal preserves the original closed_at when staying in a closed stage', async () => {
    const contact = await createContact(BASE_CONTACT_INPUT)
    const deal = await createDeal(contact.id, { ...BASE_DEAL_INPUT, stage: 'won' })
    const firstClosedAt = (await dealsRepository.get(deal.id))?.closed_at

    await updateDeal(deal.id, { ...BASE_DEAL_INPUT, stage: 'won', value: 15000 })
    const fromDb = await dealsRepository.get(deal.id)
    expect(fromDb?.closed_at).toBe(firstClosedAt)
    expect(fromDb?.value).toBe(15000)
  })

  it('rejects creating a deal with an empty title', async () => {
    const contact = await createContact(BASE_CONTACT_INPUT)
    await expect(createDeal(contact.id, { ...BASE_DEAL_INPUT, title: '' })).rejects.toBeInstanceOf(
      ValidationFailedError,
    )
  })

  it('soft-deletes a deal without touching its contact', async () => {
    const contact = await createContact(BASE_CONTACT_INPUT)
    const deal = await createDeal(contact.id, BASE_DEAL_INPUT)
    await softDeleteDeal(deal.id)

    expect((await dealsRepository.get(deal.id))?.deleted_at).not.toBeNull()
    expect((await contactsRepository.get(contact.id))?.deleted_at).toBeNull()
  })
})
