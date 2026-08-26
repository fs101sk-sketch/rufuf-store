import { useRef, useState } from 'react'
import { useTheme } from '../../core/settings/useTheme'
import { buildBackup, importBackup, parseBackup } from '../../core/backup/backupService'
import { useToastStore } from '../../core/ui/toastStore'
import { confirmAction } from '../../core/ui/confirmStore'
import { plannedModules } from '../../core/modules'
import type { ThemePreference } from '../../core/settings/settingsService'

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'حسب النظام' },
  { value: 'light', label: 'فاتح' },
  { value: 'dark', label: 'داكن' },
]

export function SettingsPage() {
  const { theme, setTheme, loaded } = useTheme()
  const [exporting, setExporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pushToast = useToastStore((s) => s.push)

  async function handleExport() {
    setExporting(true)
    try {
      const backup = await buildBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `business-os-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      pushToast({ message: 'تم تصدير النسخة الاحتياطية.' })
    } finally {
      setExporting(false)
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportError(null)

    let raw: unknown
    try {
      raw = JSON.parse(await file.text())
    } catch {
      setImportError('تعذر قراءة الملف — تأكد أنه ملف JSON صالح.')
      return
    }

    const parsed = parseBackup(raw)
    if ('error' in parsed) {
      setImportError(parsed.error.message)
      return
    }

    const ok = await confirmAction({
      title: 'استيراد نسخة احتياطية',
      description: `سيتم استيراد ${parsed.summary.projects} مشروع و${parsed.summary.tasks} مهمة و${parsed.summary.contacts} جهة اتصال و${parsed.summary.deals} صفقة و${parsed.summary.transactions} حركة مالية و${parsed.summary.events} حدث و${parsed.summary.files} ملف (تصدير بتاريخ ${new Date(parsed.summary.exportedAt).toLocaleDateString('ar')}). البيانات ذات المعرّفات المطابقة سيتم استبدالها، والبقية ستُضاف. هل تريد المتابعة؟`,
      confirmLabel: 'استيراد',
    })
    if (!ok) return

    const summary = await importBackup(parsed.data)
    pushToast({
      message: `تم استيراد ${summary.projects} مشروع و${summary.tasks} مهمة و${summary.contacts} جهة اتصال و${summary.deals} صفقة و${summary.transactions} حركة مالية و${summary.events} حدث و${summary.files} ملف.`,
    })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>الإعدادات</h1>
          <p className="page-subtitle">تفضيلات التطبيق والنسخ الاحتياطي.</p>
        </div>
      </header>

      <div className="detail-card">
        <h3>المظهر</h3>
        <div className="theme-options">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={'btn btn-ghost' + (loaded && theme === opt.value ? ' active' : '')}
              onClick={() => setTheme(opt.value)}
              aria-pressed={theme === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="detail-card">
        <h3>النسخ الاحتياطي</h3>
        <p>تصدير جميع بياناتك (المشاريع والمهام والعملاء والصفقات والحركات المالية والأحداث والملفات والإعدادات) إلى ملف JSON، أو استيراد نسخة سابقة.</p>
        <div className="backup-actions">
          <button type="button" className="btn btn-primary" onClick={handleExport} disabled={exporting}>
            {exporting ? 'جارٍ التصدير…' : 'تصدير نسخة احتياطية'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
            استيراد نسخة احتياطية
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="visually-hidden"
            onChange={handleImportFile}
          />
        </div>
        {importError && <p className="form-error">{importError}</p>}
      </div>

      <div className="detail-card">
        <h3>خارطة الطريق</h3>
        <p>الوحدات التالية غير مبنية بعد ولن تظهر في الشريط الجانبي حتى يتم تنفيذها فعليًا:</p>
        <ul className="roadmap-list">
          {plannedModules.map((m) => (
            <li key={m.id}>{m.label}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
