'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { micEnvironment } from '../lib/micAccess.js'
import { MicHelp } from './MicCheck.jsx'

// Плашка над тестом уровня: микрофон недоступен ещё ДО теста (запрещён, не найден, браузер не пишет звук). Говорение —
// последний раздел, и узнать о проблеме на нём, пройдя всё остальное, обидно. Разрешения не спрашивает (micEnvironment):
// всё в порядке или браузер ещё не спрашивал — плашки нет, проверит само окно говорения.
export default function MicNotice() {
  const { t } = useI18n()
  const [issue, setIssue] = useState(null)
  const [open, setOpen] = useState(false)
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    let alive = true
    micEnvironment().then((e) => {
      if (alive) setIssue(e.issue)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!issue || closed) return null
  return (
    <div className="pl-micnote" role="status" data-testid="mic-notice" data-kind={issue}>
      <div className="pl-micnote__row">
        <span className="pl-micnote__text">
          <b>{t('placement.mic.noticeTitle')}</b> {t(`placement.mic.issue.${issue}`)}
        </span>
        <button type="button" className="pl-micnote__how" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {t(open ? 'placement.mic.hide' : 'placement.mic.howTo')}
        </button>
        <button type="button" className="pl-micnote__close" aria-label={t('placement.mic.close')} onClick={() => setClosed(true)}>
          ×
        </button>
      </div>
      {open && <MicHelp kind={issue} />}
    </div>
  )
}
