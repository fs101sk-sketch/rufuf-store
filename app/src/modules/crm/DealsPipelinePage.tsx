import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAllDeals, useContacts } from './hooks'
import { DealPipelineCard } from './components/DealPipelineCard'
import { LoadingState } from '../../core/ui/States'
import { formatCurrency } from './format'
import { DEAL_STAGE_LABELS, DEAL_STAGE_ORDER } from './types'
import { changeDealStage } from './service'
import type { DealStage } from './types'

export function DealsPipelinePage() {
  const deals = useAllDeals()
  const contacts = useContacts()
  const [search, setSearch] = useState('')

  const contactNameById = useMemo(() => {
    const map = new Map<string, string>()
    if (!contacts) return map
    for (const c of contacts) map.set(c.id, c.name)
    return map
  }, [contacts])

  const liveDeals = useMemo(() => {
    if (!deals) return []
    let result = deals.filter((d) => !d.deleted_at)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || (contactNameById.get(d.contact_id) ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [deals, search, contactNameById])

  if (deals === undefined || contacts === undefined) {
    return <LoadingState label="جارٍ تحميل لوحة الصفقات…" />
  }

  const dealsByStage = new Map<DealStage, typeof liveDeals>()
  for (const stage of DEAL_STAGE_ORDER) dealsByStage.set(stage, [])
  for (const deal of liveDeals) dealsByStage.get(deal.stage)?.push(deal)

  return (
    <div className="page pipeline-page">
      <header className="page-header">
        <div>
          <h1>لوحة الصفقات</h1>
          <p className="page-subtitle">كل الصفقات مجمّعة حسب المرحلة. غيّر المرحلة مباشرة من كل بطاقة.</p>
        </div>
        <Link to="/crm" className="btn btn-ghost">
          العملاء
        </Link>
      </header>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="ابحث بعنوان الصفقة أو اسم جهة الاتصال…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="pipeline-board">
        {DEAL_STAGE_ORDER.map((stage) => {
          const stageDeals = dealsByStage.get(stage) ?? []
          const stageValue = stageDeals.reduce((sum, d) => sum + d.value, 0)
          return (
            <div key={stage} className="pipeline-column">
              <div className="pipeline-column-header">
                <span>{DEAL_STAGE_LABELS[stage]}</span>
                <span className="progress-label">{stageDeals.length}</span>
              </div>
              <div className="progress-label pipeline-column-total">{formatCurrency(stageValue)}</div>
              <div className="pipeline-column-body">
                {stageDeals.length === 0 ? (
                  <p className="pipeline-empty">لا صفقات</p>
                ) : (
                  stageDeals.map((deal) => (
                    <DealPipelineCard
                      key={deal.id}
                      deal={deal}
                      contactName={contactNameById.get(deal.contact_id) ?? 'جهة اتصال محذوفة'}
                      onStageChange={(newStage) => changeDealStage(deal.id, newStage)}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
