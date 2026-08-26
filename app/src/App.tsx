import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ensureWorkspace } from './core/db/bootstrap'
import { Layout } from './core/ui/Layout'
import { ErrorBoundary } from './core/ui/ErrorBoundary'
import { ToastHost } from './core/ui/ToastHost'
import { ConfirmDialogHost } from './core/ui/ConfirmDialogHost'
import { LoadingState, ErrorState } from './core/ui/States'
import { ProjectsPage } from './modules/projects/ProjectsPage'
import { ProjectDetailPage } from './modules/projects/ProjectDetailPage'
import { ContactsPage } from './modules/crm/ContactsPage'
import { ContactDetailPage } from './modules/crm/ContactDetailPage'
import { DealsPipelinePage } from './modules/crm/DealsPipelinePage'
import { FinancePage } from './modules/finance/FinancePage'
import { CalendarPage } from './modules/calendar/CalendarPage'
import { SettingsPage } from './modules/settings/SettingsPage'
import { useTheme } from './core/settings/useTheme'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="/crm" element={<ContactsPage />} />
        <Route path="/crm/pipeline" element={<DealsPipelinePage />} />
        <Route path="/crm/contacts/:id" element={<ContactDetailPage />} />
        <Route path="/finance" element={<FinancePage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="*"
          element={<ErrorState title="الصفحة غير موجودة" detail="تحقق من الرابط أو ارجع إلى المشاريع." />}
        />
      </Route>
    </Routes>
  )
}

function App() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  useTheme()

  useEffect(() => {
    ensureWorkspace()
      .then(() => setStatus('ready'))
      .catch((err) => {
        console.error('[bootstrap]', err)
        setError(err instanceof Error ? err.message : String(err))
        setStatus('error')
      })
  }, [])

  if (status === 'loading') {
    return <LoadingState label="جارٍ تحضير قاعدة البيانات المحلية…" />
  }

  if (status === 'error') {
    return (
      <ErrorState
        title="تعذر فتح قاعدة البيانات المحلية"
        detail={error ?? 'قد يكون المتصفح يمنع IndexedDB في هذا الوضع (مثل التصفح الخاص).'}
      />
    )
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
      <ToastHost />
      <ConfirmDialogHost />
    </ErrorBoundary>
  )
}

export default App
