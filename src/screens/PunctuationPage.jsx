'use client'

// Punctuation World — пунктуация английского от A0 до C2: 20 страниц на пяти
// островах. У страницы урок (Learn: что это, работа знака, когда, почему, как;
// «Hear the difference», реальный документ, «Don't confuse») и игра (Play) —
// приключение Декстера в семь стадий по банку предложений.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/punctuation/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/punctuation): методист заливает
// прототип в web-admin, в бандле сайта раздела нет. Интерфейс раздела
// английский (язык упражнения), перевод ru/kk — кнопкой «Aizere translates»
// внутри раздела, как в прототипе; i18n приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountPunctuation } from '../practice/punctuation/engine.js'
import { PUNCTUATION_CSS } from '../practice/punctuation/styles.js'
import { readPunctuation, writePunctuation } from '../practice/punctuation/progress.js'
import { readPrefs, readRuns, writePrefs, writeRuns } from '../practice/punctuation/device.js'
import { speakPunctuation, stopPunctuation } from '../practice/punctuation/voice.js'
import { PUNCTUATION_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { usePunctuationData } from './punctuation/usePunctuationData.js'

const FALLBACK_FONT = "'Manrope', sans-serif"

export default function PunctuationPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const { status, bundle, retry } = usePunctuationData(token)
  const owner = ownerOf(token)
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'grammarGames' }))
  // Шрифт интерфейса меняется вместе с языком (kk — Inter): переносим его в тень заново, без пересоздания движка.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--punct-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
  }, [lang])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени: --font прототипа берёт его отсюда (Manrope, в kk — Inter). Ставим ДО отрисовки
    // содержимого тени, иначе первый кадр пойдёт системным шрифтом.
    host.style.setProperty('--punct-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
    shadow.innerHTML = `<style>${PUNCTUATION_CSS}</style><div class="punct"><div id="app"></div></div>`
    // Хранилище шлёт событие прогресса и на свою же запись, синхронно: перерисовка главной «по событию» на свою
    // запись — лишний круг (у Pronunciation World он зацикливался), поэтому свои записи помечаем и пропускаем.
    let ownWrite = false
    // Вид и недоигранное приключение — устройство. Копия в памяти монтажа: забитый localStorage (кэш каталогов под
    // входом) роняет запись молча, а движок перечитывает их на каждом экране.
    let prefs = readPrefs()
    let runs = readRuns()
    const api = mountPunctuation(shadow.querySelector('.punct'), {
      bundle,
      progress: readPunctuation,
      onProgress: (state) => {
        ownWrite = true
        try {
          writePunctuation(state)
        } finally {
          ownWrite = false
        }
      },
      prefs: () => prefs,
      onPrefs: (p) => {
        prefs = writePrefs(p)
      },
      runs: () => runs,
      onRuns: (r) => {
        runs = writeRuns(r)
      },
      // Камень, плот, мост, табличка: решено ли задание с первой попытки — навык «Грамматика».
      onAnswer: (ok) => recordSkill('grammar', ok),
      speak: speakPunctuation,
      stopSpeech: stopPunctuation,
      // onExit не передаём: выход из раздела — кнопка оболочки «← В Практику» (как у Pronunciation World). Она же
      // держит строку под группой «язык · колокольчик» (.learn__bell) — без неё та легла бы на перевод и звук в
      // шапке раздела.
      // Игра у прототипа — вся страница (100dvh, без шапки сайта); у нас — блок высотой с окно, поэтому
      // приключение встаёт верхом к верху окна. Остальные экраны прокручивает сам движок (как прототип).
      onRoute: (hash) => {
        const play = hash.startsWith('#/play/')
        host.dataset.game = play ? '1' : ''
        if (play) host.scrollIntoView({ block: 'start' })
      },
    })
    // Тест e2e узнаёт верный знак у самой игры (наружу он не выдаётся — как и ученику).
    if (window.__PUNCT_E2E) window.__punct = api
    // Снимок прогресса с сервера приходит позже первого кадра (новое устройство): главная показала бы пустые звёзды.
    // Перерисовываем только главную и острова — посреди урока или приключения не трогаем.
    const onProgress = () => {
      if (ownWrite) return
      const h = api.snapshot().hash
      if (h === '#/' || h.startsWith('#/islands')) api.route()
    }
    window.addEventListener(PUNCTUATION_PROGRESS_EVENT, onProgress)
    return () => {
      window.removeEventListener(PUNCTUATION_PROGRESS_EVENT, onProgress)
      if (window.__punct === api) delete window.__punct
      api.destroy()
      shadow.innerHTML = ''
      host.dataset.game = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил раздел
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('punctuation.guest')
      : status === 'missing' ? t('punctuation.notUploaded')
        : status === 'error' ? t('punctuation.loadFailed')
          : status === 'loading' ? t('punctuation.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="pct-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('punctuation.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state pct-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('punctuation.retry')}
            </button>
          )}
        </div>
      )}
      <div className="pct-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
