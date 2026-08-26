export function formatCurrency(value: number): string {
  return `${value.toLocaleString('ar')} ر.س`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`
}
