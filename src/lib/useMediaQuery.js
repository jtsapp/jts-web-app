import { useSyncExternalStore } from 'react'

// Совпадает ли медиазапрос — для мест, где мобильный макет отличается не
// стилем, а содержимым (подсказка в поле, подпись), и CSS до него не дотянуться.
// На сервере и при гидратации — false (десктопный вариант): иначе разметка
// сервера и первого рендера клиента разъехалась бы (hydration mismatch),
// а мобильный текст подменяется сразу после гидратации.
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (typeof window !== 'undefined' && !!window.matchMedia?.(query).matches),
    () => false,
  )
}

// Брейкпоинт мобильного слоя (src/mobile/*.css).
export const MOBILE_QUERY = '(max-width: 560px)'
