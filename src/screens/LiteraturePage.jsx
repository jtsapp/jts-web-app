'use client'

// Literature World — литература на английском: открытая книга с четырьмя
// маскотами, семь глав (Шекспир, драма, поэзия, проза, готика, слова, эпохи) и
// четыре переулка (стишки, пословицы, регистры и сленг, мастерская). 26 пьес
// целиком, рассказы и главы романов, стихи с записями настоящих чтецов, 360 слов
// «шесть шагов» и практика по настоящим строкам.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/literature/engine.js, собран scripts/literature/build-engine.js),
// React его монтирует и снимает. Движок живёт в Shadow DOM: классы прототипа
// совпадают с глобальными классами сайта. Материал транслируется с бэкенда
// (/mobile/literature): методист заливает прототип в web-admin, в бандле сайта
// раздела нет. Язык интерфейса раздела (en / kz / ru) и подсказок — свой
// переключатель в шапке раздела, по умолчанию — язык приложения; i18n
// приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountLiterature } from '../practice/literature/engine.js'
import { LITERATURE_CSS } from '../practice/literature/styles.js'
import { LITERATURE_DARK_CSS } from '../practice/literature/styles.dark.js'
import { readLiterature, writeLiterature } from '../practice/literature/progress.js'
import { readDrafts, readLang, writeDrafts, writeLang } from '../practice/literature/device.js'
import { speakLiterature, stopLiterature } from '../practice/literature/voice.js'
import { LITERATURE_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { watchAppTheme } from '../practice/hostTheme.js'
import { useLiteratureData } from './literature/useLiteratureData.js'

const FALLBACK_FONT = "'Manrope', sans-serif"

// Прокручивается то окно, то колонка кабинета (на телефоне). y — от верха раздела; «наверх» (0) — к началу страницы:
// над разделом только кнопка «← В Практику», а прототип в этом месте шёл к началу своей страницы.
function scrollSection(host, y) {
  const main = host.closest('.learn__main')
  const scrolls = !!main && main.scrollHeight > main.clientHeight + 1 && getComputedStyle(main).overflowY !== 'visible'
  if (y <= 0) {
    if (scrolls) main.scrollTop = 0
    window.scrollTo(0, 0)
    return
  }
  const delta = host.getBoundingClientRect().top + y
  if (scrolls) main.scrollTop += delta - main.getBoundingClientRect().top
  else window.scrollTo(0, window.scrollY + delta)
}

// Сколько занимает приложение над разделом, когда страница прокручена к началу: герой входа прототипа — «окно минус
// шапка», и без этой поправки его низ (ряд цифр) уходил под край окна.
function measureAbove(host) {
  const main = host.closest('.learn__main')
  const scrolls = !!main && main.scrollHeight > main.clientHeight + 1 && getComputedStyle(main).overflowY !== 'visible'
  const top = host.getBoundingClientRect().top + (window.scrollY || 0) + (scrolls ? main.scrollTop : 0)
  host.style.setProperty('--lit-above', `${Math.max(0, Math.round(top))}px`)
}

export default function LiteraturePage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])
  const { status, bundle, retry } = useLiteratureData(token)
  const owner = ownerOf(token)
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'reading' }))
  // Шрифт интерфейса меняется вместе с языком приложения (kk — Inter): переносим его в тень заново, без пересоздания движка.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--lit-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
  }, [lang])
  // Тёмная тема — приложения: тень её не видит, поэтому атрибутом хоста и вслед за кнопкой темы.
  useEffect(() => (hostRef.current ? watchAppTheme(hostRef.current) : undefined), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени ДО отрисовки содержимого: иначе первый кадр пойдёт системным шрифтом.
    host.style.setProperty('--lit-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
    measureAbove(host)
    const onResize = () => measureAbove(host)
    window.addEventListener('resize', onResize)
    shadow.innerHTML = `<style>${LITERATURE_CSS}\n${LITERATURE_DARK_CSS}</style><div class="lw"></div>`
    // Хранилище шлёт событие прогресса и на свою же запись, синхронно: свои записи помечаем и событие от них
    // пропускаем (у Pronunciation World перерисовка «по событию» на свою запись зацикливалась).
    let ownWrite = false
    // Свои предложения — устройство. Копия в памяти монтажа: забитый localStorage роняет запись молча.
    let drafts = readDrafts()
    const appLang = langRef.current
    const api = mountLiterature(shadow.querySelector('.lw'), {
      bundle,
      progress: readLiterature,
      onProgress: (state) => {
        ownWrite = true
        try {
          // блокнот уходит как есть: слово, убранное из него, остаётся убранным
          writeLiterature(state)
        } finally {
          ownWrite = false
        }
      },
      drafts: () => drafts,
      onDrafts: (d) => {
        drafts = writeDrafts(d)
      },
      lang: readLang(appLang),
      onLang: (l) => writeLang(l, appLang),
      // Шаги слова и Words Lab — «Словарь»; порядок строк, рифма, пословица, вопросы к тексту — «Чтение».
      onAnswer: (kind, ok) => recordSkill(kind === 'vocab' ? 'vocab' : 'reading', ok),
      speak: (text) => (text ? speakLiterature(text) : stopLiterature()),
      scrollTo: (y) => scrollSection(host, y),
      // onExit не передаём: выход из раздела — кнопка оболочки «← В Практику» (как у Parts of Speech World). Она же
      // держит строку под группой «язык · колокольчик» (.learn__bell) — без неё та легла бы на шапку раздела.
    })
    // Тест e2e открывает экраны движка напрямую (адрес движка — не адрес страницы).
    if (window.__LIT_E2E) window.__lit = api
    const onProgress = () => {
      if (!ownWrite) api.refresh()
    }
    window.addEventListener(LITERATURE_PROGRESS_EVENT, onProgress)
    return () => {
      window.removeEventListener(LITERATURE_PROGRESS_EVENT, onProgress)
      window.removeEventListener('resize', onResize)
      if (window.__lit === api) delete window.__lit
      api.destroy()
      stopLiterature()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — блокнот уже другого ученика; bundle — методист перезалил раздел
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('literature.guest')
      : status === 'missing' ? t('literature.notUploaded')
        : status === 'error' ? t('literature.loadFailed')
          : status === 'loading' ? t('literature.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="lit-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('literature.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state lit-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('literature.retry')}
            </button>
          )}
        </div>
      )}
      <div className="lit-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
