import { useState } from 'react'
import { Modal } from '../../../core/ui/Modal'
import { useProjects } from '../../projects/hooks'
import { useContacts } from '../../crm/hooks'
import type { FileMetaInput, FileRow } from '../types'

export function FileMetaForm({
  file,
  onSubmit,
  onClose,
}: {
  file: FileRow
  onSubmit: (input: FileMetaInput) => Promise<void>
  onClose: () => void
}) {
  const [description, setDescription] = useState(file.description)
  const [projectId, setProjectId] = useState(file.project_id ?? '')
  const [contactId, setContactId] = useState(file.contact_id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const projects = useProjects()
  const contacts = useContacts()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ description, project_id: projectId || null, contact_id: contactId || null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التعديلات.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`تعديل بيانات "${file.name}"`} onClose={onClose} wide>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-row">
            <label htmlFor="file-edit-project">مشروع مرتبط (اختياري)</label>
            <select id="file-edit-project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
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
            <label htmlFor="file-edit-contact">جهة اتصال مرتبطة (اختياري)</label>
            <select id="file-edit-contact" value={contactId} onChange={(e) => setContactId(e.target.value)}>
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
          <label htmlFor="file-edit-description">وصف</label>
          <textarea
            id="file-edit-description"
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
            {saving ? 'جارٍ الحفظ…' : 'حفظ التعديلات'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
