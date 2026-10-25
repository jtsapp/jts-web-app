'use client'

// Данные «Скорочтения» с бэкенда (/mobile/speed-reading/**): тексты и свои попытки — на каждый заход (тексты
// правит админка, попытки приходят и с других устройств). Кэша нет: в localStorage не кладём ничего — квота
// домена уже съедала прогресс Практики, а сами тексты маленькие.
//
// Перезапрос — по ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access меняет строку каждые несколько
// минут, и движок пересоздавался бы посреди чтения.
//
// Статусы как у «Грамматики · игр»: guest (Д12 — раздел только со входом), missing (пустой список или 404 —
// «Раздел готовится»), error («Повторить»), ready. Сбой списка попыток экран не роняет: попытки — довесок.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getSpeedReadingAttempts, getSpeedReadingTexts, postSpeedReadingAttempt } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'
import { normalizeAttempt, normalizeText } from '../../practice/speed-reading/data.js'

// Сеть оборвалась на сдаче — ещё две попытки через 2 с: монеты и «Мои попытки» на другом устройстве держатся на
// том, что попытка дошла. 409 — бэкенд как раз записывает попытку того же текста с монетами (две сдачи разом):
// повтор запишется уже без монет. Остальные ответы сервера (400, 404…) не повторяем — они не изменятся.
const SUBMIT_RETRIES = 2
const SUBMIT_DELAY_MS = 2000

const listOf = (raw, key) => (Array.isArray(raw) ? raw : Array.isArray(raw?.[key]) ? raw[key] : [])

export function useSpeedReadingData(token) {
  const owner = ownerOf(token)
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', texts: null, attempts: [] })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', texts: null, attempts: [] })
      return undefined
    }
    let alive = true
    setState((st) => (st.texts ? st : { status: 'loading', texts: null, attempts: [] }))
    const attempts = getSpeedReadingAttempts(tk)
      .then((raw) => listOf(raw, 'items').map(normalizeAttempt))
      .catch(() => [])
    Promise.all([getSpeedReadingTexts(tk), attempts])
      .then(([raw, list]) => {
        if (!alive) return
        const texts = listOf(raw, 'texts').map(normalizeText).filter(Boolean)
        setState(texts.length ? { status: 'ready', texts, attempts: list } : { status: 'missing', texts: null, attempts: [] })
      })
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', texts: null, attempts: [] }))
    return () => {
      alive = false
    }
  }, [owner, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  const submit = useCallback(async (body) => {
    for (let i = 0; ; i++) {
      try {
        // Токен — свежий на момент отправки: повтор после обрыва уйдёт уже с обновлённым access.
        return await postSpeedReadingAttempt(tokenRef.current, body)
      } catch (e) {
        if ((e?.status && e.status !== 409) || i >= SUBMIT_RETRIES) throw e
        await new Promise((resolve) => setTimeout(resolve, SUBMIT_DELAY_MS))
      }
    }
  }, [])

  return { ...state, retry, submit, tokenRef }
}
