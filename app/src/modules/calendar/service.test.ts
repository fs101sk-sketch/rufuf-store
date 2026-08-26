import { describe, expect, it } from 'vitest'
import type { EventRow } from '../../core/db/schema'
import { eventsForDay, upcomingEvents } from './service'
import { validateEventInput } from './validation'

function makeEvent(overrides: Partial<EventRow> = {}): EventRow {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    title: 'اجتماع',
    description: '',
    start_at: now,
    end_at: null,
    all_day: false,
    location: '',
    project_id: null,
    contact_id: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  }
}

describe('validateEventInput', () => {
  it('rejects an empty title', () => {
    const result = validateEventInput({
      title: '  ',
      description: '',
      start_at: new Date().toISOString(),
      end_at: null,
      all_day: false,
      location: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.title).toBeDefined()
  })

  it('rejects a missing start_at', () => {
    const result = validateEventInput({
      title: 'حدث',
      description: '',
      start_at: '',
      end_at: null,
      all_day: false,
      location: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.start_at).toBeDefined()
  })

  it('rejects an end_at before start_at', () => {
    const start = new Date()
    const end = new Date(start.getTime() - 3600000)
    const result = validateEventInput({
      title: 'حدث',
      description: '',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      location: '',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.end_at).toBeDefined()
  })

  it('accepts a valid event', () => {
    const start = new Date()
    const end = new Date(start.getTime() + 3600000)
    const result = validateEventInput({
      title: 'اجتماع فريق',
      description: '',
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
      location: 'المكتب',
      project_id: null,
      contact_id: null,
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({})
  })
})

describe('eventsForDay', () => {
  it('returns only events starting on the given real day, sorted by time, excluding deleted', () => {
    const day = new Date(2026, 2, 15)
    const morning = makeEvent({ title: 'صباحي', start_at: new Date(2026, 2, 15, 9, 0).toISOString() })
    const evening = makeEvent({ title: 'مسائي', start_at: new Date(2026, 2, 15, 18, 0).toISOString() })
    const otherDay = makeEvent({ title: 'يوم آخر', start_at: new Date(2026, 2, 16, 9, 0).toISOString() })
    const deleted = makeEvent({
      title: 'محذوف',
      start_at: new Date(2026, 2, 15, 12, 0).toISOString(),
      deleted_at: new Date().toISOString(),
    })

    const result = eventsForDay([morning, evening, otherDay, deleted], day)
    expect(result.map((e) => e.title)).toEqual(['صباحي', 'مسائي'])
  })
})

describe('upcomingEvents', () => {
  it('returns only future, non-deleted events sorted chronologically, limited', () => {
    const past = makeEvent({ title: 'ماضٍ', start_at: new Date(Date.now() - 86400000).toISOString() })
    const soon = makeEvent({ title: 'قريب', start_at: new Date(Date.now() + 3600000).toISOString() })
    const later = makeEvent({ title: 'لاحقًا', start_at: new Date(Date.now() + 86400000).toISOString() })
    const deletedFuture = makeEvent({
      title: 'مستقبل محذوف',
      start_at: new Date(Date.now() + 1800000).toISOString(),
      deleted_at: new Date().toISOString(),
    })

    const result = upcomingEvents([past, soon, later, deletedFuture], 5)
    expect(result.map((e) => e.title)).toEqual(['قريب', 'لاحقًا'])
  })

  it('respects the limit', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent({ title: `#${i}`, start_at: new Date(Date.now() + (i + 1) * 3600000).toISOString() }),
    )
    expect(upcomingEvents(events, 3)).toHaveLength(3)
  })
})
