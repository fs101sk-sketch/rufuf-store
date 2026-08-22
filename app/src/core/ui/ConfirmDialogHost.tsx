import { useConfirmStore } from './confirmStore'

export function ConfirmDialogHost() {
  const pending = useConfirmStore((s) => s.pending)
  const resolve = useConfirmStore((s) => s.resolve)

  if (!pending) return null

  return (
    <div className="modal-overlay" onClick={() => resolve(false)}>
      <div
        className="modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{pending.title}</h2>
        <p>{pending.description}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => resolve(false)}>
            {pending.cancelLabel ?? 'إلغاء'}
          </button>
          <button
            type="button"
            className={pending.danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => resolve(true)}
            autoFocus
          >
            {pending.confirmLabel ?? 'تأكيد'}
          </button>
        </div>
      </div>
    </div>
  )
}
