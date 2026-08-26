import { formatDate } from '../../../core/dates'
import { formatFileSize } from '../../../core/format'
import type { FileRow } from '../types'

function iconFor(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.startsWith('video/')) return '🎞️'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.startsWith('text/')) return '📝'
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️'
  return '📎'
}

export function FileItem({
  file,
  parentLabel,
  onDownload,
  onEdit,
  onDelete,
}: {
  file: FileRow
  parentLabel: string | null
  onDownload: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="task-item">
      <span className="task-checkbox">
        <span className="task-title">
          {iconFor(file.mime_type)} {file.name}
        </span>
        <span className="progress-label">
          {formatFileSize(file.size)} · {formatDate(file.created_at)}
          {parentLabel && ` · ${parentLabel}`}
          {file.description && ` · ${file.description}`}
        </span>
      </span>
      <div className="task-meta">
        <button type="button" className="icon-btn" onClick={onDownload} title="تنزيل الملف">
          ⬇
        </button>
        <button type="button" className="icon-btn" onClick={onEdit} title="تعديل بيانات الملف">
          ✎
        </button>
        <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف الملف">
          🗑
        </button>
      </div>
    </li>
  )
}
