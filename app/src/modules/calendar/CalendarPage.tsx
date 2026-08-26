import { useMemo, useState } from 'react'
import { useEvents } from './hooks'
import { EventForm } from './components/EventForm'
import { EventItem } from './components/EventItem'
import { EmptyState, LoadingState } from '../../core/ui/States'
import { useToastStore } from '../../core/ui/toastStore'
import {
  addMonths,
  formatDayNumber,
  formatMonthYear,
  getMonthGrid,
  isSameDay,
  isSameMonth,
  subMonths,
} from '../../core/dates'
import {
  createEvent,
  eventsForDay,
  restoreEvent,
  softDeleteEvent,
  updateEvent,
  upcomingEvents,
  ValidationFailedError,
} from './service'
import type { EventInput, EventRow } from './types'

const WEEKDAY_LABELS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

export function CalendarPage() {
  const events = useEvents()
  const [monthCursor, setMonthCursor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventRow | undefined>(undefined)
  const pushToast = useToastStore((s) => s.push)

  const grid = useMemo(() => getMonthGrid(monthCursor), [monthCursor])

  const liveEvents = useMemo(() => (events ? events.filter((e) => !e.deleted_at) : []), [events])

  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, EventRow[]>()
    for (const day of grid) {
      const key = day.toDateString()
      map.set(key, eventsForDay(liveEvents, day))
    }
    return map
  }, [grid, liveEvents])

  const selectedDayEvents = useMemo(() => eventsForDay(liveEvents, selectedDay), [liveEvents, selectedDay])
  const upcoming = useMemo(() => (events ? upcomingEvents(events) : []), [events])
  const deletedCount = useMemo(() => (events ? events.filter((e) => e.deleted_at).length : 0), [events])

  if (events === undefined) {
    return <LoadingState label="جارٍ تحميل التقويم…" />
  }

  async function handleCreate(input: EventInput) {
    try {
      await createEvent(input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleUpdate(input: EventInput) {
    if (!editingEvent) return
    try {
      await updateEvent(editingEvent.id, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete(event: EventRow) {
    await softDeleteEvent(event.id)
    pushToast({
      message: `تم حذف "${event.title}".`,
      actionLabel: 'تراجع',
      onAction: () => restoreEvent(event.id),
    })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>التقويم</h1>
          <p className="page-subtitle">الأحداث والمواعيد في مكان واحد.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
          + حدث جديد
        </button>
      </header>

      <div className="calendar-layout">
        <div className="detail-card calendar-main">
          <div className="calendar-nav">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonthCursor(subMonths(monthCursor, 1))}>
              ← الشهر السابق
            </button>
            <h3>{formatMonthYear(monthCursor)}</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonthCursor(addMonths(monthCursor, 1))}>
              الشهر التالي →
            </button>
          </div>

          <div className="calendar-grid calendar-weekdays">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}
          </div>

          <div className="calendar-grid">
            {grid.map((day) => {
              const dayEvents = eventsByDayKey.get(day.toDateString()) ?? []
              const inMonth = isSameMonth(day, monthCursor)
              const today = isSameDay(day, new Date())
              const selected = isSameDay(day, selectedDay)
              return (
                <button
                  type="button"
                  key={day.toISOString()}
                  className={
                    'calendar-day' +
                    (inMonth ? '' : ' outside') +
                    (today ? ' today' : '') +
                    (selected ? ' selected' : '')
                  }
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="calendar-day-number">{formatDayNumber(day)}</span>
                  {dayEvents.slice(0, 2).map((e) => (
                    <span key={e.id} className="calendar-day-event">
                      {e.title}
                    </span>
                  ))}
                  {dayEvents.length > 2 && <span className="calendar-day-more">+{dayEvents.length - 2}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <aside className="detail-side">
          <div className="detail-card">
            <div className="task-panel-header">
              <h3>أحداث {formatDayNumber(selectedDay)} {formatMonthYear(selectedDay)}</h3>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
                + حدث
              </button>
            </div>
            {selectedDayEvents.length === 0 ? (
              <EmptyState title="لا أحداث في هذا اليوم" />
            ) : (
              <ul className="task-list">
                {selectedDayEvents.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    onEdit={() => setEditingEvent(event)}
                    onDelete={() => handleDelete(event)}
                  />
                ))}
              </ul>
            )}
          </div>

          <div className="detail-card">
            <h3>الأحداث القادمة</h3>
            {upcoming.length === 0 ? (
              <EmptyState title="لا أحداث قادمة" />
            ) : (
              <ul className="task-list">
                {upcoming.map((event) => (
                  <EventItem
                    key={event.id}
                    event={event}
                    showDate
                    onEdit={() => setEditingEvent(event)}
                    onDelete={() => handleDelete(event)}
                  />
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {deletedCount > 0 && (
        <details className="trash-panel">
          <summary>المحذوفة مؤخرًا ({deletedCount})</summary>
          <ul>
            {events
              .filter((e) => e.deleted_at)
              .map((e) => (
                <li key={e.id}>
                  <span>{e.title}</span>
                  <div className="trash-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => restoreEvent(e.id)}>
                      استعادة
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </details>
      )}

      {formOpen && <EventForm initialDate={selectedDay} onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
      {editingEvent && (
        <EventForm event={editingEvent} onSubmit={handleUpdate} onClose={() => setEditingEvent(undefined)} />
      )}
    </div>
  )
}
