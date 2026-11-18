'use client'

// Parts of Speech World — части речи английского от A0 до C2: карта мира из
// девяти островов с четырьмя маскотами, 16 юнитов (объяснение по частям и
// упражнения: выбрать класс слова, отметить слова, вписать форму, исправить
// ошибку, собрать предложение, написать своё) и игра «Quests» — 14 дел, у дела
// стадии на десяти движках.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/partsofspeech/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/parts-of-speech): методист заливает
// прототип в web-admin, в бандле сайта раздела нет. Интерфейс раздела
// английский (язык упражнения), перевод kk/ru под английским текстом —
// кнопками в шапке раздела, как в прототипе; i18n приложения — только у
// оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountPartsOfSpeech } from '../practice/partsofspeech/engine.js'
import { PARTSOFSPEECH_CSS } from '../practice/partsofspeech/styles.js'
import { PARTSOFSPEECH_DARK_CSS } from '../practice/partsofspeech/styles.dark.js'
import { readPartsOfSpeech, savePartsOfSpeech } from '../practice/partsofspeech/progress.js'
import { readDrafts, readLang, readPrefs, writeDrafts, writeLang, writePrefs } from '../practice/partsofspeech/device.js'
import { PARTSOFSPEECH_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { watchAppTheme } from '../practice/hostTheme.js'
import { usePartsOfSpeechData } from './partsofspeech/usePartsOfSpeechData.js'

const FALLBACK_FONT = "'Manrope', sans-serif"

// Экраны, которые показывают прогресс целиком (карта мира с отметками уроков, доска квестов): их перерисовываем,
// когда снимок сервера пришёл позже первого кадра. Посреди урока и дела не трогаем.
const overview = (hash) => hash === '#map' || hash === '#toc' || hash === '#bureau'

export default function PartsOfSpeechPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const { status, bundle, retry } = usePartsOfSpeechData(token)
  const owner = ownerOf(token)
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'grammar' }))
  // Шрифт интерфейса меняется вместе с языком (kk — Inter): переносим его в тень заново, без пересоздания движка.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--pos-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
  }, [lang])
  // Тёмная тема — приложения: тень её не видит, поэтому атрибутом хоста и вслед за кнопкой темы.
  useEffect(() => (hostRef.current ? watchAppTheme(hostRef.current) : undefined), [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени: гарнитуры прототипа берут его отсюда (Manrope, в kk — Inter). Ставим ДО отрисовки
    // содержимого тени, иначе первый кадр пойдёт системным шрифтом.
    host.style.setProperty('--pos-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
    shadow.innerHTML = `<style>${PARTSOFSPEECH_CSS}\n${PARTSOFSPEECH_DARK_CSS}</style><div class="posw"></div>`
    // Хранилище шлёт событие прогресса и на свою же запись, синхронно: свои записи помечаем и событие от них
    // пропускаем (у Pronunciation World перерисовка «по событию» на свою запись зацикливалась).
    let ownWrite = false
    // Вид и черновики — устройство. Копия в памяти монтажа: забитый localStorage (кэш каталогов под входом) роняет
    // запись молча, а движок читает их при каждом монтаже.
    let prefs = readPrefs()
    let drafts = readDrafts()
    const api = mountPartsOfSpeech(shadow.querySelector('.posw'), {
      bundle,
      progress: readPartsOfSpeech,
      onProgress: (state, info) => {
        ownWrite = true
        try {
          // сведение с хранилищем и сброс «Replay this quest» — в progress.js
          savePartsOfSpeech(state, info?.reset)
        } finally {
          ownWrite = false
        }
      },
      // Упражнение юнита и первая попытка задания стадии — навык «Грамматика».
      onAnswer: (ok) => recordSkill('grammar', ok),
      lang: readLang(),
      onLang: writeLang,
      prefs: () => prefs,
      onPrefs: (p) => {
        prefs = writePrefs(p)
      },
      drafts: () => drafts,
      onDrafts: (d) => {
        drafts = writeDrafts(d)
      },
      // onExit не передаём: выход из раздела — кнопка оболочки «← В Практику» (как у Tenses и Punctuation World). Она
      // же держит строку под группой «язык · колокольчик» (.learn__bell) — без неё та легла бы на шапку раздела.
    })
    // Тест e2e открывает экраны движка напрямую (адрес движка — не адрес страницы).
    if (window.__POS_E2E) window.__pos = api
    const onProgress = () => {
      if (!ownWrite && overview(api.snapshot().hash)) api.refresh()
    }
    window.addEventListener(PARTSOFSPEECH_PROGRESS_EVENT, onProgress)
    return () => {
      window.removeEventListener(PARTSOFSPEECH_PROGRESS_EVENT, onProgress)
      if (window.__pos === api) delete window.__pos
      api.destroy()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил раздел
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('partsofspeech.guest')
      : status === 'missing' ? t('partsofspeech.notUploaded')
        : status === 'error' ? t('partsofspeech.loadFailed')
          : status === 'loading' ? t('partsofspeech.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="pos-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('partsofspeech.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state pos-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('partsofspeech.retry')}
            </button>
          )}
        </div>
      )}
      <div className="pos-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
