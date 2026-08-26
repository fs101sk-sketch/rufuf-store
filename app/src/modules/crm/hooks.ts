import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/schema'

/** Reactive read of every contact row; undefined while the first query resolves. */
export function useContacts() {
  return useLiveQuery(() => db.contacts.toArray(), [])
}

export function useAllDeals() {
  return useLiveQuery(() => db.deals.toArray(), [])
}

export function useContact(id: string | undefined) {
  return useLiveQuery(() => (id ? db.contacts.get(id) : undefined), [id])
}

export function useContactDeals(contactId: string | undefined) {
  return useLiveQuery(
    () => (contactId ? db.deals.where('contact_id').equals(contactId).toArray() : []),
    [contactId],
  )
}

export function useCrmActivityForEntity(entityId: string | undefined) {
  return useLiveQuery(
    () =>
      entityId
        ? db.activity_log.where('entity_id').equals(entityId).reverse().sortBy('created_at')
        : [],
    [entityId],
  )
}
