import { useI18n } from '../../i18n.jsx'
import { CheckCircleIcon, CloseIcon, SchoolIcon, TimerIcon } from '../icons.jsx'

// Шапка экзамена полного mock (Figma 92:3658): логотип, «Mock 04 · Listening · Part 2», часы по серверу, отметка
// автосохранения и «Выйти». Действия секции (сдать, размер шрифта) — детьми справа от часов.
export function formatLong(sec) {
  if (sec == null) return '—'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`
}

export default function MockRunHeader({ mock, section, part, left, saveState, onExit, children }) {
  const { t } = useI18n()
  const chip = [mock?.title, section, part].filter(Boolean).join(' · ')
  return (
    <header className="ih-mockbar">
      <b className="ih-ob__logo">just to study</b>
      {chip && <span className="ih-mockbar__chip">{chip}</span>}
      <span className="ih-run__spacer" />
      {left !== undefined && (
        <span className={`ih-mockbar__clock ${left != null && left <= 300 ? 'is-low' : ''}`} role="timer" aria-live="off">
          <TimerIcon size={18} />
          <b>{formatLong(left)}</b>
          <small>{t('ieltsMock.byServer')}</small>
        </span>
      )}
      {saveState && (
        <span className={`ih-mockbar__saved is-${saveState}`} aria-live="polite">
          {saveState === 'saved' && <CheckCircleIcon size={16} />}
          {t(`ieltsMock.save.${saveState}`)}
        </span>
      )}
      {children}
      {onExit && (
        <button type="button" className="ih-btn ih-btn--outline ih-mockbar__exit" onClick={onExit} aria-label={t('ieltsMock.exit')}>
          <CloseIcon size={16} /> <span>{t('ieltsMock.exit')}</span>
        </button>
      )}
    </header>
  )
}

/**
 * Шапка теста вне mock — тот же вид, что у экзамена (макеты «IELTS new» 30 · Reading и 92:3658): логотип, фиолетовая
 * плашка «Reading · название», режим, часы, действия и «Назад» справа. Раньше — круглый крестик, заголовок в две
 * строки и чёрные кнопки: тест выглядел другим приложением рядом с хабом.
 */
export function RunTopBar({ chip, mode, clock, clockLow, onExit, children }) {
  const { t } = useI18n()
  return (
    <header className="ih-mockbar ih-runbar">
      <b className="ih-ob__logo">just to study</b>
      {chip && <span className="ih-mockbar__chip">{chip}</span>}
      {mode && <span className="ih-runbar__mode"><SchoolIcon size={16} />{mode}</span>}
      <span className="ih-run__spacer" />
      {clock != null && (
        <span className={`ih-mockbar__clock ${clockLow ? 'is-low' : ''}`} role="timer" aria-live="off">
          <TimerIcon size={18} />
          <b>{clock}</b>
        </span>
      )}
      {children}
      {onExit && (
        <button type="button" className="ih-btn ih-btn--outline ih-mockbar__exit" onClick={onExit} aria-label={t('ieltsReading.back')}>
          <CloseIcon size={16} /> <span>{t('ieltsReading.back')}</span>
        </button>
      )}
    </header>
  )
}
