'use client'

// Cartoon World — мультфильмы с YouTube на уровнях A0–C1 и письменная миссия под
// каждым: переписка с персонажем на 10 ходов.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/cartoons/engine.js), React его монтирует и снимает. Движок живёт
// в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/cartoons): методист заливает
// прототип в web-admin, в бандле сайта каталога нет; миссия догружается при
// открытии видео. Миссии на английском (язык упражнения), интерфейс раздела — на
// языке приложения.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { getCartoonMission } from '../api.js'
import { mountCartoons } from '../practice/cartoons/engine.js'
import { CARTOONS_CSS } from '../practice/cartoons/styles.js'
import { CARTOONS_MARKUP } from '../practice/cartoons/markup.js'
import { readCartoons, updateCartoons } from '../practice/cartoons/progress.js'
import { CARTOONS_DRAFTS_KEY, CARTOONS_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { useCartoonsData } from './cartoons/useCartoonsData.js'

const FALLBACK_FONT = "'Manrope', sans-serif"

export default function CartoonsPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const { status, index, retry } = useCartoonsData(token)
  const owner = ownerOf(token)
  // Миссия догружается позже монтирования — берём свежий токен, а не тот, что был при входе.
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
  }, [token])
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'listening' }))

  // Шрифт сайта внутрь тени (--cw-font): Manrope, в kk — Inter.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--cw-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
  }, [lang])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !index) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, смена языка) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    host.style.setProperty('--cw-font', getComputedStyle(host).fontFamily || FALLBACK_FONT)
    // Тёмная тема — приложения (html[data-theme]), а не системная настройка ОС, как было в прототипе.
    host.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')
    shadow.innerHTML = `<style>${CARTOONS_CSS}</style><div class="ctw">${CARTOONS_MARKUP}</div>`
    const api = mountCartoons(shadow.querySelector('.ctw'), {
      index,
      loadMission: (id) => getCartoonMission(tokenRef.current, id),
      lang,
      draftKey: CARTOONS_DRAFTS_KEY,
      progress: { read: readCartoons, update: updateCartoons },
      onMissionDone: () => recordSkill('writing', true),
    })
    // Снимок прогресса с сервера приходит позже первого кадра (новое устройство): отметки «Миссия выполнена» на
    // карточках появились бы только после клика. Перерисовываем библиотеку; открытое видео не трогаем.
    const onProgress = () => {
      if (!api.snapshot().hash) api.go('')
    }
    window.addEventListener(CARTOONS_PROGRESS_EVENT, onProgress)
    return () => {
      window.removeEventListener(CARTOONS_PROGRESS_EVENT, onProgress)
      api.destroy()
      shadow.innerHTML = ''
    }
    // owner — вошёл или вышел; index — новый релиз; lang — язык интерфейса раздела (его строки рисует движок)
  }, [index, owner, lang])

  const notice =
    status === 'guest' ? t('cartoons.guest')
      : status === 'missing' ? t('cartoons.notUploaded')
        : status === 'error' ? t('cartoons.loadFailed')
          : status === 'loading' ? t('cartoons.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="cwp-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('cartoons.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state cwp-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('cartoons.retry')}
            </button>
          )}
        </div>
      )}
      <div className="cwp-host" ref={hostRef} hidden={!index} data-release={index?.release ?? ''} />
    </LearningLayout>
  )
}
