import type { EventRow } from '../../core/db/schema'

export type { EventRow }

export interface EventInput {
  title: string
  description: string
  start_at: string
  end_at: string | null
  all_day: boolean
  location: string
  project_id: string | null
  contact_id: string | null
}
