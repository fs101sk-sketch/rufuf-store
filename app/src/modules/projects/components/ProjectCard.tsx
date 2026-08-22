import { Link } from 'react-router-dom'
import { formatDate, isOverdue, isUpcoming } from '../../../core/dates'
import { PRIORITY_LABELS, PROJECT_STATUS_LABELS } from '../types'
import type { ProjectProgress, ProjectRow } from '../types'

export function ProjectCard({
  project,
  progress,
  onToggleFavorite,
  onDuplicate,
  onDelete,
}: {
  project: ProjectRow
  progress: ProjectProgress
  onToggleFavorite: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const overdue = isOverdue(project.deadline) && project.status !== 'completed' && project.status !== 'cancelled'
  const upcoming = !overdue && isUpcoming(project.deadline) && project.status !== 'completed'

  return (
    <div className={'project-card' + (overdue ? ' is-overdue' : '')}>
      <div className="project-card-top">
        <button
          type="button"
          className={'star-btn' + (project.favorite ? ' active' : '')}
          onClick={onToggleFavorite}
          aria-pressed={project.favorite}
          aria-label={project.favorite ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
        >
          {project.favorite ? '★' : '☆'}
        </button>
        <span className={`badge badge-status-${project.status}`}>{PROJECT_STATUS_LABELS[project.status]}</span>
      </div>

      <Link to={`/projects/${project.id}`} className="project-card-title">
        {project.name}
      </Link>
      {project.type && <div className="project-card-type">{project.type}</div>}
      {project.description && <p className="project-card-desc">{project.description}</p>}

      {project.tech_stack.length > 0 && (
        <div className="chip-row">
          {project.tech_stack.slice(0, 4).map((tech) => (
            <span key={tech} className="chip">
              {tech}
            </span>
          ))}
          {project.tech_stack.length > 4 && <span className="chip">+{project.tech_stack.length - 4}</span>}
        </div>
      )}

      <div className="progress-row">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress.percent}%` }} />
        </div>
        <span className="progress-label">
          {progress.total === 0 ? 'لا مهام بعد' : `${progress.completed}/${progress.total} مهمة (${progress.percent}%)`}
        </span>
      </div>

      <div className="project-card-footer">
        <span className={`badge badge-priority-${project.priority}`}>{PRIORITY_LABELS[project.priority]}</span>
        {project.deadline && (
          <span className={'deadline-label' + (overdue ? ' overdue' : upcoming ? ' upcoming' : '')}>
            {overdue ? 'متأخر منذ ' : ''}
            {formatDate(project.deadline)}
          </span>
        )}
        <div className="project-card-actions">
          <button type="button" className="icon-btn" onClick={onDuplicate} title="تكرار المشروع">
            ⧉
          </button>
          <button type="button" className="icon-btn icon-btn-danger" onClick={onDelete} title="حذف المشروع">
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}
