import type { ProjectInput, TaskInput } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function validateProjectInput(input: ProjectInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name.trim()) {
    errors.name = 'اسم المشروع مطلوب.'
  } else if (input.name.trim().length > 200) {
    errors.name = 'اسم المشروع طويل جدًا (الحد الأقصى 200 حرف).'
  }

  if (input.deadline) {
    const d = new Date(input.deadline)
    if (Number.isNaN(d.getTime())) {
      errors.deadline = 'تاريخ الاستحقاق غير صالح.'
    }
  }

  if (input.live_url && !isValidUrl(input.live_url)) {
    errors.live_url = 'رابط المنتج غير صالح — يجب أن يبدأ بـ http:// أو https://'
  }

  if (input.repository_url && !isValidUrl(input.repository_url)) {
    errors.repository_url = 'رابط المستودع غير صالح — يجب أن يبدأ بـ http:// أو https://'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

export function validateTaskInput(input: TaskInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.title.trim()) {
    errors.title = 'عنوان المهمة مطلوب.'
  } else if (input.title.trim().length > 300) {
    errors.title = 'عنوان المهمة طويل جدًا (الحد الأقصى 300 حرف).'
  }

  if (input.due_date) {
    const d = new Date(input.due_date)
    if (Number.isNaN(d.getTime())) {
      errors.due_date = 'تاريخ الاستحقاق غير صالح.'
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
