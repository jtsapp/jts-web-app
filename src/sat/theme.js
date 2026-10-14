// Тема раздела SAT (SAT-SYNC-PLAN D1, B12): «TeenTech SAT» тёмный по умолчанию, независимо от темы остальной
// платформы. Своя запись в localStorage: переключатель внутри SAT не должен перекрашивать «Обучение» и тьютора.
//
// Однократный перевод: до редизайна SAT жил в общей теме платформы (jts_theme, у большинства — светлая или не
// задана). Кто открывает SAT впервые после редизайна, получает тёмную тему один раз — флаг v2 помнит, что перевод
// сделан, и дальше решает только кнопка темы. Тот же приём, что у прототипа (settings.themeV2).
import { useEffect, useState } from 'react'
import { THEME_KEY } from '../lib/theme.js'

export const SAT_THEME_KEY = 'jts_sat_theme'
export const SAT_THEME_V2 = 'jts_sat_theme_v2'

function store() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** Тема SAT с однократным переводом старых профилей на тёмную. Чистая по хранилищу — под тестом. */
export function satTheme(s = store()) {
  if (!s) return 'dark'
  try {
    if (!s.getItem(SAT_THEME_V2)) {
      s.setItem(SAT_THEME_KEY, 'dark')
      s.setItem(SAT_THEME_V2, '1')
      return 'dark'
    }
    return s.getItem(SAT_THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function saveSatTheme(theme, s = store()) {
  try {
    s?.setItem(SAT_THEME_KEY, theme === 'light' ? 'light' : 'dark')
    s?.setItem(SAT_THEME_V2, '1')
  } catch {
    /* приватный режим — тема не запомнится */
  }
}

function apply(theme) {
  const d = document.documentElement
  if (theme === 'dark') d.setAttribute('data-theme', 'dark')
  else d.removeAttribute('data-theme')
}

/** Тема платформы — та, что вернётся, когда ученик уйдёт из SAT. */
function platformTheme() {
  try {
    return window.localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Экран SAT держит свою тему, пока смонтирован, и возвращает платформенную при уходе. Переход между экранами SAT
 * размонтирует один и монтирует другой в одном коммите — между ними кадр не рисуется, мигания нет.
 */
export function useSatTheme() {
  const [theme, setTheme] = useState('dark')
  useEffect(() => {
    const th = satTheme()
    setTheme(th)
    apply(th)
    return () => apply(platformTheme())
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    saveSatTheme(next)
    apply(next)
    setTheme(next)
  }
  return { theme, toggle }
}
