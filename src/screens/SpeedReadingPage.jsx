'use client'

// «Скорочтение» — тренажёр вкладки «Аудирование»: ученик выбирает текст и скорость, слушает образец диктора с
// подсветкой слов, читает вслух за телесуфлёром и получает итог — процент прочитанного, звёзды, свой темп и
// свою запись (спека 2026-10-25-grammar-games-speed-reading-design, B3).
//
// Экран — оболочка: разметку и поведение рисует перенесённый экран прототипа кабинета
// (src/practice/speed-reading/engine.js), React его монтирует и снимает. Движок живёт в Shadow DOM: классы
// прототипа совпадают с глобальными классами сайта. Тексты и попытки приходят с бэкенда (тексты заводит
// контент-менеджер в web-admin), монеты считает бэкенд — сюда приходит только их число.
//
// Голос ученика не хранится нигде (Д6): WAV уходит только в /api/transcribe, который ничего не сохраняет, а
// на бэкенд — цифры попытки. Образец озвучки создаёт роут сайта /api/practice/speed-reading/sample при первом
// открытии текста и играет общим элементом озвучки (playUrl) — там же разрешение iPhone на звук.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { playUrl, stopTts } from '../lib/speech.js'
import { mountSpeedReading } from '../practice/speed-reading/engine.js'
import { SPEED_READING_CSS } from '../practice/speed-reading/styles.js'
import { canRecord, openRecorder } from '../practice/speed-reading/recorder.js'
import { browserRecognition, startLive } from '../practice/speed-reading/live.js'
import { requestSample } from '../practice/speed-reading/sampleClient.js'
import { ownerOf } from '../practice/progressStore.js'
import { useSpeedReadingData } from './speed-reading/useSpeedReadingData.js'

// Маскоты — те же картинки, что у «Грамматики · игр» (кабинет прототипа один). Адресом, а не импортом emoji.js
// грамматики: тот тянет в бандл список 563 эмодзи.
const img = (name) => (name === 'coin' ? '/assets/coin-star.png' : `/practice/grammar-games/img/${name}.webp`)

// Распознавание записи — наш /api/transcribe (Azure, запасной — Soniox) во всех браузерах (Д7). null — не
// ответил: движок посчитает итог по живому распознаванию или скажет «оценка недоступна».
const TRANSCRIBE_TIMEOUT_MS = 90000
async function transcribe(wav) {
  try {
    const form = new FormData()
    form.append('audio', wav, 'speed-reading.wav')
    const res = await fetch('/api/transcribe', { method: 'POST', body: form, signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS) })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.text === 'string' ? data.text : null
  } catch {
    return null
  }
}

const hostFont = (host) => getComputedStyle(host).fontFamily || "'Manrope', sans-serif"

export default function SpeedReadingPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const apiRef = useRef(null)
  const { status, texts, attempts, retry, submit, tokenRef } = useSpeedReadingData(token)
  const owner = ownerOf(token)

  // Язык и текст по ссылке нужны движку только при монтировании: смена языка дальше идёт через setLang, а
  // пересоздание по каждому из них выкидывало бы ученика из записи на стартовый экран.
  const live = useRef({})
  useEffect(() => {
    live.current = { lang, text: initialTarget?.text || null }
  })
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'listening' }))

  useEffect(() => {
    const host = hostRef.current
    if (!host || !texts) return undefined
    const now = live.current
    let mounted = true
    // attachShadow — один раз на элемент: при пересоздании (вход, перезапрос списка, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени (Manrope, на телефоне PT Root UI, в kk — Inter) — до отрисовки.
    host.style.setProperty('--sr-font', hostFont(host))
    shadow.innerHTML = `<style>${SPEED_READING_CSS}</style><div class="sr"></div>`
    const api = mountSpeedReading(shadow.querySelector('.sr'), {
      // Копии: движок дописывает образец в текст, а список хука остаётся как пришёл.
      texts: texts.map((x) => ({ ...x })),
      attempts,
      lang: now.lang,
      initialText: now.text,
      img,
      playSample: (url, rate, h) => playUrl(url, { rate, onTime: h.onTime, onEnd: h.onEnd, onCancel: h.onEnd, onFail: h.onFail }),
      stopSample: stopTts,
      ensureSample: (id) => requestSample(id, { token: tokenRef.current, alive: () => mounted }),
      canRecord: () => canRecord(),
      openRecorder: (opts) => openRecorder(opts),
      startLive: (h) => startLive({ createRecognition: () => browserRecognition(), ...h }),
      transcribe,
      submitAttempt: submit,
      // Прокручивается то окно, то колонка кабинета (на телефоне) — сбрасываем обе.
      scrollTop: () => {
        const main = host.closest('.learn__main')
        if (main) main.scrollTop = 0
        window.scrollTo(0, 0)
      },
    })
    apiRef.current = api
    return () => {
      mounted = false
      api.destroy()
      apiRef.current = null
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — тексты и попытки уже другого ученика; texts и attempts — свежий заход (приходят
    // вместе); submit и tokenRef постоянны.
  }, [texts, attempts, owner, submit, tokenRef])

  useEffect(() => {
    apiRef.current?.setLang(lang)
    // Шрифт — кадром позже: html[data-ui-lang] (в kk — Inter) ставит эффект I18nProvider, а эффекты потомков
    // идут раньше родительских — в этом же тике хост ещё на шрифте прежнего языка.
    const id = requestAnimationFrame(() => {
      const host = hostRef.current
      if (host) host.style.setProperty('--sr-font', hostFont(host))
    })
    return () => cancelAnimationFrame(id)
  }, [lang])

  const notice =
    status === 'guest' ? t('speedReading.guest')
      : status === 'missing' ? t('speedReading.notUploaded')
        : status === 'error' ? t('speedReading.loadFailed')
          : status === 'loading' ? t('speedReading.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="srp-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('speedReading.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state srp-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('speedReading.retry')}
            </button>
          )}
        </div>
      )}
      <div className="srp-host" ref={hostRef} hidden={!texts} data-source="api" data-texts={texts?.length ?? 0} />
    </LearningLayout>
  )
}
