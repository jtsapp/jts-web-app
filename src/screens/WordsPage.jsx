'use client'

// «Слова в картинках» — визуальный словарь Практики: слышишь слово, находишь
// его на картинке. Порт data/jtswords.html; данные режет
// scripts/extract-words.js, движок живёт в src/practice/words/.
//
// Экран — view-машина каталог → превью сцены → игра → результат, как в
// «Чтении»: секция и сцена держатся здесь, чтобы возврат приводил в тот же
// срез каталога, а не в начало.

import { useCallback, useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { WORDS_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { loadMeta, loadSection } from '../practice/words/data.js'
import { buildSession, poolFor } from '../practice/words/session.js'
import { DEFAULT_WORD_LANG, WORD_LANGS, readWordLang, wordLangFor, writeWordLang } from '../practice/words/loc.js'
import { markSceneDone, markWordFound } from '../practice/words/wordsProgress.js'
import WordsCatalog from './words/WordsCatalog.jsx'
import WordsPreview from './words/WordsPreview.jsx'
import WordsScene from './words/WordsScene.jsx'
import WordsResult from './words/WordsResult.jsx'
import useWordsVoice from './words/useWordsVoice.js'

export const WORDS_SECTIONS = ['animals', 'food', 'clothes', 'house', 'body']

// Ниже этой ширины сцена становится портретной: раунды короче, спрайты крупнее.
const PORTRAIT_MAX = 720

export default function WordsPage({ userName, userLevel, token, onNav, onProfile, initialTarget }) {
  const { t, lang } = useI18n()
  const { voice, failedAt: voiceFailedAt } = useWordsVoice()

  const [meta, setMeta] = useState(null)
  const [section, setSection] = useState(initialTarget?.section || WORDS_SECTIONS[0])
  const [data, setData] = useState({}) // section → { scenes, words, confusable }
  const [view, setView] = useState(
    initialTarget?.sceneId ? { name: 'preview', sceneId: initialTarget.sceneId } : { name: 'catalog' },
  )
  const [error, setError] = useState('')
  const [progressTick, setTick] = useState(0)
  const [portrait, setPortrait] = useState(false)
  // Сид сессии — на открытие сцены: пересборка компонента не должна
  // перетасовать раунды под руками у человека.
  const [seed, setSeed] = useState(() => Date.now())
  const [wordLang, setWordLang] = useState(DEFAULT_WORD_LANG)

  // Язык подписи: сохранённый выбор человека сильнее языка интерфейса. При
  // английском интерфейсе перевода нет вовсе — картинка и есть значение.
  useEffect(() => {
    const saved = readWordLang()
    setWordLang(saved || wordLangFor(lang))
  }, [lang])

  // Ориентацию считаем после гидратации: на сервере ширины окна нет, и
  // вычисленная там раскладка разъехалась бы с клиентской.
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PORTRAIT_MAX}px)`)
    const sync = () => setPortrait(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Прогресс мог приехать с сервера уже после отрисовки каталога — без этого
  // тика проценты на карточках замерли бы до перемонтирования экрана.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    window.addEventListener(WORDS_PROGRESS_EVENT, bump)
    return () => window.removeEventListener(WORDS_PROGRESS_EVENT, bump)
  }, [])

  useEffect(() => {
    let alive = true
    loadMeta()
      .then((m) => alive && setMeta(m))
      .catch(() => alive && setError(t('words.loadError')))
    return () => {
      alive = false
    }
  }, [t])

  useEffect(() => {
    if (data[section]) return
    let alive = true
    loadSection(section)
      .then((d) => alive && setData((prev) => (prev[section] ? prev : { ...prev, [section]: d })))
      .catch(() => alive && setError(t('words.loadError')))
    return () => {
      alive = false
    }
  }, [section, data, t])

  // Диплинк мог указать сцену чужой секции — подтягиваем её секцию, иначе
  // сцена не найдётся в загруженных данных.
  useEffect(() => {
    if (!meta || !initialTarget?.sceneId) return
    const owner = meta.sections.find((s) => s.scenes.some((x) => x.id === initialTarget.sceneId))
    if (owner && owner.id !== section) setSection(owner.id)
  }, [meta, initialTarget, section])

  const scene = useMemo(() => {
    if (!view.sceneId) return null
    for (const d of Object.values(data)) {
      const found = (d.scenes || []).find((s) => s.id === view.sceneId)
      if (found) return found
    }
    return null
  }, [data, view.sceneId])

  const sceneWords = useMemo(() => {
    if (!scene) return []
    const owner = Object.values(data).find((d) => (d.scenes || []).some((s) => s.id === scene.id))
    return owner ? poolFor(scene, owner.words) : []
  }, [scene, data])

  const sceneSection = useMemo(() => {
    if (!scene || !meta) return section
    const owner = meta.sections.find((s) => s.scenes.some((x) => x.id === scene.id))
    return owner ? owner.id : section
  }, [scene, meta, section])

  const session = useMemo(() => {
    if (!scene || !sceneWords.length || view.name !== 'play') return null
    const owner = Object.values(data).find((d) => (d.scenes || []).some((s) => s.id === scene.id))
    return buildSession(scene, owner.words, { seed, portrait, confusable: owner.confusable || [] })
  }, [scene, sceneWords.length, view.name, data, seed, portrait])

  const openScene = useCallback((sceneId) => {
    voice.stop()
    setSeed(Date.now())
    setView({ name: 'preview', sceneId })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [voice])

  const goCatalog = useCallback(() => {
    voice.stop()
    setView({ name: 'catalog' })
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [voice])

  const goBack = useCallback(() => {
    if (view.name === 'catalog') {
      onNav?.('practice')
      return
    }
    if (view.name === 'preview') {
      goCatalog()
      return
    }
    setView({ name: 'preview', sceneId: view.sceneId })
    voice.stop()
  }, [view, onNav, goCatalog, voice])

  const pickLang = useCallback((next) => {
    setWordLang(next)
    writeWordLang(next)
  }, [])

  const body = () => {
    if (view.name === 'catalog') {
      return (
        <WordsCatalog
          meta={meta}
          section={section}
          progressTick={progressTick}
          onSection={setSection}
          onOpen={openScene}
        />
      )
    }
    if (!scene || !sceneWords.length) return <div className="wd-note">{t('words.loading')}</div>
    if (view.name === 'preview') {
      return (
        <WordsPreview
          scene={scene}
          pool={sceneWords}
          wordLang={wordLang}
          voice={voice}
          onStart={() => {
            setSeed(Date.now())
            setView({ name: 'play', sceneId: scene.id })
          }}
        />
      )
    }
    if (view.name === 'play') {
      if (!session) return <div className="wd-note">{t('words.loading')}</div>
      return (
        <WordsScene
          key={`${scene.id}:${seed}`}
          scene={scene}
          session={session}
          section={sceneSection}
          seed={seed}
          portrait={portrait}
          wordLang={wordLang}
          voice={voice}
          voiceFailedAt={voiceFailedAt}
          onFound={(wordId) => markWordFound(scene.id, wordId)}
          onFinish={() => {
            markSceneDone(scene.id)
            voice.stop()
            setView({ name: 'result', sceneId: scene.id })
            window.scrollTo({ top: 0, behavior: 'auto' })
          }}
        />
      )
    }
    return (
      <WordsResult
        scene={scene}
        pool={sceneWords}
        wordLang={wordLang}
        voice={voice}
        onAgain={() => {
          setSeed(Date.now())
          setView({ name: 'play', sceneId: scene.id })
        }}
        onCatalog={goCatalog}
      />
    )
  }

  const crumb = view.name === 'catalog' ? t('words.section.' + section) : scene ? scene.name : ''

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="practice"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
    >
      <div className="wd">
        <div className="wd-top">
          <button type="button" className="wd-back" onClick={goBack}>
            ← {view.name === 'catalog' ? t('words.toPractice') : t('words.back')}
          </button>
          <div className="wd-crumb">
            <b>{t('practice.words.title')}</b>
            <span>{crumb}</span>
          </div>
          <div className="wd-lang" role="group" aria-label={t('words.wordLang')}>
            {WORD_LANGS.map((l) => (
              <button
                key={l}
                type="button"
                className="wd-lang__btn"
                aria-pressed={wordLang === l}
                onClick={() => pickLang(l)}
              >
                {l === 'kk' ? 'KZ' : 'RU'}
              </button>
            ))}
          </div>
        </div>
        {error && <div className="wd-note wd-note--err">{error}</div>}
        {body()}
      </div>
    </LearningLayout>
  )
}
