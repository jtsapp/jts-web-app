'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import Sidebar from '../../components/Sidebar.jsx'
import { ChevronLeftIcon, ChevronRightIcon } from '../../components/icons.jsx'
import {
  completeCatalogLesson,
  getCatalogProgress,
  getCourseCatalog,
  getCourseCatalogLesson,
  selfStudyLessonRenderUrl,
} from '../../api.js'
import { gotoStageMessage, parseStageListMessage, parseStageMessage } from '../live/lessonStages.js'
import { selfStudyLessonPlace } from './selfStudyCourses.js'

/**
 * Панель содержания курса: юниты и уроки уровня, по которым ученик ходит сам. На странице
 * урока такого списка нет — в ней лежит один урок, а меню файла помечает остальные как «soon».
 */
function ContentsPanel({ place, lessonId, done, onPick, onClose }) {
  const { t } = useI18n()
  const closeRef = useRef(null)

  useEffect(() => {
    const opener = document.activeElement
    closeRef.current?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      opener?.focus?.()
    }
  }, [onClose])

  return (
    <div className="ssf-panel" role="dialog" aria-modal="true" aria-labelledby="ssf-panel-title">
      <button type="button" className="ssf-panel__scrim" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div className="ssf-panel__body">
        <div className="ssf-panel__head">
          <h2 id="ssf-panel-title" className="ssf-panel__title">{t('selfStudy.file.contentsTitle')}</h2>
          <button ref={closeRef} type="button" className="ssf-btn ssf-btn--ghost" onClick={onClose}>
            {t('selfStudy.file.close')}
          </button>
        </div>
        <div className="ssf-panel__list">
          {place.units.map((unit) => (
            <section key={unit.id} className="ssf-unit">
              <h3 className="ssf-unit__name">{unit.name}</h3>
              <ul className="ssf-unit__lessons">
                {unit.lessons.map((lesson) => {
                  const current = Number(lesson.id) === Number(lessonId)
                  const isDone = done.has(Number(lesson.id))
                  return (
                    <li key={lesson.id}>
                      <button
                        type="button"
                        className={`ssf-lesson${current ? ' is-current' : ''}`}
                        aria-current={current ? 'true' : undefined}
                        onClick={() => onPick(lesson.id)}
                      >
                        <span className="ssf-lesson__title">{lesson.title}</span>
                        {current && <span className="ssf-lesson__tag">{t('selfStudy.file.current')}</span>}
                        {!current && isDone && <span className="ssf-lesson__tag ssf-lesson__tag--done">{t('selfStudy.doneBadge')}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Урок-файл с навигацией платформы. В режиме self страница прячет свои панели: рельс этапов,
 * нижние кнопки и меню курса. Поэтому всё это здесь, снаружи рамки. Этапы рамка называет сама
 * (stage-list/stage), переход просим у неё же (goto-stage) — контракт lessonStages.js, общий с
 * живым уроком. Обычный, не silent, переход: мост пишет его в поток, и при возврате ученик
 * попадает на свой этап.
 */
function FileLesson({ lesson, token, userName, userLevel, onNav, onProfile, onExit, backLabel, onOpenLesson }) {
  const { t } = useI18n()
  const frameRef = useRef(null)
  // Адрес фиксируется при открытии: обновление токена в приложении не должно перезагружать
  // рамку и уносить ученика из задания.
  const [src] = useState(() => selfStudyLessonRenderUrl(lesson.id, token))
  const [frameLoaded, setFrameLoaded] = useState(false)
  const [titles, setTitles] = useState([])
  const [stage, setStage] = useState(0)
  const [levels, setLevels] = useState(null)
  const [done, setDone] = useState(() => new Set())
  const [contentsOpen, setContentsOpen] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    const onMessage = (event) => {
      if (event.source !== frameRef.current?.contentWindow) return
      const list = parseStageListMessage(event.data)
      if (list) {
        setTitles(list)
        return
      }
      const moved = parseStageMessage(event.data)
      if (moved) setStage(moved.index)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    let alive = true
    // Содержание не критично для самого урока: не ответило — урок идёт, просто без него.
    getCourseCatalog(token, (fresh) => alive && setLevels(fresh || []))
      .then((data) => alive && setLevels(data || []))
      .catch(() => {})
    getCatalogProgress(token)
      .then((res) => alive && setDone(new Set((res?.completedLessonIds || []).map(Number))))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [token])

  const place = selfStudyLessonPlace(levels, lesson.id)
  const total = titles.length
  const position = Math.min(stage, Math.max(total - 1, 0))
  const isLastStage = total === 0 || position >= total - 1

  const goStage = useCallback((index) => {
    frameRef.current?.contentWindow?.postMessage(gotoStageMessage(index), '*')
    // В тесте юнита этапы — части одной страницы: рамка прокручивает к части и о переходе не
    // сообщает. Обычный урок сообщит тот же номер следом.
    setStage(index)
  }, [])

  const closeContents = useCallback(() => setContentsOpen(false), [])

  const finish = async () => {
    setFinishing(true)
    // Отметка не повод держать ученика в уроке: не записалась — поставит её в списке сам.
    await completeCatalogLesson(token, lesson.id).catch(() => {})
    setFinishing(false)
    if (place?.next) onOpenLesson(place.next.id)
    else onExit()
  }

  return (
    <div className="learn learn--lesson" data-testid="self-study-file-lesson">
      <div className="learn__body">
        <Sidebar userName={userName} userLevel={userLevel} active="lessons" token={token} onNav={onNav} onProfile={onProfile} />
        <main className="learn__main">
          <div className="ssf">
            <header className="ssf__bar">
              <button type="button" className="lw-doc__back" onClick={onExit}>
                <ChevronLeftIcon size={18} />
                <span>{backLabel || t('lesson.ws.back')}</span>
              </button>
              <h1 className="ssf__title">{lesson.title}</h1>
              {place && (
                <button type="button" className="ssf-btn ssf-btn--ghost" onClick={() => setContentsOpen(true)}>
                  {t('selfStudy.file.contents')}
                </button>
              )}
            </header>

            {total > 1 && (
              <nav className="ssf__stages" aria-label={t('selfStudy.file.stages')}>
                {titles.map((title, index) => (
                  <button
                    // Названия этапов в уроке повторяются, номер делает ключ единственным.
                    key={`${index}-${title}`}
                    type="button"
                    className={`ssf-stage${index === position ? ' is-current' : ''}${index < position ? ' is-past' : ''}`}
                    aria-current={index === position ? 'step' : undefined}
                    onClick={() => goStage(index)}
                  >
                    {title}
                  </button>
                ))}
              </nav>
            )}

            <div className="ssf__frame">
              {!frameLoaded && <p className="ssf__loading" role="status">{t('selfStudy.file.loading')}</p>}
              <iframe
                ref={frameRef}
                src={src}
                title={lesson.title || t('lessons.tabSelf')}
                className="ssf__iframe"
                onLoad={() => setFrameLoaded(true)}
                allow="autoplay; fullscreen"
              />
            </div>

            <footer className="ssf__nav">
              <button
                type="button"
                className="ssf-btn ssf-btn--ghost"
                disabled={total === 0 || position === 0}
                onClick={() => goStage(position - 1)}
              >
                <ChevronLeftIcon size={16} />
                <span>{t('selfStudy.file.prev')}</span>
              </button>
              {total > 1 && (
                <span className="ssf__count" aria-live="polite">
                  {t('selfStudy.file.stagePosition', { current: String(position + 1), total: String(total) })}
                </span>
              )}
              {isLastStage ? (
                <button type="button" className="ssf-btn ssf-btn--primary" disabled={finishing || !frameLoaded} onClick={finish}>
                  <span>{t(place?.next ? 'selfStudy.file.nextLesson' : 'selfStudy.file.finish')}</span>
                  <ChevronRightIcon size={16} />
                </button>
              ) : (
                <button type="button" className="ssf-btn ssf-btn--primary" onClick={() => goStage(position + 1)}>
                  <span>{t('selfStudy.file.next')}</span>
                  <ChevronRightIcon size={16} />
                </button>
              )}
            </footer>
          </div>
        </main>
      </div>
      {contentsOpen && place && (
        <ContentsPanel
          place={place}
          lessonId={lesson.id}
          done={done}
          onPick={(id) => {
            closeContents()
            if (Number(id) !== Number(lesson.id)) onOpenLesson(id)
          }}
          onClose={closeContents}
        />
      )}
    </div>
  )
}

/**
 * Самостоятельный урок. Сервер говорит, есть ли у него пара в файле живого урока своего уровня
 * (selfStudyFile); нет пары или ответа — прежний экран: он сам покажет и закрытый урок, и
 * сохранённый на устройстве разбор, если нет связи.
 */
export default function SelfStudyLessonPage({ lessonId, token, fallback, ...lessonProps }) {
  const { t } = useI18n()
  const [state, setState] = useState({ status: 'loading', lesson: null })

  useEffect(() => {
    let alive = true
    getCourseCatalogLesson(lessonId, token)
      .then((lesson) => alive && setState({ status: lesson?.selfStudyFile ? 'file' : 'fallback', lesson }))
      .catch(() => alive && setState({ status: 'fallback', lesson: null }))
    return () => {
      alive = false
    }
  }, [lessonId, token])

  if (state.status === 'loading') {
    return (
      <div className="lw lw--loading" data-testid="self-study-file-lesson">
        <p className="lw-loading" role="status">{t('selfStudy.file.loading')}</p>
      </div>
    )
  }
  if (state.status === 'fallback') return fallback
  return <FileLesson lesson={state.lesson} token={token} {...lessonProps} />
}
