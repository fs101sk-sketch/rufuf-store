import { useEffect, useMemo, useState } from 'react'
import { useProjects, useAllTasks } from './hooks'
import { ProjectCard } from './components/ProjectCard'
import { ProjectForm } from './components/ProjectForm'
import { EmptyState, ErrorState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import { confirmAction } from '../../core/ui/confirmStore'
import {
  getSetting,
  setSetting,
  PROJECTS_VIEW_KEY,
  type ProjectsViewPreference,
} from '../../core/settings/settingsService'
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectFilters,
  type ProjectSort,
} from './types'
import {
  computeProgress,
  computeStats,
  createProject,
  duplicateProject,
  filterAndSortProjects,
  permanentlyDeleteProject,
  restoreProject,
  softDeleteProject,
  toggleFavorite,
  ValidationFailedError,
} from './service'
import type { ProjectRow, TaskRow } from './types'

export function ProjectsPage() {
  const projects = useProjects()
  const tasks = useAllTasks()
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_FILTERS)
  const [sort, setSort] = useState<ProjectSort>(DEFAULT_SORT)
  const [view, setView] = useState<ProjectsViewPreference>('grid')
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pushToast = useToastStore((s) => s.push)

  useEffect(() => {
    getSetting<ProjectsViewPreference>(PROJECTS_VIEW_KEY, 'grid').then(setView)
  }, [])

  async function changeView(next: ProjectsViewPreference) {
    setView(next)
    await setSetting(PROJECTS_VIEW_KEY, next)
  }

  const tasksByProject = useMemo(() => {
    const map = new Map<string, TaskRow[]>()
    if (!tasks) return map
    for (const t of tasks) {
      if (!t.project_id) continue
      const list = map.get(t.project_id) ?? []
      list.push(t)
      map.set(t.project_id, list)
    }
    return map
  }, [tasks])

  const stats = useMemo(() => {
    if (!projects || !tasks) return null
    return computeStats(projects, tasks)
  }, [projects, tasks])

  const visible = useMemo(() => {
    if (!projects) return []
    return filterAndSortProjects(projects, filters, sort)
  }, [projects, filters, sort])

  const deletedCount = useMemo(() => (projects ? projects.filter((p) => p.deleted_at).length : 0), [projects])

  if (projects === undefined || tasks === undefined) {
    return <LoadingState label="جارٍ تحميل المشاريع…" />
  }

  async function handleCreate(input: Parameters<typeof createProject>[0]) {
    try {
      await createProject(input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete(project: ProjectRow) {
    setError(null)
    try {
      await softDeleteProject(project.id)
      pushToast({
        message: `تم حذف "${project.name}".`,
        actionLabel: 'تراجع',
        onAction: () => restoreProject(project.id),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حذف المشروع.')
    }
  }

  async function handleDuplicate(project: ProjectRow) {
    setError(null)
    try {
      await duplicateProject(project.id)
      pushToast({ message: `تم إنشاء نسخة من "${project.name}".` })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تكرار المشروع.')
    }
  }

  async function handlePermanentDelete(project: ProjectRow) {
    const ok = await confirmAction({
      title: 'حذف نهائي للمشروع',
      description: `سيتم حذف "${project.name}" وكل مهامه نهائيًا ولن تتمكن من التراجع عن هذا الإجراء. هل تريد المتابعة؟`,
      confirmLabel: 'حذف نهائيًا',
      danger: true,
    })
    if (!ok) return
    await permanentlyDeleteProject(project.id)
    pushToast({ message: `تم حذف "${project.name}" نهائيًا.` })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>المشاريع</h1>
          <p className="page-subtitle">إدارة مشاريعك ومهامك في مكان واحد.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setFormOpen(true)}
        >
          + مشروع جديد
        </button>
      </header>

      {error && <ErrorState title="حدث خطأ" detail={error} />}

      {stats && (
        <div className="stats-row">
          <StatCard
            label="المشاريع النشطة"
            value={stats.active}
            active={filters.status === 'active'}
            onClick={() => setFilters({ ...DEFAULT_FILTERS, status: filters.status === 'active' ? 'all' : 'active' })}
          />
          <StatCard
            label="متأخرة"
            value={stats.overdue}
            active={filters.overdueOnly}
            onClick={() => setFilters({ ...DEFAULT_FILTERS, overdueOnly: !filters.overdueOnly })}
          />
          <StatCard
            label="اقترب موعدها (٧ أيام)"
            value={stats.upcoming}
            active={filters.upcomingOnly}
            onClick={() => setFilters({ ...DEFAULT_FILTERS, upcomingOnly: !filters.upcomingOnly })}
          />
          <StatCard
            label="المفضّلة"
            value={stats.favorites}
            active={filters.favoriteOnly}
            onClick={() => setFilters({ ...DEFAULT_FILTERS, favoriteOnly: !filters.favoriteOnly })}
          />
          <StatCard label="مهام مستحقة اليوم" value={stats.tasksDueToday} />
          <StatCard label="مهام متأخرة" value={stats.tasksOverdue} />
        </div>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="ابحث بالاسم أو الوصف أو التقنية…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as ProjectFilters['status'] })}
        >
          <option value="all">كل الحالات</option>
          {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value as ProjectFilters['priority'] })}
        >
          <option value="all">كل الأولويات</option>
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={`${sort.field}:${sort.direction}`}
          onChange={(e) => {
            const [field, direction] = e.target.value.split(':') as [ProjectSort['field'], ProjectSort['direction']]
            setSort({ field, direction })
          }}
        >
          <option value="updated_at:desc">آخر تحديث</option>
          <option value="created_at:desc">الأحدث إنشاءً</option>
          <option value="name:asc">الاسم (أ-ي)</option>
          <option value="deadline:asc">الموعد النهائي (الأقرب)</option>
          <option value="priority:desc">الأولوية (الأعلى أولًا)</option>
        </select>
        <div className="view-toggle">
          <button
            type="button"
            className={view === 'grid' ? 'active' : ''}
            onClick={() => changeView('grid')}
            aria-pressed={view === 'grid'}
          >
            شبكة
          </button>
          <button
            type="button"
            className={view === 'list' ? 'active' : ''}
            onClick={() => changeView('list')}
            aria-pressed={view === 'list'}
          >
            قائمة
          </button>
        </div>
        {(filters.status !== 'all' || filters.priority !== 'all' || filters.favoriteOnly || filters.overdueOnly || filters.upcomingOnly || filters.search) && (
          <button type="button" className="btn btn-ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
            مسح الفلاتر
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={projects.length === 0 ? 'لا توجد مشاريع بعد' : 'لا توجد نتائج مطابقة'}
          description={
            projects.length === 0
              ? 'ابدأ بإنشاء أول مشروع لك.'
              : 'جرّب تعديل البحث أو الفلاتر.'
          }
          action={
            projects.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
                + مشروع جديد
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className={view === 'grid' ? 'project-grid' : 'project-list'}>
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              progress={computeProgress(tasksByProject.get(project.id) ?? [])}
              onToggleFavorite={() => toggleFavorite(project.id, !project.favorite)}
              onDuplicate={() => handleDuplicate(project)}
              onDelete={() => handleDelete(project)}
            />
          ))}
        </div>
      )}

      {deletedCount > 0 && (
        <details className="trash-panel">
          <summary>المحذوفة مؤخرًا ({deletedCount})</summary>
          <ul>
            {projects
              .filter((p) => p.deleted_at)
              .map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <div className="trash-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => restoreProject(p.id)}>
                      استعادة
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handlePermanentDelete(p)}>
                      حذف نهائي
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      )}

      {formOpen && <ProjectForm onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
    </div>
  )
}

function StatCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active?: boolean
  onClick?: () => void
}) {
  const content = (
    <>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </>
  )
  if (!onClick) {
    return <div className="stat-card">{content}</div>
  }
  return (
    <button type="button" className={'stat-card stat-card-clickable' + (active ? ' active' : '')} onClick={onClick}>
      {content}
    </button>
  )
}
