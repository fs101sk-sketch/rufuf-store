import { describe, expect, it } from 'vitest'
import type { ContactRow, DealRow } from '../../core/db/schema'
import { computeCrmStats, filterAndSortContacts } from './service'
import { validateContactInput, validateDealInput } from './validation'
import { DEFAULT_CONTACT_FILTERS, DEFAULT_CONTACT_SORT } from './types'

function makeContact(overrides: Partial<ContactRow> = {}): ContactRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    name: 'جهة اتصال تجريبية',
    company: '',
    email: '',
    phone: '',
    type: 'lead',
    notes: '',
    favorite: false,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

function makeDeal(overrides: Partial<DealRow> = {}): DealRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    contact_id: crypto.randomUUID(),
    title: 'صفقة',
    value: 1000,
    stage: 'new',
    expected_close_date: null,
    notes: '',
    created_at: now,
    updated_at: now,
    closed_at: null,
    deleted_at: null,
    ...overrides,
  }
}

describe('validateContactInput', () => {
  it('rejects an empty name', () => {
    const result = validateContactInput({ name: '  ', company: '', email: '', phone: '', type: 'lead', notes: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.name).toBeDefined()
  })

  it('rejects an invalid email', () => {
    const result = validateContactInput({
      name: 'أحمد',
      company: '',
      email: 'not-an-email',
      phone: '',
      type: 'lead',
      notes: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.email).toBeDefined()
  })

  it('accepts a valid contact with an empty (optional) email', () => {
    const result = validateContactInput({ name: 'أحمد', company: 'شركة', email: '', phone: '', type: 'customer', notes: '' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

describe('validateDealInput', () => {
  it('rejects an empty title', () => {
    const result = validateDealInput({ title: '', value: 100, stage: 'new', expected_close_date: null, notes: '' })
    expect(result.valid).toBe(false)
  })

  it('rejects a negative value', () => {
    const result = validateDealInput({ title: 'صفقة', value: -50, stage: 'new', expected_close_date: null, notes: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.value).toBeDefined()
  })

  it('rejects an invalid expected_close_date', () => {
    const result = validateDealInput({
      title: 'صفقة',
      value: 100,
      stage: 'new',
      expected_close_date: 'not-a-date',
      notes: '',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.expected_close_date).toBeDefined()
  })

  it('accepts a valid deal', () => {
    const result = validateDealInput({
      title: 'صفقة صالحة',
      value: 5000,
      stage: 'negotiation',
      expected_close_date: new Date().toISOString(),
      notes: '',
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

describe('filterAndSortContacts', () => {
  const lead = makeContact({ name: 'ب - محتمل', type: 'lead', favorite: true })
  const customer = makeContact({ name: 'أ - عميل', type: 'customer', company: 'شركة النور' })
  const deleted = makeContact({ name: 'محذوف', deleted_at: new Date().toISOString() })
  const all = [lead, customer, deleted]

  it('excludes soft-deleted contacts by default', () => {
    const result = filterAndSortContacts(all, DEFAULT_CONTACT_FILTERS, DEFAULT_CONTACT_SORT)
    expect(result.some((c) => c.id === deleted.id)).toBe(false)
  })

  it('includes soft-deleted contacts when includeDeleted is set', () => {
    const result = filterAndSortContacts(all, { ...DEFAULT_CONTACT_FILTERS, includeDeleted: true }, DEFAULT_CONTACT_SORT)
    expect(result.some((c) => c.id === deleted.id)).toBe(true)
  })

  it('filters by type', () => {
    const result = filterAndSortContacts(all, { ...DEFAULT_CONTACT_FILTERS, type: 'customer' }, DEFAULT_CONTACT_SORT)
    expect(result.map((c) => c.id)).toEqual([customer.id])
  })

  it('filters by favoriteOnly', () => {
    const result = filterAndSortContacts(all, { ...DEFAULT_CONTACT_FILTERS, favoriteOnly: true }, DEFAULT_CONTACT_SORT)
    expect(result.map((c) => c.id)).toEqual([lead.id])
  })

  it('sorts by name ascending using Arabic collation', () => {
    const result = filterAndSortContacts(all, DEFAULT_CONTACT_FILTERS, { field: 'name', direction: 'asc' })
    expect(result.map((c) => c.name)).toEqual(['أ - عميل', 'ب - محتمل'])
  })

  it('searches across name, company, email and phone', () => {
    const result = filterAndSortContacts(all, { ...DEFAULT_CONTACT_FILTERS, search: 'النور' }, DEFAULT_CONTACT_SORT)
    expect(result.map((c) => c.id)).toEqual([customer.id])
  })
})

describe('computeCrmStats', () => {
  it('computes real aggregate counts and pipeline value, not hardcoded numbers', () => {
    const contacts = [
      makeContact({ type: 'lead' }),
      makeContact({ type: 'customer', favorite: true }),
      makeContact({ type: 'customer' }),
    ]
    const deals = [
      makeDeal({ contact_id: contacts[0]!.id, stage: 'new', value: 1000 }),
      makeDeal({ contact_id: contacts[0]!.id, stage: 'negotiation', value: 2000 }),
      makeDeal({ contact_id: contacts[1]!.id, stage: 'won', value: 5000 }),
      makeDeal({ contact_id: contacts[1]!.id, stage: 'lost', value: 3000 }),
      makeDeal({ contact_id: contacts[1]!.id, stage: 'new', value: 500, deleted_at: new Date().toISOString() }),
    ]
    const stats = computeCrmStats(contacts, deals)
    expect(stats.totalContacts).toBe(3)
    expect(stats.leads).toBe(1)
    expect(stats.customers).toBe(2)
    expect(stats.favorites).toBe(1)
    expect(stats.openDeals).toBe(2)
    expect(stats.pipelineValue).toBe(3000)
    expect(stats.wonDeals).toBe(1)
    expect(stats.wonValue).toBe(5000)
  })
})
