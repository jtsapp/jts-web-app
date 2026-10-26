'use client'

// Prepositions World — курс английских предлогов: 8 категорий, уроки экранами
// (правила, схемы, сцены), практика с картинками-сценами и записями голоса.
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/prepositions/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Материал транслируется с бэкенда (/mobile/prepositions): методист заливает
// прототип в web-admin, в бандле сайта курса нет. Курс на английском (язык
// упражнения), перевод kk/ru — в самом курсе; i18n приложения — только у оболочки.

import { useEffect, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountPrepositions } from '../practice/prepositions/engine.js'
import { PREPOSITIONS_CSS } from '../practice/prepositions/styles.js'
import { readPrepositions, writePrepositions } from '../practice/prepositions/progress.js'
import { speakLesson, stopLesson } from '../practice/prepositions/voice.js'
import { PREPOSITIONS_LANG_KEY, PREPOSITIONS_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { playUrl } from '../lib/speech.js'
import { usePrepositionsData } from './prepositions/usePrepositionsData.js'

export default function PrepositionsPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const { status, bundle, retry } = usePrepositionsData(token)
  const owner = ownerOf(token)
  // Язык интерфейса — только язык перевода ПО УМОЛЧАНИЮ при монтировании: смена языка
  // посреди урока не должна пересоздавать движок и выкидывать ученика на главную.
  // Код казахского в приложении — 'kk' (LANGS в i18n.jsx), он же ждёт движок: подмены не нужно.
  const langRef = useRef(lang)
  // Эффект объявлен РАНЬШЕ монтирующего: на первом кадре он отрабатывает первым и движок видит актуальный язык.
  useEffect(() => {
    langRef.current = lang
  }, [lang])
  // Шрифт интерфейса меняется вместе с языком (kk — Inter): переносим его в тень заново, без пересоздания движка.
  useEffect(() => {
    const host = hostRef.current
    if (host) host.style.setProperty('--pw-font', getComputedStyle(host).fontFamily || "'Manrope', sans-serif")
  }, [lang])
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'writing' }))

  useEffect(() => {
    const host = hostRef.current
    if (!host || !bundle) return undefined
    // attachShadow — один раз на элемент: при пересоздании (вход, новый релиз, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени: --sans прототипа берёт его отсюда (Manrope, в kk — Inter).
    // Ставим ДО отрисовки содержимого тени, иначе первый кадр пойдёт системным шрифтом. Пустая строка
    // (элемент вне документа) сделала бы var(--pw-font) невалидным — подстраховываемся шрифтом десктопа.
    host.style.setProperty('--pw-font', getComputedStyle(host).fontFamily || "'Manrope', sans-serif")
    shadow.innerHTML = `<style>${PREPOSITIONS_CSS}</style><div class="pw"><div id="app"></div></div>`
    const api = mountPrepositions(shadow.querySelector('.pw'), {
      bundle,
      lang: langRef.current,
      langKey: PREPOSITIONS_LANG_KEY,
      progress: { read: readPrepositions, write: writePrepositions },
      speak: speakLesson,
      playUrl,
      // и общий плеер, и голос устройства: уход с экрана урока глушит любую озвучку
      stopAudio: stopLesson,
      onAnswer: (ok) => recordSkill('grammar', ok),
    })
    // Снимок прогресса с сервера приходит позже первого кадра (новое устройство): главная курса и список практики
    // показали бы «0 of 31» до первого клика. Перерисовываем только их — посреди урока или вопроса не трогаем.
    const onProgress = () => {
      const h = api.snapshot().hash
      if (h === '#/' || h === '#/practice') api.go(h)
    }
    window.addEventListener(PREPOSITIONS_PROGRESS_EVENT, onProgress)
    return () => {
      window.removeEventListener(PREPOSITIONS_PROGRESS_EVENT, onProgress)
      api.destroy()
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — прогресс уже другого ученика; bundle — методист перезалил курс
  }, [bundle, owner])

  const notice =
    status === 'guest' ? t('prepositions.guest')
      : status === 'missing' ? t('prepositions.notUploaded')
        : status === 'error' ? t('prepositions.loadFailed')
          : status === 'loading' ? t('prepositions.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="prp-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('prepositions.toPractice')}
        </button>
      </div>
      {notice && (
        <div className="nmb-state prp-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('prepositions.retry')}
            </button>
          )}
        </div>
      )}
      <div className="prp-host" ref={hostRef} hidden={!bundle} data-release={bundle?.release ?? ''} />
    </LearningLayout>
  )
}
