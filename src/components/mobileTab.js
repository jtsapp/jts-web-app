import { createContext, useContext, useLayoutEffect } from 'react'

// Нижняя панель телефона — одна на всё приложение, в App и вне обёртки экрана .scr-in. Внутри обёртки она на время
// анимации входа (transform у .scr-in) привязывалась к экрану, а не к окну, и при каждом переходе пропадала и
// проявлялась заново; в мобильном приложении панель постоянная, экраны меняются над ней. Оболочка экрана только
// сообщает, какая вкладка горит; null — на этом экране панели нет (звонок тьютору, тест говорения).
export const MobileTabContext = createContext(null)

/** Сообщить вкладку панели. До отрисовки (layout-эффект): иначе кадр горела бы вкладка прошлого экрана. */
export function useMobileTab(active) {
  const set = useContext(MobileTabContext)
  useLayoutEffect(() => {
    set?.(active)
  }, [set, active])
}
