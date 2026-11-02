import { useCallback, useState } from 'react'

// Свёрнута ли карточка «Результаты теста уровня» на «Главной» (жалоба 02.11.2026: ученица без теста просила убрать
// блок, который «всё время висит»). Выбор — на устройстве и по аккаунту: ключ строится из ключа тура «Главной», в нём
// уже владелец (как у окна «Жёсткий режим», temperInvite.js). Ключа ещё нет — общий ключ устройства.
const DEVICE_KEY = 'jts_home_placement_collapsed'

export function placementCollapseKey(tourKey) {
  return tourKey ? `${tourKey}:placementCollapsed` : DEVICE_KEY
}

function read(key) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function write(key, collapsed) {
  try {
    if (collapsed) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    /* localStorage недоступен — карточка свернётся только до перезагрузки */
  }
}

export function usePlacementCollapsed(key) {
  const [state, setState] = useState(() => ({ key, collapsed: read(key) }))
  // Ключ меняется, когда сервер ответил про туры (появился владелец) или вошёл другой аккаунт: перечитываем сразу в
  // рендере, а не эффектом — иначе карточка мигнула бы чужим состоянием.
  let collapsed = state.collapsed
  if (state.key !== key) {
    collapsed = read(key)
    setState({ key, collapsed })
  }
  const toggle = useCallback(() => {
    const next = !collapsed
    write(key, next)
    setState({ key, collapsed: next })
  }, [key, collapsed])
  return [collapsed, toggle]
}
