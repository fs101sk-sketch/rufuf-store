import { useMemo, useState } from 'react'
import { useFiles } from './hooks'
import { useProjects } from '../projects/hooks'
import { useContacts } from '../crm/hooks'
import { FileUploadForm } from './components/FileUploadForm'
import { FileMetaForm } from './components/FileMetaForm'
import { FileItem } from './components/FileItem'
import { EmptyState, ErrorState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import { confirmAction } from '../../core/ui/confirmStore'
import { formatFileSize } from '../../core/format'
import { DEFAULT_FILE_FILTERS, DEFAULT_FILE_SORT } from './types'
import type { FileFilters, FileRow, FileSort } from './types'
import {
  computeFileStats,
  filterAndSortFiles,
  permanentlyDeleteFile,
  restoreFile,
  softDeleteFile,
  updateFileMeta,
  uploadFile,
  ValidationFailedError,
} from './service'

export function FilesPage() {
  const files = useFiles()
  const projects = useProjects()
  const contacts = useContacts()
  const [filters, setFilters] = useState<FileFilters>(DEFAULT_FILE_FILTERS)
  const [sort, setSort] = useState<FileSort>(DEFAULT_FILE_SORT)
  const [formOpen, setFormOpen] = useState(false)
  const [editingFile, setEditingFile] = useState<FileRow | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const pushToast = useToastStore((s) => s.push)

  const projectNameById = useMemo(() => new Map((projects ?? []).map((p) => [p.id, p.name])), [projects])
  const contactNameById = useMemo(() => new Map((contacts ?? []).map((c) => [c.id, c.name])), [contacts])

  const stats = useMemo(() => (files ? computeFileStats(files) : null), [files])

  const visible = useMemo(() => {
    if (!files) return []
    return filterAndSortFiles(files, filters, sort)
  }, [files, filters, sort])

  const deletedCount = useMemo(() => (files ? files.filter((f) => f.deleted_at).length : 0), [files])

  if (files === undefined) {
    return <LoadingState label="جارٍ تحميل الملفات…" />
  }

  async function handleUpload(input: Parameters<typeof uploadFile>[0]) {
    try {
      await uploadFile(input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleUpdateMeta(input: Parameters<typeof updateFileMeta>[1]) {
    if (!editingFile) return
    await updateFileMeta(editingFile.id, input)
  }

  function handleDownload(file: FileRow) {
    const url = URL.createObjectURL(file.data)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(file: FileRow) {
    setError(null)
    try {
      await softDeleteFile(file.id)
      pushToast({
        message: `تم حذف "${file.name}".`,
        actionLabel: 'تراجع',
        onAction: () => restoreFile(file.id),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف الملف.')
    }
  }

  async function handlePermanentDelete(file: FileRow) {
    const ok = await confirmAction({
      title: 'حذف نهائي للملف',
      description: `سيتم حذف "${file.name}" نهائيًا ولن تتمكن من التراجع عن هذا الإجراء. هل تريد المتابعة؟`,
      confirmLabel: 'حذف نهائيًا',
      danger: true,
    })
    if (!ok) return
    await permanentlyDeleteFile(file.id)
    pushToast({ message: `تم حذف "${file.name}" نهائيًا.` })
  }

  function parentLabelFor(file: FileRow): string | null {
    if (file.project_id) return projectNameById.get(file.project_id) ?? 'مشروع محذوف'
    if (file.contact_id) return contactNameById.get(file.contact_id) ?? 'جهة اتصال محذوفة'
    return null
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>الملفات</h1>
          <p className="page-subtitle">ملفاتك المرفوعة، مخزّنة محليًا في متصفحك.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
          + رفع ملف
        </button>
      </header>

      {error && <ErrorState title="حدث خطأ" detail={error} />}

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{stats.count}</span>
            <span className="stat-label">عدد الملفات</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{formatFileSize(stats.totalSize)}</span>
            <span className="stat-label">المساحة المستخدمة</span>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="ابحث بالاسم أو الوصف…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={`${sort.field}:${sort.direction}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split(':') as [FileSort['field'], FileSort['direction']]
            setSort({ field, direction })
          }}
        >
          <option value="created_at:desc">الأحدث رفعًا</option>
          <option value="name:asc">الاسم (أ-ي)</option>
          <option value="size:desc">الأكبر حجمًا</option>
        </select>
        {filters.search && (
          <button type="button" className="btn btn-ghost" onClick={() => setFilters(DEFAULT_FILE_FILTERS)}>
            مسح الفلاتر
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={files.length === 0 ? 'لا توجد ملفات بعد' : 'لا توجد نتائج مطابقة'}
          description={files.length === 0 ? 'ابدأ برفع أول ملف لك.' : 'جرّب تعديل البحث.'}
          action={
            files.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
                + رفع ملف
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="task-list">
          {visible.map((file) => (
            <FileItem
              key={file.id}
              file={file}
              parentLabel={parentLabelFor(file)}
              onDownload={() => handleDownload(file)}
              onEdit={() => setEditingFile(file)}
              onDelete={() => handleDelete(file)}
            />
          ))}
        </ul>
      )}

      {deletedCount > 0 && (
        <details className="trash-panel">
          <summary>المحذوفة مؤخرًا ({deletedCount})</summary>
          <ul>
            {files
              .filter((f) => f.deleted_at)
              .map((f) => (
                <li key={f.id}>
                  <span>
                    {f.name} · {formatFileSize(f.size)}
                  </span>
                  <div className="trash-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => restoreFile(f.id)}>
                      استعادة
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handlePermanentDelete(f)}>
                      حذف نهائي
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      )}

      {formOpen && <FileUploadForm onSubmit={handleUpload} onClose={() => setFormOpen(false)} />}
      {editingFile && (
        <FileMetaForm file={editingFile} onSubmit={handleUpdateMeta} onClose={() => setEditingFile(undefined)} />
      )}
    </div>
  )
}
