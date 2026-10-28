'use client'

// Сам раздел «Грамматика · игры» — хаб, правила и игры движка прототипа (src/practice/grammar-games/engine.js).
// Рисуется в двух местах: своим экраном (GrammarGamesPage — ссылка на тему из админки, переход Луны) и вкладкой
// Практики (`embedded`, 28.10.2026 по просьбе владельца: раздел — пятый навык рядом с Аудированием, Чтением, Письмом
// и Говорением, а не баннер в «Письме»). Движок живёт в Shadow DOM: классы прототипа совпадают с глобальными
// классами сайта. Темы, словарь и звёзды приходят с бэкенда (методист заливает прототип в web-admin), монеты
// считает бэкенд — сюда приходит только их число. Интерфейс раздела — на языке приложения: строки ru/kk/en у
// движка свои, как в прототипе.

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../../i18n.jsx'
import { mountGrammarGames } from '../../practice/grammar-games/engine.js'
import { GRAMMAR_GAMES_CSS } from '../../practice/grammar-games/styles.js'
import { EMOJI_LIST, emojiUrl, mascotUrl } from '../../practice/grammar-games/emoji.js'
import { levelOf } from '../../practice/grammar-games/levelOf.js'
import { speakGrammar, stopGrammar } from '../../practice/grammar-games/voice.js'
import { GRAMMAR_GAMES_SOUND_KEY } from '../../practice/practiceKeys.js'
import { ownerOf } from '../../practice/progressStore.js'
import { recordSkill } from '../../practice/skillStats.js'
import { saveReadingKeyword } from '../../practice/reading/saveKeyword.js'
import { useGrammarGamesData } from './useGrammarGamesData.js'

const ASSET = { img: mascotUrl, emoji: emojiUrl, emojiList: EMOJI_LIST }

// Во вкладке Практики поля и ширину даёт колонка .pk — свои поля движка (main прототипа) дали бы двойной отступ.
const EMBEDDED_CSS = 'main{max-width:none;padding:0}'

// Раздел открывается только после гидратации (экран — из state-машины App, вкладка — по клику или из сессии),
// поэтому настройку устройства можно прочитать сразу при первом рендере.
function readSound() {
  try {
    return window.localStorage.getItem(GRAMMAR_GAMES_SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

// Прокручивается то окно, то колонка кабинета (на телефоне) — сбрасываем обе.
function scrollPageTop(host) {
  const main = host.closest('.learn__main')
  if (main) main.scrollTop = 0
  window.scrollTo(0, 0)
}

// toolsSlot — узел в шапке Практики (на месте переключателя уровня), куда во вкладке уходит тумблер звука:
// отдельной строкой над героем раздела он висел бы один посреди пустого поля.
export default function GrammarGamesView({ token, userLevel, initialTopic = null, embedded = false, toolsSlot = null, onBack, backLabel }) {
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
    live.current = { lang, level: levelOf(userLevel), sound, progress, token, topic: initialTopic, embedded }
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host || !index) return undefined
    const now = live.current
    // attachShadow — один раз на элемент: при пересоздании (вход, перезапрос списка, StrictMode) — тот же корень.
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' })
    // Шрифт сайта внутрь тени (Manrope, в kk — Inter) — до отрисовки, иначе первый кадр
    // пойдёт системным; пустая строка (элемент вне документа) сделала бы var(--gg-font) невалидным.
    host.style.setProperty('--gg-font', getComputedStyle(host).fontFamily || "'Manrope', sans-serif")
    shadow.innerHTML = `<style>${GRAMMAR_GAMES_CSS}${now.embedded ? EMBEDDED_CSS : ''}</style><div class="gg"></div>`
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
      // Во вкладке над разделом стоят шапка Практики и карточки навыков. Тема и игра начинаются с верха раздела —
      // иначе игра открывалась бы там, где была карточка темы (хаб длинный), или под шапкой, а возврат к темам
      // показывает и карточки: с хаба уходят в другой навык.
      scrollTop: (view) => {
        if (!live.current.embedded || view === 'hub') scrollPageTop(host)
        else host.closest('.ggp')?.scrollIntoView({ block: 'start' })
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

  const soundButton = status === 'ready' && (
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
  )

  return (
    <section id={embedded ? 'sec-grammar-games' : undefined} className={`ggp${embedded ? ' ggp--embedded' : ''}`}>
      {toolsSlot ? (
        soundButton && createPortal(soundButton, toolsSlot)
      ) : (
        (onBack || soundButton) && (
          <div className="ggp-top">
            {onBack && (
              <button type="button" className="nmb-back" onClick={onBack}>
                ← {backLabel || t('grammarGames.toPractice')}
              </button>
            )}
            {soundButton}
          </div>
        )
      )}
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
    </section>
  )
}
