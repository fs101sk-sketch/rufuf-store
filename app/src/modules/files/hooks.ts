import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/schema'

export function useFiles() {
  return useLiveQuery(() => db.files.toArray(), [])
}
