export interface ModuleDefinition {
  id: string
  label: string
  path: string
  implemented: boolean
}

/**
 * Registry of business modules. Only modules with `implemented: true` get a
 * route and a clickable sidebar entry. Everything else is listed as plain,
 * non-interactive text under "قريبًا" so the roadmap is visible without
 * pretending an unbuilt module works.
 */
export const MODULES: ModuleDefinition[] = [
  { id: 'dashboard', label: 'الرئيسية', path: '/', implemented: true },
  { id: 'projects', label: 'المشاريع', path: '/projects', implemented: true },
  { id: 'crm', label: 'العملاء (CRM)', path: '/crm', implemented: true },
  { id: 'calendar', label: 'التقويم', path: '/calendar', implemented: true },
  { id: 'finance', label: 'المالية', path: '/finance', implemented: true },
  { id: 'files', label: 'الملفات', path: '/files', implemented: true },
  { id: 'ai-chat', label: 'الذكاء الاصطناعي', path: '', implemented: false },
  { id: 'agents', label: 'الوكلاء', path: '', implemented: false },
  { id: 'workflows', label: 'سير العمل', path: '', implemented: false },
  { id: 'memory', label: 'الذاكرة', path: '', implemented: false },
  { id: 'prompts', label: 'مكتبة الأوامر', path: '', implemented: false },
  { id: 'usage', label: 'الاستخدام', path: '', implemented: false },
]

export const implementedModules = MODULES.filter((m) => m.implemented)
export const plannedModules = MODULES.filter((m) => !m.implemented)
