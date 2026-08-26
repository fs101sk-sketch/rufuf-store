import { useState } from 'react'
import { DealItem } from './DealItem'
import { DealForm } from './DealForm'
import { EmptyState } from '../../../core/ui/States'
import { useToastStore } from '../../../core/ui/toastStore'
import { formatCurrency } from '../format'
import { createDeal, restoreDeal, softDeleteDeal, updateDeal, ValidationFailedError } from '../service'
import type { DealInput, DealRow } from '../types'

export function DealsPanel({ contactId, deals }: { contactId: string; deals: DealRow[] }) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingDeal, setEditingDeal] = useState<DealRow | undefined>(undefined)
  const pushToast = useToastStore((s) => s.push)

  const liveDeals = deals.filter((d) => !d.deleted_at)
  const openValue = liveDeals
    .filter((d) => d.stage !== 'won' && d.stage !== 'lost')
    .reduce((sum, d) => sum + d.value, 0)

  async function handleCreate(input: DealInput) {
    try {
      await createDeal(contactId, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleUpdate(input: DealInput) {
    if (!editingDeal) return
    try {
      await updateDeal(editingDeal.id, input)
    } catch (err) {
      if (err instanceof ValidationFailedError) throw new Error(Object.values(err.errors)[0])
      throw err
    }
  }

  async function handleDelete(deal: DealRow) {
    await softDeleteDeal(deal.id)
    pushToast({
      message: `تم حذف الصفقة "${deal.title}".`,
      actionLabel: 'تراجع',
      onAction: () => restoreDeal(deal.id),
    })
  }

  return (
    <div className="task-panel">
      <div className="task-panel-header">
        <h3>الصفقات</h3>
        <span className="progress-label">
          {liveDeals.length === 0 ? 'لا صفقات بعد' : `${liveDeals.length} صفقة · ${formatCurrency(openValue)} قيد التنفيذ`}
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setFormOpen(true)}>
          + صفقة
        </button>
      </div>

      {liveDeals.length === 0 ? (
        <EmptyState title="لا توجد صفقات لهذه الجهة" description="أضف أول صفقة لبدء تتبع الفرصة البيعية." />
      ) : (
        <ul className="task-list">
          {liveDeals.map((deal) => (
            <DealItem
              key={deal.id}
              deal={deal}
              onEdit={() => setEditingDeal(deal)}
              onDelete={() => handleDelete(deal)}
            />
          ))}
        </ul>
      )}

      {formOpen && <DealForm onSubmit={handleCreate} onClose={() => setFormOpen(false)} />}
      {editingDeal && <DealForm deal={editingDeal} onSubmit={handleUpdate} onClose={() => setEditingDeal(undefined)} />}
    </div>
  )
}
