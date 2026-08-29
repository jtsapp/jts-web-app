'use client'

// Тонкие обёртки клиентского синка практики: fetch + localStorage + window.
// Вся чистая логика — в practiceSyncCore.js (там же тесты). Синк работает только
// для залогиненных: без токена pushModule/hydrate — no-op (гость на сервер не
// пишет). Best-effort: сетевые осечки логируются, localStorage уже записан.

import { loadToken } from '../lib/session.js'
import { applyHydratedState, serializeForPush } from './practiceSyncCore.js'
import { VOCAB_KEY, GRAMMAR_KEY, LISTENING_KEY, SHADOWING_KEY, SITUATIONS_KEY, WORKBOOKS_KEY, WORKBOOK_KEY, WRITING_KEY } from './practiceKeys.js'
import { WRITING_ARTIFACT_KEYS } from './writing/writingStore.js'

export function isSyncEnabled() {
  return !!loadToken()
}

// Debounce на модуль: словарь пишет SRS по ходу задания, грамматика/аудирование —
// по факту прохождения; частые записи схлопываем в один POST.
const timers = {}
export function pushModule(module, raw) {
  const token = loadToken()
  if (!token) return
  const state = serializeForPush(module, raw)
  clearTimeout(timers[module])
  timers[module] = setTimeout(() => {
    fetch('/api/practice/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ module, state }),
    }).catch((e) => console.warn('[practice.sync] push failed', module, e))
  }, 600)
}

// Прогружает серверный прогресс в локальные ключи. Перезаписываем ТОЛЬКО при
// успешном ответе: сетевая осечка не должна стирать локальный кэш. Успешная
// гидратация == «сервер — источник истины»: пустой стейт модуля затирает
// локальный (изоляция аккаунтов + «гостевой прогресс не переносится»).
export async function hydratePractice(token) {
  if (!token) return
  let data
  try {
    const res = await fetch('/api/practice/state', { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    data = await res.json()
  } catch (e) {
    console.warn('[practice.sync] hydrate failed', e)
    return
  }
  if (!data?.state) return
  applyHydratedState(data.state, {
    setItem: (k, v) => {
      try { localStorage.setItem(k, v) } catch {}
    },
    dispatch: (name) => {
      try { window.dispatchEvent(new Event(name)) } catch {}
    },
  })
}

export function clearLocalPractice() {
  // Артефакты письма (черновики, журнал, свои слова) не синкаются, но чистятся
  // вместе с прогрессом: на общей машине черновики — это тексты ученика, и они
  // не должны достаться следующему аккаунту.
  for (const k of [VOCAB_KEY, GRAMMAR_KEY, LISTENING_KEY, SHADOWING_KEY, SITUATIONS_KEY, WORKBOOKS_KEY, WORKBOOK_KEY, WRITING_KEY, ...WRITING_ARTIFACT_KEYS]) {
    try { localStorage.removeItem(k) } catch {}
  }
}
