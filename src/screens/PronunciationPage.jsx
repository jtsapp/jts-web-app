'use client'

// Pronunciation World — курс английского произношения: шесть уровней A0–C1,
// 44 темы. У темы объяснение экранами (схемы рта, губ, гласных, ударение,
// интонация; «Ваша очередь» — запись себя и сравнение с образцом) и игра на
// слух Echo Gates.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/pronunciation/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/pronunciation): методист заливает
// прототип в web-admin, в бандле сайта курса нет. Интерфейс раздела английский
// (язык упражнения), перевод объяснений ru/kk — кнопкой внутри объяснения, как
// в прототипе; i18n приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountPronunciation } from '../practice/pronunciation/engine.js'
import { PRONUNCIATION_CSS } from '../practice/pronunciation/styles.js'
import { readPronunciation, writePronunciation } from '../practice/pronunciation/progress.js'
import { speakPronunciation, stopPronunciation } from '../practice/pronunciation/voice.js'
import { PRONUNCIATION_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { playUrl, prefetchUrl } from '../lib/speech.js'
import { usePronunciationData } from './pronunciation/usePronunciationData.js'

const FALLBACK_FONT = "'Manrope', sans-serif"

// Что открыла Луна (initialTarget): { topic: 'A1.3' } — объяснение темы, { level: 'A1' } — уровень на карте
// (тема важнее, если пришло оба). Сверяем с курсом, который собрал сам движок из бандла (P.byId, P.topicsList):
// темы нет или у уровня ни одной темы (методист перезалил, ссылка устарела) — обычная карта, без ошибки.
function targetRoute(target, P) {
  if (!target) return null
  const norm = (v) => (typeof v === 'string' ? v.trim().toUpperCase() : '')
  const topic = norm(target.topic)
  if (topic && P.byId(topic)) return `#/learn/${topic}`
  const level = norm(target.level)
  if (level && P.topicsList().some((T) => T.level === level)) return `#/level/${level}`
  return null
}

export default function PronunciationPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget = null }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  // Цель Луны — на один заход (App пересоздаёт экран на каждый её переход). Пересоздание движка внутри захода
  // (StrictMode, вход, новый релиз курса) возвращает к цели, только пока ученик на ней и стоит, — ушёл дальше, и
  // цель забыта.
  const targetRef = useRef(initialTarget)
  const { status, bundle, retry } = usePronunciationData(token)
  const owner = ownerOf(token)
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'speaking' }))
  // Шрифт интерфейса меняется вместе с языком (kk — Inter): переносим его в тень заново, без пересоздания движка.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--pron-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
  }, [lang])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени: --head/--ui прототипа берут его отсюда (Manrope, в kk — Inter). Ставим ДО
    // отрисовки содержимого тени, иначе первый кадр пойдёт системным шрифтом.
    host.style.setProperty('--pron-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
    shadow.innerHTML = `<style>${PRONUNCIATION_CSS}</style><div class="pron"><div id="app"></div></div>`
    // Хранилище шлёт событие прогресса и на свою же запись, синхронно. Карта раздела пишет уровень при каждой
    // отрисовке, и перерисовка «по событию» на свою запись зацикливалась (Maximum call stack) — свои записи
    // помечаем и событие от них пропускаем.
    let ownWrite = false
    const api = mountPronunciation(shadow.querySelector('.pron'), {
      bundle,
      progress: readPronunciation,
      onProgress: (state) => {
        ownWrite = true
        try {
          writePronunciation(state)
        } finally {
          ownWrite = false
        }
      },
      onAnswer: (ok) => recordSkill('listening', ok),
      playUrl,
      prefetch: prefetchUrl,
      speak: speakPronunciation,
      // и общий плеер, и голос устройства: уход с экрана раздела глушит любую озвучку
      stopSpeech: stopPronunciation,
      // onExit не передаём: выход из раздела — кнопка оболочки «← В Практику» (как у Prepositions World). Она же
      // держит строку под группой «язык · колокольчик» (.learn__bell) — без неё та легла бы на перевод в шапке
      // раздела, а вторая «назад» в шапке движка была бы лишней.
      // Прототип был страницей и не прокручивал её при переходах: игра у него — fixed на весь экран. У нас она
      // блок высотой с окно, поэтому раунд встаёт верхом к верху окна, а остальные экраны — с начала страницы.
      onRoute: (hash) => {
        const play = hash.startsWith('#/play/')
        host.dataset.game = play ? '1' : ''
        if (play) host.scrollIntoView({ block: 'start' })
        else window.scrollTo(0, 0)
      },
      fast: typeof window !== 'undefined' && !!window.__PRON_FAST,
    })
    // Тест e2e узнаёт верные ворота у самой игры (наружу они не выдаются — как и ученику).
    if (window.__PRON_E2E) window.__pron = api
    // Снимок прогресса с сервера приходит позже первого кадра (новое устройство): карта показала бы пустые звёзды.
    // Перерисовываем только карту — посреди объяснения или раунда не трогаем.
    const onProgress = () => {
      if (ownWrite) return
      const h = api.snapshot().hash
      if (h === '#/' || h.startsWith('#/level/')) api.P.route()
    }
    window.addEventListener(PRONUNCIATION_PROGRESS_EVENT, onProgress)
    // Данные уже есть (эффект ждёт бандл), движок нарисовал карту — переходим, как по ссылке карты: «назад» из
    // объяснения ведёт на карту, как обычно.
    const want = targetRoute(targetRef.current, api.P)
    if (want) api.go(want)
    else targetRef.current = null
    return () => {
      if (want && api.snapshot().hash !== want) targetRef.current = null
      window.removeEventListener(PRONUNCIATION_PROGRESS_EVENT, onProgress)
      if (window.__pron === api) delete window.__pron
      api.destroy()
      shadow.innerHTML = ''
      host.dataset.game = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил курс
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('pronunciation.guest')
      : status === 'missing' ? t('pronunciation.notUploaded')
        : status === 'error' ? t('pronunciation.loadFailed')
          : status === 'loading' ? t('pronunciation.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="prn-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('pronunciation.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state prn-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('pronunciation.retry')}
            </button>
          )}
        </div>
      )}
      <div className="prn-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
