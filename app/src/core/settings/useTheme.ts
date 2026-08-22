import { useEffect, useState } from 'react'
import { getSetting, setSetting, THEME_KEY, type ThemePreference } from './settingsService'

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePreference>('system')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getSetting<ThemePreference>(THEME_KEY, 'system').then((value) => {
      setThemeState(value)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme, loaded])

  async function setTheme(next: ThemePreference) {
    setThemeState(next)
    await setSetting(THEME_KEY, next)
  }

  return { theme, setTheme, loaded }
}
