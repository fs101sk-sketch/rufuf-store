export function LoadingState({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="state state-loading" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="state state-empty">
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="state state-error" role="alert">
      <h3>{title}</h3>
      {detail && <p className="error-detail">{detail}</p>}
    </div>
  )
}
