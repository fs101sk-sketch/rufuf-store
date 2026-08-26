import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useProject, useProjectTasks, useActivityForEntity } from './hooks'
import { TaskPanel } from './components/TaskPanel'
import { ProjectForm } from './components/ProjectForm'
import { EmptyState, ErrorState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import { formatDate, formatDateTime, isOverdue } from '../../core/dates'
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS } from './types'
import {
  duplicateProject,
  restoreProject,
  softDeleteProject,
  toggleFavorite,
  updateProject,
  ValidationFailedError,
} from './service'

const ACTION_LABELS: Record<string, string> = {
  'project.created': 'تم إنشاء المشروع',
  'project.updated': 'تم تحديث المشروع',
  'project.deleted': 'تم حذف المشروع',
  'project.restored': 'تمت استعادة المشروع',
  'project.duplicated': 'تم تكرار المشروع',
  'task.created': 'تمت إضافة مهمة',
  'task.updated': 'تم تحديث مهمة',
  'task.deleted': 'تم حذف مهمة',
  'task.restored': 'تمت استعادة مهمة',
  'task.completed': 'تم إكمال مهمة',
  'task.reopened': 'تمت إعادة فتح مهمة',
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const project = useProject(id)
  const tasks = useProjectTasks(id)
  const activity = useActivityForEntity(id)
  const [editOpen, setEditOpen] = useState(false)
  const pushToast = useToastStore((s) => s.push)

  if (project === undefined || tasks === undefined) {
    return <LoadingState label="جارٍ تحميل المشروع…" />
  }

  if (!project || project.deleted_at) {
    return (
      <ErrorState
        title="المشروع غير موجود"
        detail="ربما تم حذفه، أو أن الرابط غير صحيح."
      />
    )
  }

  const overdue = isOverdue(project.deadline) && project.status !== 'completed' && project.status !== 'cancelled'

  async function handleUpdate(input: Parameters<typeof updateProject>[1]) {
    if (!project) return
    try {
      await updateProject(project.id, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete() {
    if (!project) return
    await softDeleteProject(project.id)
    pushToast({
      message: `تم حذف "${project.name}".`,
      actionLabel: 'تراجع',
      onAction: () => restoreProject(project.id),
    })
    navigate('/projects')
  }

  async function handleDuplicate() {
    if (!project) return
    const clone = await duplicateProject(project.id)
    pushToast({ message: `تم إنشاء نسخة من "${project.name}".` })
    navigate(`/projects/${clone.id}`)
  }

  return (
    <div className="page">
      <Link to="/projects" className="back-link">
        ← رجوع إلى المشاريع
      </Link>

      <header className="detail-header">
        <div>
          <div className="detail-title-row">
            <h1>{project.name}</h1>
            <button
              type="button"
              className={'star-btn' + (project.favorite ? ' active' : '')}
              onClick={() => toggleFavorite(project.id, !project.favorite)}
              aria-pressed={project.favorite}
            >
              {project.favorite ? '★' : '☆'}
            </button>
          </div>
          <div className="detail-badges">
            <span className={`badge badge-status-${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
            <span className={`badge badge-priority-${project.priority}`}>{PRIORITY_LABELS[project.priority]}</span>
            {project.deadline && (
              <span className={'deadline-label' + (overdue ? ' overdue' : '')}>
                {overdue ? 'متأخر منذ ' : 'الموعد النهائي: '}
                {formatDate(project.deadline)}
              </span>
            )}
          </div>
        </div>
        <div className="detail-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(true)}>
            تعديل
          </button>
          <button type="button" className="btn btn-ghost" onClick={handleDuplicate}>
            تكرار
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete}>
            حذف
          </button>
        </div>
      </header>

      <div className="detail-grid">
        <section className="detail-main">
          {project.description && (
            <div className="detail-card">
              <h3>الوصف</h3>
              <p>{project.description}</p>
            </div>
          )}

          <div className="detail-card">
            <h3>معلومات المشروع</h3>
            <dl className="info-list">
              <div>
                <dt>النوع</dt>
                <dd>{project.type || '—'}</dd>
              </div>
              <div>
                <dt>رابط المنتج</dt>
                <dd>
                  {project.live_url ? (
                    <a href={project.live_url} target="_blank" rel="noreferrer">
                      {project.live_url}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>رابط المستودع</dt>
                <dd>
                  {project.repository_url ? (
                    <a href={project.repository_url} target="_blank" rel="noreferrer">
                      {project.repository_url}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>التقنيات</dt>
                <dd>
                  {project.tech_stack.length > 0 ? (
                    <div className="chip-row">
                      {project.tech_stack.map((t) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt>أُنشئ</dt>
                <dd>{formatDate(project.created_at)}</dd>
              </div>
              <div>
                <dt>آخر تحديث</dt>
                <dd>{formatDate(project.updated_at)}</dd>
              </div>
            </dl>
          </div>

          {project.notes && (
            <div className="detail-card">
              <h3>ملاحظات</h3>
              <p>{project.notes}</p>
            </div>
          )}

          <div className="detail-card">
            <TaskPanel projectId={project.id} tasks={tasks} />
          </div>
        </section>

        <aside className="detail-side">
          <div className="detail-card">
            <h3>النشاط</h3>
            {!activity || activity.length === 0 ? (
              <EmptyState title="لا يوجد نشاط بعد" />
            ) : (
              <ul className="activity-list">
                {activity.slice(0, 20).map((entry) => (
                  <li key={entry.id}>
                    <span>{ACTION_LABELS[entry.action] ?? entry.action}</span>
                    <time>{formatDateTime(entry.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {editOpen && <ProjectForm project={project} onSubmit={handleUpdate} onClose={() => setEditOpen(false)} />}
    </div>
  )
}
