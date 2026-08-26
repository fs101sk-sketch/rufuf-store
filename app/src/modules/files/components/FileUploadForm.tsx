import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { useProjects } from '../../projects/hooks'
import { useContacts } from '../../crm/hooks'
import { formatFileSize } from '../../../core/format'
import { MAX_FILE_SIZE } from '../types'
import type { FileUploadInput } from '../types'

export function FileUploadForm({
  onSubmit,
  onClose,
}: {
  onSubmit: (input: FileUploadInput) => Promise<void>
  onClose: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState<string>('')
  const [contactId, setContactId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const projects = useProjects()
  const contacts = useContacts()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('اختر ملفًا أولًا.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError(`حجم الملف يتجاوز الحد الأقصى المسموح (${formatFileSize(MAX_FILE_SIZE)}).`)
      return
    }
    setError(null)
    setSaving(true)
    try {
      await onSubmit({
        name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        data: file,
        description,
        project_id: projectId || null,
        contact_id: contactId || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الملف.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="رفع ملف جديد" onClose={onClose} wide>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <label htmlFor="file-input">الملف *</label>
          <input
            id="file-input"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <span className="progress-label">
              {file.name} · {formatFileSize(file.size)}
            </span>
          )}
        </div>

        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="file-project">مشروع مرتبط (اختياري)</label>
            <select id="file-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">بلا</option>
              {(projects ?? [])
                .filter((p) => !p.deleted_at)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="file-contact">جهة اتصال مرتبطة (اختياري)</label>
            <select id="file-contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">بلا</option>
              {(contacts ?? [])
                .filter((c) => !c.deleted_at)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="file-description">وصف</label>
          <textarea
            id="file-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        {error && <p className="form-error form-error-global">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'جارٍ الرفع…' : 'رفع الملف'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
