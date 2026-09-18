'use client'

// «Неправильные глаголы» — глава Практики из трёх частей: урок, таблица 90
// глаголов с озвучкой и тренажёр на бит. Порт data/jtsverbs.html («verb-rap»);
// данные режет scripts/extract-verbs.js, движок живёт в src/practice/verbs/.
//
// Бит и записи — одни на вкладку (sound.js), контекст у них общий: форма
// тьютора обязана ложиться на долю бита, а это возможно только по общим
// часам. Уходя с экрана, раздел усыпляет контекст.

import { useCallback, useEffect, useRef, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { VERBS_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { recordSkill } from '../practice/skillStats.js'
import { suspendAudio } from '../practice/verbs/beat.js'
import { loadVerbs } from '../practice/verbs/data.js'
import { VerbDrill } from '../practice/verbs/drill.js'
import { createTablePlayer } from '../practice/verbs/player.js'
import { sectionSound } from '../practice/verbs/sound.js'
import { readState, recordResult, resetResults, scoresFor, toggleSaved } from '../practice/verbs/verbsProgress.js'
import { PART_IDS, readSettings, writeSettings } from '../practice/verbs/verbsSettings.js'
import VerbsLesson from './verbs/VerbsLesson.jsx'
import VerbsPractice, { tabArrows } from './verbs/VerbsPractice.jsx'
import VerbsTable from './verbs/VerbsTable.jsx'

const EMPTY_FILTERS = { query: '', pattern: 'all', group: 'all', onlySaved: false, hide: false }

export default function VerbsPage({ userName, userLevel, token, onNav, onProfile, initialTarget }) {
  const { t, lang } = useI18n()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const [settings, setSettings] = useState(readSettings)
  const settingsRef = useRef(settings)
  const saveSettings = useCallback((patch) => {
    const next = writeSettings(patch, settingsRef.current)
    settingsRef.current = next
    setSettings(next)
    return next
  }, [])

  const [progress, setProgress] = useState(readState)
  const progressRef = useRef(progress)

  // Диплинк (?screen=verbs&part=practice) сильнее запомненной части.
  const [part, setPartState] = useState(() =>
    PART_IDS.includes(initialTarget?.part) ? initialTarget.part : settings.part,
  )
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [revealed, setRevealed] = useState({})
  const [loop, setLoop] = useState(false)
  const [playerState, setPlayerState] = useState({ active: false })

  const drillRef = useRef(null)
  const [drill, setDrill] = useState(null)

  // Звук — общий на вкладку; громкости и темп — из настроек этого устройства.
  // Колбэки бита вешает на себя машина попытки: она появляется позже, когда
  // загрузятся данные.
  const [audio] = useState(() => {
    const sound = sectionSound()
    sound.beat.setVolume(settings.volume)
    sound.beat.bpm = settings.bpm
    sound.clips.setVolume(settings.tutor)
    return sound
  })
  const [player] = useState(() => createTablePlayer({ clips: audio.clips, pause: settings.pause, onChange: setPlayerState }))
  useEffect(() => player.setPause(settings.pause), [player, settings.pause])

  useEffect(() => {
    let alive = true
    loadVerbs()
      .then((d) => {
        if (!alive) return
        // Группа набора из прошлого визита могла исчезнуть из данных.
        const set = settingsRef.current.set
        if (set !== 'all' && set !== 'saved' && !d.groups.includes(set)) saveSettings({ set: 'all' })
        setData(d)
      })
      .catch(() => alive && setError(t('verbs.loadError')))
    return () => {
      alive = false
    }
  }, [t, saveSettings])

  useEffect(() => {
    if (!data) return undefined
    const d = new VerbDrill({
      data,
      beat: audio.beat,
      clips: audio.clips,
      getSettings: () => settingsRef.current,
      saveSettings,
      getSaved: () => progressRef.current.saved,
      getScores: (key) => scoresFor(key, progressRef.current),
      persist: (key, id, result) => recordResult(key, id, result),
      onWrittenChecked: (ok) => recordSkill('grammar', ok),
    })
    drillRef.current = d
    setDrill(d)
    return () => {
      d.destroy()
      if (drillRef.current === d) drillRef.current = null
    }
  }, [data, audio, saveSettings])

  // Прогресс мог приехать с сервера (гидратация после входа) или записаться
  // самой попыткой — метки в списке и звёздочки перечитываем по событию.
  useEffect(() => {
    const sync = () => {
      const s = readState()
      progressRef.current = s
      setProgress(s)
      if (drillRef.current) drillRef.current.touch()
    }
    window.addEventListener(VERBS_PROGRESS_EVENT, sync)
    return () => window.removeEventListener(VERBS_PROGRESS_EVENT, sync)
  }, [])

  // Ушёл со вкладки — ничего не звучит и не слушает, контекст спит. Уход с
  // экрана — то же.
  useEffect(() => {
    const quiet = () => {
      player.stop()
      if (drillRef.current) drillRef.current.cleanup()
      suspendAudio()
    }
    const onVisibility = () => {
      if (document.hidden) quiet()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', quiet)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', quiet)
      player.stop()
      audio.beat.stop()
      audio.clips.stop()
      suspendAudio()
    }
  }, [player, audio])

  // Часть из диплинка — одноразовая: адрес её забывает, а открытая часть
  // запоминается в настройках. Иначе F5 возвращал бы в часть из ссылки, а не
  // туда, где человек был.
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (!url.searchParams.has('part')) return
      url.searchParams.delete('part')
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* адрес не трогаем — хуже от этого не станет */
    }
  }, [])

  const setPart = useCallback(
    (next) => {
      player.stop()
      if (drillRef.current) drillRef.current.cleanup()
      setPartState(next)
      saveSettings({ part: next, visited: { ...settingsRef.current.visited, [next]: true } })
      window.scrollTo({ top: 0, behavior: 'auto' })
    },
    [player, saveSettings],
  )

  // Открытая часть запоминается (в том числе пришедшая диплинком), и на
  // вкладке появляется точка «была здесь».
  useEffect(() => {
    const s = settingsRef.current
    if (s.part !== part || !s.visited[part]) saveSettings({ part, visited: { ...s.visited, [part]: true } })
  }, [part, saveSettings])

  // Любая смена фильтра останавливает плеер и снова прячет открытые клетки:
  // иначе доигрывала бы группа, которой на экране уже нет.
  const changeFilters = useCallback(
    (next) => {
      player.stop()
      setRevealed({})
      setFilters(next)
    },
    [player],
  )

  const onToggleSave = useCallback(
    (v1) => {
      if (filters.onlySaved) player.stop()
      toggleSaved(v1)
    },
    [filters.onlySaved, player],
  )

  const partIndex = PART_IDS.indexOf(part)
  const partNames = ['verbs.nav0', 'verbs.nav1', 'verbs.nav2']

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="practice"
      token={token}
      onNav={onNav}
      onProfile={onProfile}
    >
      <div className="vb">
        <div className="vb-top">
          <button type="button" className="vb-back" onClick={() => onNav?.('practice')}>
            ← {t('verbs.toPractice')}
          </button>
          <div className="vb-crumb">
            <b>{t('practice.verbs.title')}</b>
            <span>{t(partNames[partIndex])}</span>
          </div>
        </div>

        <header className="vb-head">
          <div>
            <span className="vb-eyebrow">{t('verbs.chapter')}</span>
            <h1>{t('verbs.title')}</h1>
            <p>{t('verbs.sub' + partIndex)}</p>
          </div>
          <div className="vb-stats">
            <div>
              <strong>{data ? data.verbs.length : 90}</strong>
              <span>{t('verbs.verbs')}</span>
            </div>
            <div>
              <strong>{data ? data.groups.length : 8}</strong>
              <span>{t('verbs.groups')}</span>
            </div>
            <div>
              <strong>5</strong>
              <span>{t('verbs.modes')}</span>
            </div>
          </div>
        </header>

        <nav
          className="vb-nav"
          role="tablist"
          aria-label={t('verbs.title')}
          onKeyDown={(e) => tabArrows(e, (i) => setPart(PART_IDS[i]))}
        >
          {PART_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`vb-tab-${id}`}
              aria-selected={part === id}
              aria-controls={`vb-part-${id}`}
              tabIndex={part === id ? 0 : -1}
              className={settings.visited[id] ? 'is-visited' : undefined}
              onClick={() => setPart(id)}
            >
              <span className="vb-nav__num">0{i + 1}</span>
              <span>{t(partNames[i])}</span>
              <span className="vb-nav__dot" aria-hidden="true">
                •
              </span>
            </button>
          ))}
        </nav>

        {error && <div className="vb-notice vb-notice--err">{error}</div>}

        <main className="vb-part" id={`vb-part-${part}`} role="tabpanel" aria-labelledby={`vb-tab-${part}`} key={part}>
          {part === 'learn' && (
            <VerbsLesson
              onGo={setPart}
              onPattern={(p) => {
                changeFilters({ ...EMPTY_FILTERS, pattern: p })
                setPart('table')
              }}
            />
          )}
          {part !== 'learn' && !data && !error && <div className="vb-notice">{t('verbs.loading')}</div>}
          {part === 'table' && data && (
            <VerbsTable
              data={data}
              filters={filters}
              onFilters={changeFilters}
              level={settings.tableLevel}
              onLevel={(l) => {
                player.stop()
                setRevealed({})
                saveSettings({ tableLevel: l })
              }}
              saved={progress.saved}
              onToggleSave={onToggleSave}
              revealed={revealed}
              onReveal={(key) => setRevealed((prev) => ({ ...prev, [key]: true }))}
              onHideAgain={() => setRevealed({})}
              player={player}
              playerState={playerState}
              pause={settings.pause}
              onPause={(p) => saveSettings({ pause: p })}
              loop={loop}
              onLoop={(on) => {
                setLoop(on)
                player.setLoop(on)
              }}
              onPractice={() => setPart('practice')}
            />
          )}
          {part === 'practice' && data && drill && (
            <VerbsPractice
              drill={drill}
              data={data}
              settings={settings}
              saved={progress.saved}
              lang={lang}
              token={token}
              onGoTable={() => setPart('table')}
              onResetProgress={() => {
                drill.stopAttempt(true)
                resetResults()
                drill.refresh()
              }}
            />
          )}
        </main>
      </div>
    </LearningLayout>
  )
}
