import { format, formatDistanceToNow, isPast, isToday, isWithinInterval, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

export function nowIso(): string {
  return new Date().toISOString()
}

export function toIsoOrNull(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return format(parseISO(iso), 'd MMMM yyyy', { locale: ar })
}

export function formatDateShort(iso: string | null): string {
  if (!iso) return '—'
  return format(parseISO(iso), 'yyyy/MM/dd')
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'd MMMM yyyy، HH:mm', { locale: ar })
}

export function formatRelative(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: ar })
}

export function isOverdue(iso: string | null): boolean {
  if (!iso) return false
  return isPast(parseISO(iso)) && !isToday(parseISO(iso))
}

export function isDueToday(iso: string | null): boolean {
  if (!iso) return false
  return isToday(parseISO(iso))
}

export function isUpcoming(iso: string | null, withinDays = 7): boolean {
  if (!iso) return false
  const date = parseISO(iso)
  const now = new Date()
  const end = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
  return isWithinInterval(date, { start: now, end }) || isToday(date)
}
