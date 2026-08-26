import { db } from '../db/schema'
import type { ActivityAction, ActivityLogRow } from '../db/schema'
import { createId } from '../ids'
import { nowIso } from '../dates'

const ACTOR = 'user'

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  'project.created': 'تم إنشاء مشروع',
  'project.updated': 'تم تحديث مشروع',
  'project.deleted': 'تم حذف مشروع',
  'project.restored': 'تمت استعادة مشروع',
  'project.duplicated': 'تم تكرار مشروع',
  'task.created': 'تمت إضافة مهمة',
  'task.updated': 'تم تحديث مهمة',
  'task.deleted': 'تم حذف مهمة',
  'task.restored': 'تمت استعادة مهمة',
  'task.completed': 'تم إكمال مهمة',
  'task.reopened': 'تمت إعادة فتح مهمة',
  'contact.created': 'تم إنشاء جهة اتصال',
  'contact.updated': 'تم تحديث جهة اتصال',
  'contact.deleted': 'تم حذف جهة اتصال',
  'contact.restored': 'تمت استعادة جهة اتصال',
  'deal.created': 'تمت إضافة صفقة',
  'deal.updated': 'تم تحديث صفقة',
  'deal.deleted': 'تم حذف صفقة',
  'deal.restored': 'تمت استعادة صفقة',
  'deal.stage_changed': 'تغيّرت مرحلة صفقة',
  'transaction.created': 'تمت إضافة حركة مالية',
  'transaction.updated': 'تم تحديث حركة مالية',
  'transaction.deleted': 'تم حذف حركة مالية',
  'transaction.restored': 'تمت استعادة حركة مالية',
  'event.created': 'تمت إضافة حدث',
  'event.updated': 'تم تحديث حدث',
  'event.deleted': 'تم حذف حدث',
  'event.restored': 'تمت استعادة حدث',
  'file.created': 'تم رفع ملف',
  'file.updated': 'تم تحديث بيانات ملف',
  'file.deleted': 'تم حذف ملف',
  'file.restored': 'تمت استعادة ملف',
  'settings.updated': 'تم تحديث الإعدادات',
  'backup.exported': 'تم تصدير نسخة احتياطية',
  'backup.imported': 'تم استيراد نسخة احتياطية',
}

export async function logActivity(
  action: ActivityAction,
  entityType: ActivityLogRow['entity_type'],
  entityId: string,
  metadata: Record<string, unknown> | null = null,
): Promise<void> {
  await db.activity_log.add({
    id: createId(),
    action,
    entity_type: entityType,
    entity_id: entityId,
    actor: ACTOR,
    metadata,
    created_at: nowIso(),
  })
}

export interface ActivityQuery {
  entityType?: ActivityLogRow['entity_type']
  entityId?: string
  search?: string
  limit?: number
}

export async function listActivity(query: ActivityQuery = {}): Promise<ActivityLogRow[]> {
  let rows = await db.activity_log.orderBy('created_at').reverse().toArray()

  if (query.entityType) {
    rows = rows.filter((r) => r.entity_type === query.entityType)
  }
  if (query.entityId) {
    rows = rows.filter((r) => r.entity_id === query.entityId)
  }
  if (query.search) {
    const q = query.search.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        (r) => r.action.toLowerCase().includes(q) || r.entity_type.toLowerCase().includes(q),
      )
    }
  }
  if (query.limit) {
    rows = rows.slice(0, query.limit)
  }
  return rows
}
