'use client'

// «Числа» (Dexter's Number World) — английские числа на слух: прыжки Декстера
// по островам с вариантами, 17 разделов в трёх мирах и Listening Lab.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/numbers/engine.js), React его монтирует и снимает. Движок живёт
// в Shadow DOM: классы прототипа (.hero, .card, .btn, .chip…) совпадают с
// глобальными классами приложения, без изоляции они ломаются.
//
// Данные (data.json, ~185 КБ), картинки и шрифты лежат в /practice/numbers/ и
// грузятся только при входе в раздел. Шрифты подключаются к ДОКУМЕНТУ: внутри
// Shadow DOM @font-face применяется ненадёжно, а шрифты документа внутрь видны.
// Игра — на английском (язык упражнения), перевод объяснений kk/ru включается
// в самом уроке; ключи i18n приложения — только у оболочки.

import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountNumbers } from '../practice/numbers/engine.js'
import { NUMBERS_MARKUP } from '../practice/numbers/markup.js'
import { NUMBERS_CSS } from '../practice/numbers/styles.js'
import { createNumbersVoice } from '../practice/numbers/voice.js'
import { readNumbers, updateNumbers } from '../practice/numbers/numbersProgress.js'
import { ownerOf } from '../practice/progressStore.js'
import { NUMBERS_LANG_KEY } from '../practice/practiceKeys.js'
import { recordSkill } from '../practice/skillStats.js'

const DATA_URL = '/practice/numbers/data.json'
const FONT_LINKS = [
  '/practice/numbers/fonts/fonts.css',
  'https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@600;700;800&display=swap',
]

const RECORDS_URL = '/practice/numbers/audio/index.json'

// Один запрос на вкладку; провал не кэшируется — «ещё раз» спросит заново.
// Список записей не обязателен: без него игра звучит синтезом тем же голосом.
let dataPromise = null
function loadData() {
  if (!dataPromise) {
    const json = (url) => fetch(url).then((r) => {
      if (!r.ok) throw new Error(`${url} ${r.status}`)
      return r.json()
    })
    dataPromise = Promise.all([json(DATA_URL), json(RECORDS_URL).catch(() => ({}))])
      .then(([game, records]) => ({ game, records }))
      .catch((e) => {
        dataPromise = null
        throw e
      })
  }
  return dataPromise
}

function useDocumentFonts() {
  useEffect(() => {
    for (const href of FONT_LINKS) {
      if ([...document.head.querySelectorAll('link[data-numbers-font]')].some((l) => l.dataset.numbersFont === href)) continue
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      link.dataset.numbersFont = href
      document.head.appendChild(link)
    }
  }, [])
}

export default function NumbersPage({ userName, userLevel, token, onNav, onProfile }) {
  const { t } = useI18n()
  const hostRef = useRef(null)
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  // Чей прогресс, а не сам токен: тихое обновление access (App → onRefreshed →
  // setToken) меняет строку токена каждые несколько минут, и пересоздание по
  // ней обрывало бы живой раунд и выкидывало на карту. ownerOf стабилен, пока
  // ученик тот же (sub из JWT), и меняется на входе и выходе.
  const owner = ownerOf(token)
  useDocumentFonts()

  useEffect(() => {
    let alive = true
    loadData().then(
      (d) => alive && setData(d),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [attempt])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !data) return undefined
    // attachShadow разрешён один раз на элемент — при пересоздании (вход в
    // аккаунт, двойной эффект StrictMode) переиспользуем тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    shadow.innerHTML = `<style>${NUMBERS_CSS}</style><main class="nw" id="jts-numbers">${NUMBERS_MARKUP}</main>`
    const root = shadow.getElementById('jts-numbers')
    const destroy = mountNumbers(root, {
      data: data.game,
      progress: { read: readNumbers, update: updateNumbers },
      voice: createNumbersVoice(data.records),
      onSkill: (firstTry) => recordSkill('listening', firstTry),
      langKey: NUMBERS_LANG_KEY,
      // e2e: прыжки и анимации за миллисекунды (addInitScript ставит флаг до загрузки)
      fast: typeof window !== 'undefined' && !!window.__NUMBERS_FAST,
    })
    return () => {
      destroy()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика, игра перечитывает его
  }, [data, owner])

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="nmb-top">
        <button type="button" className="nmb-back" onClick={() => onNav?.('practice', { skill: 'listening' })}>
          ← {t('numbers.toPractice')}
        </button>
      </div>
      {failed ? (
        <div className="nmb-state" role="alert">
          <p>{t('numbers.loadFailed')}</p>
          <button
            type="button"
            className="nmb-retry"
            onClick={() => {
              setFailed(false)
              setAttempt((n) => n + 1)
            }}
          >
            {t('numbers.retry')}
          </button>
        </div>
      ) : !data ? (
        <div className="nmb-state" aria-busy="true">
          {t('numbers.loading')}
        </div>
      ) : null}
      <div className="nmb-host" ref={hostRef} hidden={!data} />
    </LearningLayout>
  )
}
