import { NavLink } from 'react-router-dom'
import { implementedModules, plannedModules } from '../modules'

export function Sidebar({ onOpenSearch }: { onOpenSearch: () => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">نظام الأعمال</div>
      <button type="button" className="sidebar-search-btn" onClick={onOpenSearch}>
        <span>🔍 بحث</span>
        <kbd>Ctrl+K</kbd>
      </button>
      <nav className="sidebar-nav">
        {implementedModules.map((m) => (
          <NavLink
            key={m.id}
            to={m.path}
            end={m.path === '/'}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            {m.label}
          </NavLink>
        ))}
      </nav>

      {plannedModules.length > 0 && (
        <div className="sidebar-planned">
          <div className="sidebar-planned-title">قريبًا</div>
          <ul>
            {plannedModules.map((m) => (
              <li key={m.id} title="لم يُنفَّذ بعد">
                {m.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="sidebar-footer">
        <NavLink to="/settings" className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}>
          الإعدادات
        </NavLink>
      </div>
    </aside>
  )
}
