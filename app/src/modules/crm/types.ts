import type { ContactRow, ContactType, DealRow, DealStage } from '../../core/db/schema'

export type { ContactRow, ContactType, DealRow, DealStage }

export interface ContactInput {
  name: string
  company: string
  email: string
  phone: string
  type: ContactType
  notes: string
}

export interface DealInput {
  title: string
  value: number
  stage: DealStage
  expected_close_date: string | null
  notes: string
}

export interface ContactFilters {
  search: string
  type: ContactType | 'all'
  favoriteOnly: boolean
  includeDeleted: boolean
}

export type ContactSortField = 'name' | 'created_at' | 'updated_at'
export type SortDirection = 'asc' | 'desc'

export interface ContactSort {
  field: ContactSortField
  direction: SortDirection
}

export const DEFAULT_CONTACT_FILTERS: ContactFilters = {
  search: '',
  type: 'all',
  favoriteOnly: false,
  includeDeleted: false,
}

export const DEFAULT_CONTACT_SORT: ContactSort = { field: 'updated_at', direction: 'desc' }

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  lead: 'عميل محتمل',
  customer: 'عميل',
}

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  new: 'جديدة',
  contacted: 'تم التواصل',
  proposal: 'عرض مقدَّم',
  negotiation: 'تفاوض',
  won: 'مربوحة',
  lost: 'خاسرة',
}

export const DEAL_STAGE_ORDER: DealStage[] = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost']
