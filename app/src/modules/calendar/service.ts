import { createId } from '../../core/ids'
import { isSameDay, nowIso, parseISOSafe } from '../../core/dates'
import { logActivity } from '../../core/activity/activityService'
import type { EventRow } from '../../core/db/schema'
import { eventsRepository } from './repository'
import { validateEventInput } from './validation'
import type { EventInput } from './types'

export class ValidationFailedError extends Error {
  errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationFailedError'
    this.errors = errors
  }
}

export async function createEvent(input: EventInput): Promise<EventRow> {
  const result = validateEventInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  const now = nowIso()
  const row: EventRow = {
    id: createId(),
    title: input.title.trim(),
    description: input.description.trim(),
    start_at: input.start_at,
    end_at: input.end_at,
    all_day: input.all_day,
    location: input.location.trim(),
    project_id: input.project_id,
    contact_id: input.contact_id,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  }
  await eventsRepository.create(row)
  await logActivity('event.created', 'event', row.id, { title: row.title })
  return row
}

export async function updateEvent(id: string, input: EventInput): Promise<void> {
  const result = validateEventInput(input)
  if (!result.valid) throw new ValidationFailedError(result.errors)

  await eventsRepository.update(id, {
    title: input.title.trim(),
    description: input.description.trim(),
    start_at: input.start_at,
    end_at: input.end_at,
    all_day: input.all_day,
    location: input.location.trim(),
    project_id: input.project_id,
    contact_id: input.contact_id,
    updated_at: nowIso(),
  })
  await logActivity('event.updated', 'event', id)
}

export async function softDeleteEvent(id: string): Promise<void> {
  await eventsRepository.update(id, { deleted_at: nowIso() })
  await logActivity('event.deleted', 'event', id)
}

export async function restoreEvent(id: string): Promise<void> {
  await eventsRepository.update(id, { deleted_at: null })
  await logActivity('event.restored', 'event', id)
}

export async function permanentlyDeleteEvent(id: string): Promise<void> {
  await eventsRepository.remove(id)
  await logActivity('event.deleted', 'event', id, { permanent: true })
}

export function eventsForDay(events: EventRow[], day: Date): EventRow[] {
  return events
    .filter((e) => !e.deleted_at)
    .filter((e) => {
      const start = parseISOSafe(e.start_at)
      return start ? isSameDay(start, day) : false
    })
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
}

export function upcomingEvents(events: EventRow[], limit = 5): EventRow[] {
  const now = nowIso()
  return events
    .filter((e) => !e.deleted_at && e.start_at >= now)
    .sort((a, b) => a.start_at.localeCompare(b.start_at))
    .slice(0, limit)
}
