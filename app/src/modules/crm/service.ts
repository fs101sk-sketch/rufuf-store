import { createId } from '../../core/ids'
import { nowIso } from '../../core/dates'
import { logActivity } from '../../core/activity/activityService'
import type { ContactRow, DealRow, DealStage } from '../../core/db/schema'
import { contactsRepository, dealsRepository } from './repository'
import { validateContactInput, validateDealInput } from './validation'
import type { ContactFilters, ContactInput, ContactSort, DealInput } from './types'

export class ValidationFailedError extends Error {
  errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationFailedError'
    this.errors = errors
  }
}

// ---------- Contacts ----------

export async function createContact(input: ContactInput): Promise<ContactRow> {
  const result = validateContactInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: ContactRow = {
    id: createId(),
    name: input.name.trim(),
    company: input.company.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    type: input.type,
    notes: input.notes.trim(),
    favorite: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await contactsRepository.create(row)
  await logActivity('contact.created', 'contact', row.id, { name: row.name })
  return row
}

export async function updateContact(id: string, input: ContactInput): Promise<void> {
  const result = validateContactInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  await contactsRepository.update(id, {
    name: input.name.trim(),
    company: input.company.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    type: input.type,
    notes: input.notes.trim(),
    updated_at: nowIso(),
  })
  await logActivity('contact.updated', 'contact', id)
}

export async function toggleContactFavorite(id: string, favorite: boolean): Promise<void> {
  await contactsRepository.update(id, { favorite, updated_at: nowIso() })
  await logActivity('contact.updated', 'contact', id, { favorite })
}

export async function softDeleteContact(id: string): Promise<void> {
  await contactsRepository.update(id, { deleted_at: nowIso() })
  await logActivity('contact.deleted', 'contact', id)
}

export async function restoreContact(id: string): Promise<void> {
  await contactsRepository.update(id, { deleted_at: null })
  await logActivity('contact.restored', 'contact', id)
}

export async function permanentlyDeleteContact(id: string): Promise<void> {
  await contactsRepository.remove(id)
  await logActivity('contact.deleted', 'contact', id, { permanent: true })
}

export function filterAndSortContacts(
  contacts: ContactRow[],
  filters: ContactFilters,
  sort: ContactSort,
): ContactRow[] {
  let result = contacts.filter((c) => (filters.includeDeleted ? true : !c.deleted_at))

  if (filters.type !== 'all') {
    result = result.filter((c) => c.type === filters.type)
  }
  if (filters.favoriteOnly) {
    result = result.filter((c) => c.favorite)
  }
  if (filters.search.trim()) {
    const q = filters.search.trim().toLowerCase()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    )
  }

  const dir = sort.direction === 'asc' ? 1 : -1
  result = [...result].sort((a, b) => {
    switch (sort.field) {
      case 'name':
        return dir * a.name.localeCompare(b.name, 'ar')
      case 'created_at':
        return dir * a.created_at.localeCompare(b.created_at)
      case 'updated_at':
      default:
        return dir * a.updated_at.localeCompare(b.updated_at)
    }
  })

  return result
}

export interface CrmStats {
  totalContacts: number
  leads: number
  customers: number
  favorites: number
  openDeals: number
  pipelineValue: number
  wonDeals: number
  wonValue: number
}

export function computeCrmStats(contacts: ContactRow[], deals: DealRow[]): CrmStats {
  const liveContacts = contacts.filter((c) => !c.deleted_at)
  const liveDeals = deals.filter((d) => !d.deleted_at)
  const open = liveDeals.filter((d) => d.stage !== 'won' && d.stage !== 'lost')
  const won = liveDeals.filter((d) => d.stage === 'won')

  return {
    totalContacts: liveContacts.length,
    leads: liveContacts.filter((c) => c.type === 'lead').length,
    customers: liveContacts.filter((c) => c.type === 'customer').length,
    favorites: liveContacts.filter((c) => c.favorite).length,
    openDeals: open.length,
    pipelineValue: open.reduce((sum, d) => sum + d.value, 0),
    wonDeals: won.length,
    wonValue: won.reduce((sum, d) => sum + d.value, 0),
  }
}

// ---------- Deals ----------

export async function createDeal(contactId: string, input: DealInput): Promise<DealRow> {
  const result = validateDealInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: DealRow = {
    id: createId(),
    contact_id: contactId,
    title: input.title.trim(),
    value: input.value,
    stage: input.stage,
    expected_close_date: input.expected_close_date,
    notes: input.notes.trim(),
    created_at: now,
    updated_at: now,
    closed_at: input.stage === 'won' || input.stage === 'lost' ? now : null,
    deleted_at: null,
  }
  await dealsRepository.create(row)
  await logActivity('deal.created', 'deal', row.id, { contact_id: contactId, title: row.title })
  return row
}

export async function updateDeal(id: string, input: DealInput): Promise<void> {
  const result = validateDealInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const existing = await dealsRepository.get(id)
  const wasClosed = existing?.stage === 'won' || existing?.stage === 'lost'
  const nowClosed = input.stage === 'won' || input.stage === 'lost'

  await dealsRepository.update(id, {
    title: input.title.trim(),
    value: input.value,
    stage: input.stage,
    expected_close_date: input.expected_close_date,
    notes: input.notes.trim(),
    closed_at: nowClosed ? (wasClosed ? (existing?.closed_at ?? nowIso()) : nowIso()) : null,
    updated_at: nowIso(),
  })
  await logActivity('deal.updated', 'deal', id)
}

export async function changeDealStage(id: string, stage: DealStage): Promise<void> {
  const now = nowIso()
  await dealsRepository.update(id, {
    stage,
    closed_at: stage === 'won' || stage === 'lost' ? now : null,
    updated_at: now,
  })
  await logActivity('deal.stage_changed', 'deal', id, { stage })
}

export async function softDeleteDeal(id: string): Promise<void> {
  await dealsRepository.update(id, { deleted_at: nowIso() })
  await logActivity('deal.deleted', 'deal', id)
}

export async function restoreDeal(id: string): Promise<void> {
  await dealsRepository.update(id, { deleted_at: null })
  await logActivity('deal.restored', 'deal', id)
}
