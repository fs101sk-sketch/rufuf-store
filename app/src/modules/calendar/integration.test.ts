import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../core/db/schema'
import {
  createEvent,
  permanentlyDeleteEvent,
  restoreEvent,
  softDeleteEvent,
  updateEvent,
  ValidationFailedError,
} from './service'
import { eventsRepository } from './repository'

const BASE_INPUT = {
  title: 'اجتماع متابعة',
  description: '',
  start_at: new Date(Date.now() + 3600000).toISOString(),
  end_at: null,
  all_day: false,
  location: '',
  project_id: null,
  contact_id: null,
}

beforeEach(async () => {
  await Promise.all([db.events.clear(), db.activity_log.clear(), db.settings.clear(), db.workspace.clear()])
})

describe('event CRUD (real IndexedDB via Dexie)', () => {
  it('creates an event and persists it in the database', async () => {
    const created = await createEvent(BASE_INPUT)
    const fromDb = await eventsRepository.get(created.id)
    expect(fromDb).toBeDefined()
    expect(fromDb?.title).toBe('اجتماع متابعة')
    expect(fromDb?.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('rejects creating an event with an empty title', async () => {
    await expect(createEvent({ ...BASE_INPUT, title: '' })).rejects.toBeInstanceOf(ValidationFailedError)
  })

  it('updates an event', async () => {
    const created = await createEvent(BASE_INPUT)
    await updateEvent(created.id, { ...BASE_INPUT, title: 'عنوان جديد', location: 'عن بعد' })
    const fromDb = await eventsRepository.get(created.id)
    expect(fromDb?.title).toBe('عنوان جديد')
    expect(fromDb?.location).toBe('عن بعد')
  })

  it('soft-deletes and restores an event (undo)', async () => {
    const created = await createEvent(BASE_INPUT)
    await softDeleteEvent(created.id)
    let fromDb = await eventsRepository.get(created.id)
    expect(fromDb?.deleted_at).not.toBeNull()

    await restoreEvent(created.id)
    fromDb = await eventsRepository.get(created.id)
    expect(fromDb?.deleted_at).toBeNull()
  })

  it('permanently deletes an event', async () => {
    const created = await createEvent(BASE_INPUT)
    await permanentlyDeleteEvent(created.id)
    expect(await eventsRepository.get(created.id)).toBeUndefined()
  })
})
