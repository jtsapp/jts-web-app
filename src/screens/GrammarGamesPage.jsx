'use client'

// «Грамматика · игры» — 125 тем на пяти уровнях: правило темы (3D-карточки
// формул, таблицы, типичные ошибки) и сетка из 11–13 игр с финальным боем
// Декстера и Спарка (спека 2026-10-25-grammar-games-speed-reading-design, A3).
//
// Экран — оболочка: разметку и поведение рисует перенесённый движок прототипа
// (src/practice/grammar-games/engine.js), React его монтирует и снимает. Движок
// живёт в Shadow DOM: классы прототипа совпадают с глобальными классами сайта.
// Темы, словарь и звёзды приходят с бэкенда (методист заливает прототип в
// web-admin), монеты считает бэкенд — сюда приходит только их число. Интерфейс
// раздела — на языке приложения: строки ru/kk/en у движка свои, как в прототипе.

import { useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { mountGrammarGames } from '../practice/grammar-games/engine.js'
import { GRAMMAR_GAMES_CSS } from '../practice/grammar-games/styles.js'
import { EMOJI_LIST, emojiUrl, mascotUrl } from '../practice/grammar-games/emoji.js'
import { levelOf } from '../practice/grammar-games/levelOf.js'
import { speakGrammar, stopGrammar } from '../practice/grammar-games/voice.js'
import { GRAMMAR_GAMES_SOUND_KEY } from '../practice/practiceKeys.js'
import { ownerOf } from '../practice/progressStore.js'
import { recordSkill } from '../practice/skillStats.js'
import { saveReadingKeyword } from '../practice/reading/saveKeyword.js'
import { useGrammarGamesData } from './grammar-games/useGrammarGamesData.js'

const ASSET = { img: mascotUrl, emoji: emojiUrl, emojiList: EMOJI_LIST }

// Экран открывается только из state-машины App после гидратации (SSR его не рисует), поэтому настройку устройства
// можно прочитать сразу при первом рендере.
function readSound() {
  try {
    return window.localStorage.getItem(GRAMMAR_GAMES_SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

export default function GrammarGamesPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget }) {
  const { t, lang } = useI18n()
  const hostRef = useRef(null)
  const apiRef = useRef(null)
  const { status, index, progress, retry, loadTopic, loadGloss, submit } = useGrammarGamesData(token)
  const owner = ownerOf(token)
  const [sound, setSound] = useState(readSound)

  // Язык, уровень, звук и звёзды нужны движку только при монтировании: смена языка дальше идёт через setLang,
  // а пересоздание по каждому из них выкидывало бы ученика из игры на хаб.
  const live = useRef({})
  useEffect(() => {
    live.current = { lang, level: levelOf(userLevel), sound, progress, token, topic: initialTarget?.topic || null }
  })
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'writing' }))

  useEffect(() => {
    const host = hostRef.current
    if (!host || !index) return undefined
    const now = live.current
    // attachShadow — один раз на элемент: при пересоздании (вход, перезапрос списка, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени (Manrope, на телефоне PT Root UI, в kk — Inter) — до отрисовки, иначе первый кадр
    // пойдёт системным; пустая строка (элемент вне документа) сделала бы var(--gg-font) невалидным.
    host.style.setProperty('--gg-font', getComputedStyle(host).fontFamily || "'Manrope', sans-serif")
    shadow.innerHTML = `<style>${GRAMMAR_GAMES_CSS}</style><div class="gg"></div>`
    const api = mountGrammarGames(shadow.querySelector('.gg'), {
      index,
      progress: now.progress || {},
      loadTopic,
      loadGloss,
      onResult: (topicId, game, stars) => submit(topicId, game, stars),
      onAnswer: (ok) => recordSkill('grammar', ok),
      lang: now.lang,
      level: now.level,
      sound: now.sound,
      speak: speakGrammar,
      stopVoice: stopGrammar,
      addWord: (w) => saveReadingKeyword(live.current.token, w, 'grammar-games'),
      asset: ASSET,
      initialTopic: now.topic,
      // Прокручивается то окно, то колонка кабинета (на телефоне) — сбрасываем обе.
      scrollTop: () => {
        const main = host.closest('.learn__main')
        if (main) main.scrollTop = 0
        window.scrollTo(0, 0)
      },
    })
    apiRef.current = api
    return () => {
      api.destroy()
      apiRef.current = null
      shadow.innerHTML = ''
    }
    // owner: вошёл или вышел — звёзды уже другого ученика; index — свежий список (заход, «Ещё раз»)
  }, [index, owner, loadTopic, loadGloss, submit])

  useEffect(() => {
    apiRef.current?.setLang(lang)
    // Шрифт — кадром позже: html[data-ui-lang] (в kk — Inter) ставит эффект I18nProvider, а эффекты потомков идут
    // раньше родительских — в этом же тике хост ещё на шрифте прежнего языка.
    const id = requestAnimationFrame(() => {
      const host = hostRef.current
      if (host) host.style.setProperty('--gg-font', getComputedStyle(host).fontFamily || "'Manrope', sans-serif")
    })
    return () => cancelAnimationFrame(id)
  }, [lang])

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    apiRef.current?.setSound(next)
    try {
      window.localStorage.setItem(GRAMMAR_GAMES_SOUND_KEY, next ? '1' : '0')
    } catch {
      /* хранилище недоступно — настройка живёт до ухода с экрана */
    }
  }

  const notice =
    status === 'guest' ? t('grammarGames.guest')
      : status === 'missing' ? t('grammarGames.notUploaded')
        : status === 'error' ? t('grammarGames.loadFailed')
          : status === 'loading' ? t('grammarGames.loading')
            : null

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ggp-top">
        <button type="button" className="nmb-back" onClick={goBack}>
          ← {backLabel || t('grammarGames.toPractice')}
        </button>
        {status === 'ready' && (
          <button
            type="button"
            className="ggp-sound"
            aria-pressed={sound}
            onClick={toggleSound}
            title={t(sound ? 'grammarGames.soundOn' : 'grammarGames.soundOff')}
            aria-label={t(sound ? 'grammarGames.soundOn' : 'grammarGames.soundOff')}
          >
            {sound ? '🔊' : '🔇'}
          </button>
        )}
      </div>
      {notice && (
        <div className="nmb-state ggp-state" role={status === 'error' ? 'alert' : 'status'} aria-busy={status === 'loading'} data-status={status}>
          <p>{notice}</p>
          {status === 'error' && (
            <button type="button" className="nmb-retry" onClick={retry}>
              {t('grammarGames.retry')}
            </button>
          )}
        </div>
      )}
      <div className="ggp-host" ref={hostRef} hidden={!index} data-source="api" data-topics={index?.topics?.length ?? 0} />
    </LearningLayout>
  )
}
