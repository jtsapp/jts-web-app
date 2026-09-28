import { useCallback, useEffect, useState } from 'react'
import {
  exitFullscreen,
  getFullscreenElement,
  onFullscreenChange,
  requestElementFullscreen,
} from '../../lib/elementFullscreen.js'

// Полный экран для игрового поля (порт javaTest src/hooks/useFullscreen.ts на
// общем lib/elementFullscreen.js). Где браузер не дал настоящий полный экран
// (iPhone Safari, встроенные вебвью), поле растягивается на окно своим CSS.
// `active` следит за реальным состоянием: из режима выходят и мимо кнопки —
// Esc, F11, системным жестом.
export function useArcadeFullscreen(ref) {
  const [native, setNative] = useState(false)
  const [overlay, setOverlay] = useState(false)

  useEffect(() => {
    const el = ref.current
    const sync = () => {
      const on = !!el && getFullscreenElement() === el
      setNative(on)
      // Запоздалое согласие браузера сменяет оверлей.
      if (on) setOverlay(false)
    }
    const off = onFullscreenChange(sync)
    return () => {
      off()
      // Уход с экрана не должен оставлять браузер в полноэкранном режиме.
      if (el && getFullscreenElement() === el) exitFullscreen()
    }
  }, [ref])

  // Оверлей закрывается и по Esc; страница под ним не прокручивается.
  useEffect(() => {
    if (!overlay) return undefined
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    const onKey = (e) => {
      // При открытом окне стенограммы Esc закрывает только его.
      if (e.key === 'Escape' && !document.querySelector('[data-ar-dialog]')) setOverlay(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      root.style.overflow = prev
    }
  }, [overlay])

  const toggle = useCallback(async () => {
    const el = ref.current
    if (!el) return
    if (getFullscreenElement() === el) {
      exitFullscreen()
      return
    }
    if (overlay) {
      setOverlay(false)
      return
    }
    const ok = await requestElementFullscreen(el)
    if (!ok) setOverlay(true)
  }, [ref, overlay])

  return { active: native || overlay, toggle }
}
