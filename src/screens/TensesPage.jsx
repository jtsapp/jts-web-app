'use client'

// Tenses World — 12 английских времён: карта времён, страница времени
// (видеоурок, правила, формулы, сигналы, ошибки, сравнения, Formula Lab, итог)
// и практика — пять этапов, 26 наборов заданий.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/tenses/engine.js), React его монтирует и снимает. Движок живёт
// в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/tenses): методист заливает
// прототип в web-admin, видео лежат в бакете, в бандле сайта раздела нет.
// Интерфейс раздела английский (язык упражнения), перевод kz/ru — кнопками в
// шапке раздела, как в прототипе; i18n приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountTenses } from '../practice/tenses/engine.js'
import { TENSES_CSS } from '../practice/tenses/styles.js'
import { readTenses, writeTenses } from '../practice/tenses/progress.js'
import { speakTenses, stopTenses } from '../practice/tenses/voice.js'
import { TENSES_LANG_KEY, TENSES_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { watchAppTheme } from '../practice/hostTheme.js'
import { useTensesData } from './tenses/useTensesData.js'

const FALLBACK_FONT = "'Manrope', sans-serif"

// Язык перевода раздела — настройка устройства (коды прототипа: en | kz | ru), как язык «Чисел»; при выходе её
// чистит clearLocalPractice. Хранилище недоступно — язык живёт до ухода с экрана.
function readLang() {
  try {
    return localStorage.getItem(TENSES_LANG_KEY) || 'en'
  } catch {
    return 'en'
  }
}
function saveLang(l) {
  try {
    localStorage.setItem(TENSES_LANG_KEY, l)
  } catch {
    /* приватный режим / квота — язык только на этот заход */
  }
}

// Экраны, которые показывают прогресс целиком (карта с отметками, путь практики): их перерисовываем, когда снимок
// сервера пришёл позже первого кадра. Посреди урока и набора не трогаем.
const overview = (hash) => hash === '#/' || hash === '#map' || hash === '#/practice'

export default function TensesPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const { status, bundle, retry } = useTensesData(token)
  const owner = ownerOf(token)
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'grammarGames' }))
  // Шрифт интерфейса меняется вместе с языком (kk — Inter): переносим его в тень заново, без пересоздания движка.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--tw-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
  }, [lang])
  // Тёмная тема — приложения: тень её не видит, поэтому атрибутом хоста и вслед за кнопкой темы.
  useEffect(() => (hostRef.current ? watchAppTheme(hostRef.current) : undefined), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени: --font-head/--font-body прототипа берут его отсюда. Ставим ДО отрисовки содержимого
    // тени, иначе первый кадр пойдёт системным шрифтом.
    host.style.setProperty('--tw-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
    shadow.innerHTML = `<style>${TENSES_CSS}</style><div class="tws"><div id="tw-root"></div></div>`
    // Хранилище шлёт событие прогресса и на свою же запись, синхронно: свои записи помечаем и событие от них
    // пропускаем (у Pronunciation World перерисовка «по событию» на свою запись зацикливалась).
    let ownWrite = false
    const api = mountTenses(shadow.querySelector('.tws'), {
      bundle,
      progress: readTenses,
      onProgress: (state) => {
        ownWrite = true
        try {
          writeTenses(state)
        } finally {
          ownWrite = false
        }
      },
      onAnswer: (ok) => recordSkill('grammar', ok),
      speak: speakTenses,
      // и общий плеер, и голос устройства: смена экрана раздела и уход с него глушат любую озвучку
      stopSpeech: stopTenses,
      lang: readLang(),
      onLang: saveLang,
      // onExit не передаём: выход из раздела — кнопка оболочки «← В Практику» (как у Pronunciation World). Она же
      // держит строку под группой «язык · колокольчик» (.learn__bell) — без неё та легла бы на шапку раздела.
    })
    // Тест e2e открывает экраны движка напрямую (адрес движка — не адрес страницы).
    if (window.__TENSES_E2E) window.__tenses = api
    const onProgress = () => {
      if (!ownWrite && overview(api.snapshot().hash)) api.refresh()
    }
    window.addEventListener(TENSES_PROGRESS_EVENT, onProgress)
    return () => {
      window.removeEventListener(TENSES_PROGRESS_EVENT, onProgress)
      if (window.__tenses === api) delete window.__tenses
      api.destroy()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил раздел
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('tenses.guest')
      : status === 'missing' ? t('tenses.notUploaded')
        : status === 'error' ? t('tenses.loadFailed')
          : status === 'loading' ? t('tenses.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="tns-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('tenses.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state tns-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('tenses.retry')}
            </button>
          )}
        </div>
      )}
      <div className="tns-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
