'use client'

// Видеодиктант — раздел Практики (вкладка «Аудирование»): звучит фраза из мультфильма, ученик печатает услышанное по
// буквам. Спека — docs/superpowers/specs/2026-11-18-video-dictation-design.md. Уроки ведёт методист в web-admin
// («Библиотека → Видеодиктант»), сайт читает /mobile/video-dictation…; движок — src/practice/video-dictation/,
// экраны — src/screens/video-dictation/.
//
// Экран держит навигацию раздела (список → урок) и адрес: ?lesson=<slug> пишет сам, пока урок открыт (F5 и ссылка
// возвращают в урок), и снимает при уходе — общая синхронизация адреса в App знает только свои ключи.

import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { VIDEO_DICTATION_PROGRESS_EVENT } from '../practice/practiceKeys.js'
import { readBest } from '../practice/video-dictation/progress.js'
import Icon from './listen/ListenIcons.jsx'
import LessonList from './video-dictation/LessonList.jsx'
import LessonRun from './video-dictation/LessonRun.jsx'
import { writeLessonParam } from './video-dictation/lessonParam.js'
import { useVideoDictationIndex, useVideoDictationLesson } from './video-dictation/useVideoDictationData.js'

const NOTICE = {
  guest: 'videoDictation.guest',
  missing: 'videoDictation.notUploaded',
  error: 'videoDictation.loadFailed',
  lessonMissing: 'videoDictation.lessonMissing',
  lessonEmpty: 'videoDictation.lessonEmpty',
}

function Notice({ status, t, onRetry, onExit }) {
  return (
    <div className={`jl-notice${status === 'error' ? ' jl-notice--err' : ''}`} role="status" data-status={status}>
      {t(NOTICE[status])}
      {status === 'error' && onRetry && (
        <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={onRetry}>
          {t('videoDictation.retry')}
        </button>
      )}
      {onExit && (
        <button type="button" className="jl-btn jl-btn--ghost jl-btn--sm" onClick={onExit}>
          {t('videoDictation.toList')}
        </button>
      )}
    </div>
  )
}

function ListSkeleton({ t }) {
  return (
    <>
      <p className="vd-sr" role="status">
        {t('videoDictation.loading')}
      </p>
      <ul className="vd-grid" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <span className="vd-card vd-card--skel">
              <span className="vd-card__thumb vd-skel" />
              <span className="vd-card__body">
                <span className="vd-skel vd-skel--line" />
                <span className="vd-skel vd-skel--line vd-skel--short" />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}

function LessonSkeleton({ t }) {
  return (
    <div className="vd-run">
      <p className="vd-sr" role="status">
        {t('videoDictation.lessonLoading')}
      </p>
      <div className="vd-player" aria-hidden="true" />
      <div className="jl-card vd-stage" aria-hidden="true">
        <span className="vd-skel vd-skel--line vd-skel--short" />
        <span className="vd-skel vd-skel--line" />
      </div>
    </div>
  )
}

export default function VideoDictationPage({ userName, userLevel, token, onNav, onProfile, onBack, backLabel, initialTarget }) {
  const { t, lang } = useI18n()
  const index = useVideoDictationIndex(token)
  const [slug, setSlug] = useState(initialTarget?.lesson || null)
  // Уровень списка; null — по умолчанию (уровень ученика, если на нём есть уроки). Живёт здесь, а не в списке:
  // список размонтируется на время урока, а вернуться ученик должен туда же.
  const [level, setLevel] = useState(null)
  const lesson = useVideoDictationLesson(token, slug)
  const [best, setBest] = useState(readBest)

  useEffect(() => {
    const sync = () => setBest(readBest())
    window.addEventListener(VIDEO_DICTATION_PROGRESS_EVENT, sync)
    return () => window.removeEventListener(VIDEO_DICTATION_PROGRESS_EVENT, sync)
  }, [])

  useEffect(() => {
    writeLessonParam(slug)
    window.scrollTo(0, 0)
  }, [slug])
  useEffect(() => () => writeLessonParam(null), [])

  const toList = () => setSlug(null)
  const goBack = () => (onBack ? onBack() : onNav?.('practice', { skill: 'listening' }))

  let body
  if (!token) body = <Notice status="guest" t={t} />
  else if (slug) {
    if (lesson.status === 'ready') body = <LessonRun key={slug} lesson={lesson.lesson} t={t} onExit={toList} />
    else if (lesson.status === 'missing') body = <Notice status="lessonMissing" t={t} onExit={toList} />
    else if (lesson.status === 'empty') body = <Notice status="lessonEmpty" t={t} onExit={toList} />
    else if (lesson.status === 'error') body = <Notice status="error" t={t} onRetry={lesson.retry} onExit={toList} />
    else body = <LessonSkeleton t={t} />
  } else if (index.status === 'ready') {
    body = (
      <LessonList
        lessons={index.lessons}
        best={best}
        level={level}
        userLevel={userLevel}
        t={t}
        lang={lang}
        onLevel={setLevel}
        onOpen={setSlug}
      />
    )
  } else if (index.status === 'loading') body = <ListSkeleton t={t} />
  else body = <Notice status={index.status} t={t} onRetry={index.retry} />

  const title = slug && lesson.status === 'ready' ? lesson.lesson.title : t('videoDictation.title')
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="jl vd pk-c--listening">
        <div className="jl-top">
          <button type="button" className="jl-back" onClick={slug ? toList : goBack}>
            <Icon name="back" /> {slug ? t('videoDictation.toList') : backLabel || t('videoDictation.toPractice')}
          </button>
          <span className="jl-crumb">
            <b lang={slug && lesson.status === 'ready' ? 'en' : undefined}>{title}</b>
          </span>
        </div>
        {body}
      </div>
    </LearningLayout>
  )
}
