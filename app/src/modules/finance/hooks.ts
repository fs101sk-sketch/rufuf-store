import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../core/db/schema'

export function useTransactions() {
  return useLiveQuery(() => db.transactions.toArray(), [])
}
