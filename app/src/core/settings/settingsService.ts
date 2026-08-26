import { db } from '../db/schema'
import { nowIso } from '../dates'
import { logActivity } from '../activity/activityService'

const DEFAULT_SCOPE = 'global'

export async function getSetting<T>(key: string, fallback: T, scope = DEFAULT_SCOPE): Promise<T> {
  const row = await db.settings.get(key)
  if (!row || row.scope !== scope) return fallback
  return row.value as T
}

export async function setSetting<T>(key: string, value: T, scope = DEFAULT_SCOPE): Promise<void> {
  await db.settings.put({ key, value, scope, updated_at: nowIso() })
  await logActivity('settings.updated', 'settings', key, { scope })
}

export type ThemePreference = 'light' | 'dark' | 'system'
export const THEME_KEY = 'ui.theme'

export type ProjectsViewPreference = 'grid' | 'list'
export const PROJECTS_VIEW_KEY = 'projects.view'
