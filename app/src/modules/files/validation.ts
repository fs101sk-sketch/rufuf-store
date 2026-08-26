import { MAX_FILE_SIZE } from './types'
import type { FileUploadInput } from './types'

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

export function validateFileUpload(input: FileUploadInput): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name.trim()) {
    errors.name = 'اسم الملف مطلوب.'
  } else if (input.name.trim().length > 200) {
    errors.name = 'اسم الملف طويل جدًا (الحد الأقصى 200 حرف).'
  }

  if (input.size <= 0) {
    errors.data = 'الملف فارغ.'
  } else if (input.size > MAX_FILE_SIZE) {
    errors.data = `حجم الملف يتجاوز الحد الأقصى المسموح (${Math.round(MAX_FILE_SIZE / (1024 * 1024))} ميغابايت).`
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
