import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { markIeltsPlanTask } from '../../api.js'
import { homeworkStateKey } from './homeworkFormat.js'
import { taskLabel, taskRoute } from '../../ielts/plan/planModel.js'
import { SECTION_META, SectionTile } from '../../ielts/sections.jsx'

/**
 * Домашнее задание IELTS (ieltsHomework.js): что задано, кем и к какому сроку, и кнопка, которая ведёт туда же,
 * куда «Начать» в плане IELTS (planModel.taskRoute), — тест, mock или набор слов. Отвечать здесь не на что: задание
 * закрывает сама сдача теста; файлов и «Отправить на проверку», как у обычной работы, у него нет. Отметку руками
 * ставит только задание без теста (completionRule self_report — «выписать связки», «повторить слова»).
 */
export default function IeltsHomeworkDetail({ card, token, onNav, onChanged }) {
  const { t, lang } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const task = card.task
  const stateKey = homeworkStateKey(card)
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(lang || 'ru', { day: 'numeric', month: 'long' })
  const selfReport = task.completionRule === 'self_report'
  const sec = SECTION_META[task.sec] ? task.sec : null
  // название секции: «Reading», «Полный пробный экзамен IELTS», «Vocabulary»
  const secName = task.sec === 'mock' ? t('homework.ielts.mock') : SECTION_META[task.sec]?.name || 'IELTS'

  const open = () => {
    const r = taskRoute(task)
    if (r.screen) onNav?.(r.screen, r.payload)
    else onNav?.('ielts', r)
  }
  const mark = async (done) => {
    setBusy(true)
    setError(null)
    try {
      await markIeltsPlanTask(token, task.id, done)
      onChanged?.()
    } catch {
      setError(t('homework.ielts.markFailed'))
    }
    setBusy(false)
  }

  return (
    <div className="hw-detail">
      <div className="hw-detail__head">
        <h2 className="hw-detail__title">{card.title || taskLabel(t, task)}</h2>
        <span className={`hw-badge hw-badge--${stateKey}`}>{t(`homework.status.${stateKey}`)}</span>
      </div>
      <div className="hw-detail__meta">
        <span>{t('homework.ieltsTask')}</span>
        {card.teacherName && <span>{t('homework.from', { name: card.teacherName })}</span>}
        {card.dueDate && <span>{t('homework.due', { date: fmt(card.dueDate) })}</span>}
      </div>

      <section className="hw-block">
        <h3 className="hw-block__title">{t('homework.task')}</h3>
        <div className="hw-ielts">
          {sec && <SectionTile section={sec} size={44} iconSize={22} />}
          <div className="hw-ielts__body">
            <b>{secName}</b>
            <span>{t('homework.ielts.minutes', { n: String(task.minutes || 0) })}</span>
          </div>
        </div>
        {card.note && (
          <div className="hw-ielts__note">
            <small>{t('homework.ielts.note')}</small>
            <p>{card.note}</p>
          </div>
        )}
        <p className="hw-ielts__hint">{t(card.done ? 'homework.ielts.doneHint' : selfReport ? 'homework.ielts.selfDone' : 'homework.ielts.autoDone')}</p>
        <div className="hw-actions">
          <button type="button" className="hw-submit" onClick={open}>
            {t(card.done ? 'homework.ielts.again' : task.status === 'in_progress' ? 'homework.ielts.continue' : 'homework.ielts.start')}
          </button>
          {selfReport && !card.done && (
            <button type="button" className="hw-ielts__mark" disabled={busy} onClick={() => mark(true)}>{t('homework.ielts.markDone')}</button>
          )}
        </div>
        {error && <p className="hw__error">{error}</p>}
      </section>
    </div>
  )
}
