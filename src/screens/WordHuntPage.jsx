'use client'

// Word Hunt — кроссворд и поиск слов над словарём курса A0–B2 и 16 станций
// лексики по специальности: карта миров и уроков, три шага кроссворда по
// CEFR-политике подсказок, три сложности поиска и «на время», награды, серия
// дней, слова на повторение.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/wordhunt/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/word-hunt): методист заливает
// прототип в web-admin, в бандле сайта словаря нет. Интерфейс раздела — RU/KZ
// (своих текстов прототипа на английском нет): казахский интерфейс приложения
// даёт KZ, остальные — RU; i18n приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountWordHunt } from '../practice/wordhunt/engine.js'
import { WORDHUNT_CSS } from '../practice/wordhunt/styles.js'
import { readWip, readWordHunt, writeWip, writeWordHunt } from '../practice/wordhunt/progress.js'
import { sayWord, stopWords } from '../practice/wordhunt/voice.js'
import { WORDHUNT_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { loadToken } from '../lib/session.js'
import { useWordHuntData } from './wordhunt/useWordHuntData.js'

const engineLang = (lang) => (lang === 'kk' ? 'kk' : 'ru')

export default function WordHuntPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const apiRef = useRef(null)
  const { status, bundle, retry } = useWordHuntData(token)
  const owner = ownerOf(token)
  const langRef = useRef(lang)
  // Без истории — во вкладку «Грамматика»: карточка Word Hunt там с редизайна 29.10.2026.
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'grammarGames' }))

  // Смена языка приложения — перерисовка текущего вида движком, без пересоздания: кроссворд посреди партии
  // не сбрасывается. Эффект объявлен РАНЬШЕ монтирующего: на первом кадре движок видит актуальный язык.
  useEffect(() => {
    langRef.current = lang
    apiRef.current?.setLang(engineLang(lang))
  }, [lang])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${WORDHUNT_CSS}</style><div class="wh"></div>`
    // Пишем только за того, кто открыл раздел. Выход из аккаунта (и выход по 401) чистит хранилище практики
    // синхронно, а движок снимается позже, на коммите React, — и его прощальная запись (недорешённая сетка,
    // итог партии) легла бы следующему ученику этого компьютера.
    const mine = () => ownerOf(loadToken()) === owner
    const api = mountWordHunt(shadow.querySelector('.wh'), {
      bundle,
      lang: engineLang(langRef.current),
      progress: { read: readWordHunt, write: (s) => mine() && writeWordHunt(s) },
      wip: { read: readWip, write: (w) => mine() && writeWip(w) },
      say: sayWord,
      stopAudio: stopWords,
      onWord: (ok) => mine() && recordSkill('vocab', ok),
    })
    apiRef.current = api
    // Снимок прогресса с сервера приходит позже первого кадра (новое устройство): главная и карта показали бы
    // «0 слов» до первого клика. Движок перерисует их сам, посреди партии вид не тронет.
    const onProgress = () => api.reload()
    window.addEventListener(WORDHUNT_PROGRESS_EVENT, onProgress)
    // e2e (tests/wordhunt.spec.js) решает кроссворд по ответам сетки — только с флагом теста.
    if (window.__WORDHUNT_E2E) window.__WORDHUNT_E2E.api = api
    return () => {
      window.removeEventListener(WORDHUNT_PROGRESS_EVENT, onProgress)
      apiRef.current = null
      api.destroy()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил прототип
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('wordhunt.guest')
      : status === 'missing' ? t('wordhunt.notUploaded')
        : status === 'error' ? t('wordhunt.loadFailed')
          : status === 'loading' ? t('wordhunt.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="whp-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('wordhunt.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state whp-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('wordhunt.retry')}
            </button>
          )}
        </div>
      )}
      <div className="whp-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
