import { useEffect, useRef } from 'react'
import { CloseIcon } from '../icons.jsx'
import { speakerNames } from './listening.js'
import { useI18n } from '../../i18n.jsx'

/**
 * Транскрипт части (Figma: реплики с подписью говорящего, текущая подсвечена синим). Текущая — по времени плеера
 * или выбранная в разборе (line вопроса). Клик по реплике переводит запись к её началу, если перемотка разрешена:
 * onSeek получает НОМЕР реплики — её место на шкале знает плеер (у синтеза оно не совпадает с таймкодом сценария).
 */
export default function TranscriptPanel({ transcript, voices, current, onSeek, onClose, mark }) {
  const { t } = useI18n()
  const names = speakerNames(voices)
  const boxRef = useRef(null)

  useEffect(() => {
    const el = boxRef.current?.querySelector(`[data-line="${mark ?? current}"]`)
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [current, mark])

  return (
    <section className="ih-transcript" aria-label={t('ieltsListening.transcript')}>
      <header>
        <h3>{t('ieltsListening.transcript')}</h3>
        {onClose && (
          <button type="button" className="ih-transcript__close" onClick={onClose} aria-label={t('ieltsReading.close')}>
            <CloseIcon size={20} />
          </button>
        )}
      </header>
      <div className="ih-transcript__lines" ref={boxRef}>
        {(transcript || []).map((l, i) => (
          <button
            key={i}
            type="button"
            data-line={i}
            className={`ih-tline ${i === current ? 'is-current' : ''} ${i === mark ? 'is-mark' : ''}`}
            onClick={() => onSeek?.(i)}
            disabled={!onSeek}
          >
            {l.speaker && <b>{names[l.speaker] || l.speaker}</b>}
            <span>{l.text}</span>
          </button>
        ))}
        {!transcript?.length && <p className="ih-muted">{t('ieltsListening.noTranscript')}</p>}
      </div>
    </section>
  )
}
