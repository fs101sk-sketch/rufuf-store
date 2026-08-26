import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db } from '../../core/db/schema'
import { LoadingState, EmptyState } from '../../core/ui/States'
import { formatCurrency } from '../../core/format'
import { formatRelative } from '../../core/dates'
import { ACTIVITY_ACTION_LABELS } from '../../core/activity/activityService'
import { useProjects, useAllTasks } from '../projects/hooks'
import { useContacts, useAllDeals } from '../crm/hooks'
import { useTransactions } from '../finance/hooks'
import { useEvents } from '../calendar/hooks'
import { computeStats as computeProjectStats } from '../projects/service'
import { computeCrmStats } from '../crm/service'
import { computeFinanceStats } from '../finance/service'
import { upcomingEvents } from '../calendar/service'
import { computeAttentionItems } from './service'
import type { AttentionItemType } from './service'

const ATTENTION_ICONS: Record<AttentionItemType, string> = {
  task: '☐',
  deal: '💰',
  event: '📅',
}

export function DashboardPage() {
  const projects = useProjects()
  const tasks = useAllTasks()
  const contacts = useContacts()
  const deals = useAllDeals()
  const transactions = useTransactions()
  const events = useEvents()
  const recentActivity = useLiveQuery(
    () => db.activity_log.orderBy('created_at').reverse().limit(10).toArray(),
    [],
  )

  const loaded = [projects, tasks, contacts, deals, transactions, events].every((x) => x !== undefined)

  const projectStats = useMemo(
    () => (projects && tasks ? computeProjectStats(projects, tasks) : null),
    [projects, tasks],
  )
  const crmStats = useMemo(() => (contacts && deals ? computeCrmStats(contacts, deals) : null), [contacts, deals])
  const financeStats = useMemo(() => (transactions ? computeFinanceStats(transactions) : null), [transactions])
  const nextEvents = useMemo(() => (events ? upcomingEvents(events, 5) : []), [events])
  const attention = useMemo(
    () =>
      projects && tasks && deals && contacts && events
        ? computeAttentionItems({ tasks, projects, deals, contacts, events })
        : [],
    [projects, tasks, deals, contacts, events],
  )

  if (!loaded) {
    return <LoadingState label="جارٍ تحميل لوحة التحكم…" />
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>الرئيسية</h1>
          <p className="page-subtitle">نظرة عامة حقيقية على مشاريعك وعملائك وماليتك وتقويمك.</p>
        </div>
      </header>

      <div className="stats-row">
        <Link to="/projects" className="stat-card stat-card-clickable">
          <span className="stat-value">{projectStats?.active ?? 0}</span>
          <span className="stat-label">مشاريع نشطة</span>
        </Link>
        <Link to="/crm/pipeline" className="stat-card stat-card-clickable">
          <span className="stat-value">{crmStats?.openDeals ?? 0}</span>
          <span className="stat-label">صفقات مفتوحة</span>
        </Link>
        <Link to="/crm/pipeline" className="stat-card stat-card-clickable">
          <span className="stat-value">{formatCurrency(crmStats?.pipelineValue ?? 0)}</span>
          <span className="stat-label">قيمة خط الأنابيب</span>
        </Link>
        <Link to="/finance" className="stat-card stat-card-clickable">
          <span className={'stat-value' + ((financeStats?.balance ?? 0) < 0 ? ' negative' : '')}>
            {formatCurrency(financeStats?.balance ?? 0)}
          </span>
          <span className="stat-label">الرصيد الصافي</span>
        </Link>
        <Link to="/calendar" className="stat-card stat-card-clickable">
          <span className="stat-value">{nextEvents.length}</span>
          <span className="stat-label">أحداث قادمة</span>
        </Link>
      </div>

      <div className="detail-grid">
        <section className="detail-main">
          <div className="detail-card">
            <h3>يحتاج انتباهك</h3>
            {attention.length === 0 ? (
              <EmptyState title="لا شيء يحتاج انتباهك الآن" description="لا مهام متأخرة، ولا صفقات تجاوزت موعدها، ولا أحداث اليوم." />
            ) : (
              <ul className="activity-list">
                {attention.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <Link to={item.path} className="attention-link">
                      <span>
                        {ATTENTION_ICONS[item.type]} {item.title}
                      </span>
                      <span className="progress-label">{item.detail}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="detail-card">
            <h3>روابط سريعة</h3>
            <div className="quick-links">
              <Link to="/projects" className="btn btn-ghost">المشاريع</Link>
              <Link to="/crm" className="btn btn-ghost">العملاء (CRM)</Link>
              <Link to="/crm/pipeline" className="btn btn-ghost">لوحة الصفقات</Link>
              <Link to="/finance" className="btn btn-ghost">المالية</Link>
              <Link to="/calendar" className="btn btn-ghost">التقويم</Link>
            </div>
          </div>
        </section>

        <aside className="detail-side">
          <div className="detail-card">
            <h3>النشاط الأخير</h3>
            {!recentActivity || recentActivity.length === 0 ? (
              <EmptyState title="لا يوجد نشاط بعد" />
            ) : (
              <ul className="activity-list">
                {recentActivity.map((entry) => (
                  <li key={entry.id}>
                    <span>{ACTIVITY_ACTION_LABELS[entry.action] ?? entry.action}</span>
                    <time>{formatRelative(entry.created_at)}</time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
