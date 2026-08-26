import { useEffect } from 'react'
import { useToastStore } from './toastStore'

function ToastItem({ id }: { id: string }) {
  const toast = useToastStore((s) => s.toasts.find((t) => t.id === id))
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => dismiss(toast.id), toast.duration)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id])

  if (!toast) return null

  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      <div className="toast-actions">
        {toast.onAction && toast.actionLabel && (
          <button
            type="button"
            className="toast-action"
            onClick={() => {
              toast.onAction?.()
              dismiss(toast.id)
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button type="button" className="toast-close" onClick={() => dismiss(toast.id)} aria-label="إغلاق">
          ×
        </button>
      </div>
    </div>
  )
}

export function ToastHost() {
  // Select the array itself (stable reference unless the store mutates it) —
  // deriving a new array in the selector (e.g. via .map) breaks
  // useSyncExternalStore's reference check and causes an infinite render loop.
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <ToastItem key={t.id} id={t.id} />
      ))}
    </div>
  )
}
