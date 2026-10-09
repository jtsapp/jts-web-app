import { useCallback, useEffect, useState } from 'react'
import { getIeltsTests } from '../../api.js'
import { loadToken } from '../../lib/session.js'

// Каталог навыка с бэкенда (опубликованные тесты + последняя/лучшая попытка ученика на каждом).
// status: loading | ready | error | guest — без входа каталога нет: тесты и попытки привязаны к аккаунту.
export function useIeltsCatalog(token, skill) {
  const [state, setState] = useState({ status: 'loading', items: [] })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    const authToken = token || loadToken()
    let alive = true
    const load = authToken ? getIeltsTests(authToken, skill) : Promise.reject(Object.assign(new Error('guest'), { guest: true }))
    load
      .then((items) => alive && setState({ status: 'ready', items: Array.isArray(items) ? items : [] }))
      .catch((e) => alive && setState({ status: e?.guest || e?.status === 401 ? 'guest' : 'error', items: [] }))
    return () => {
      alive = false
    }
  }, [token, skill, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}

export function useReadingCatalog(token) {
  return useIeltsCatalog(token, 'reading')
}

export function useListeningCatalog(token) {
  return useIeltsCatalog(token, 'listening')
}

// Трек ученика (Academic / General Training). Пока онбординга раздела нет (часть 5), трек выбирает сам ученик
// переключателем, и выбор помнит браузер; с онбордингом он придёт из профиля.
const TRACK_KEY = 'jts_ielts_track'

export function useIeltsTrack() {
  const [track, setTrack] = useState('academic')
  useEffect(() => {
    try {
      const v = localStorage.getItem(TRACK_KEY)
      // читаем после монтирования, иначе сервер и клиент нарисуют разный трек
      if (v === 'general' || v === 'academic') setTrack(v)
    } catch {
      /* без хранилища — Academic по умолчанию */
    }
  }, [])
  const choose = useCallback((v) => {
    setTrack(v)
    try {
      localStorage.setItem(TRACK_KEY, v)
    } catch {
      /* выбор просто не запомнится */
    }
  }, [])
  return [track, choose]
}
