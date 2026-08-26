import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/schema'

export function useEvents() {
  return useLiveQuery(() => db.events.toArray(), [])
}
