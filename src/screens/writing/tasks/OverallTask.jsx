import { useEffect, useState } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { TASKS_PER_GENRE } from '../../../practice/writing/engine.js'
import { overallBand, overallVerdict } from '../../../practice/writing/resultFormat.js'
import { markTask, taskState } from '../../../practice/writing/writingProgress.js'
import { lastAssessmentFor } from '../../../practice/writing/writingStore.js'
import TaskShell, { Ring, tOr } from '../TaskShell.jsx'

// 11. overall — итог, который сайт считает сам (порт rOverall,
// jtswriting.html:11241). Ученик ничего себе не ставит: берём выполненные
// упражнения, точность ответов и оценки проверенного текста.

const CRIT_IDS = ['task', 'organisation', 'vocabulary', 'grammar']

// Вердикт движка — английская строка; переводим по её началу, а не дублируем
// пороги (фолбэк — оригинал строки).
function verdictKey(verdictEn) {
  if (verdictEn.indexOf('Strong') === 0) return 'strong'
  if (verdictEn.indexOf('Solid') === 0) return 'solid'
  if (verdictEn.indexOf('Getting') === 0) return 'getting'
  if (verdictEn.indexOf('Early') === 0) return 'early'
  return 'none'
}

export default function OverallTask({ genre, task }) {
  const { t } = useI18n()
  // «Обновить итог» — принудительная перерисовка; сами данные каждый раз
  // читаются из localStorage заново.
  const [, setTick] = useState(0)

  const taskStates = {}
  genre.tasks.forEach((tk) => {
    const st = taskState(genre.id, tk.id)
    if (st) taskStates[tk.id] = st
  })
  const band = overallBand(genre, taskStates, lastAssessmentFor(genre.id))
  const earned = Math.round(band.percent / 25)

  // Самозачёт задания t11: после трёх выполненных упражнений жанра, один раз
  // (как в прототипе — markTask по best-of дальше не ухудшается).
  const done3 = band.stats.done >= 3
  useEffect(() => {
    if (done3 && !taskState(genre.id, task.id)) {
      markTask(genre.id, task.id, Math.max(1, earned), 4)
    }
  }, [done3, earned, genre.id, task.id])

  const textPct = band.last
    ? Math.round((CRIT_IDS.reduce((a, id) => a + band.last.scores[id], 0) / CRIT_IDS.length / 5) * 100)
    : 0
  const verdictEn = overallVerdict(band)
  const verdict = tOr(t, 'writing.overall.verdict.' + verdictKey(verdictEn), verdictEn)

  return (
    <TaskShell genre={genre} task={task} scoreText={Math.max(0, earned) + ' / 4'}>
      <div className="wr-rings">
        <div className="wr-ringwrap">
          <Ring
            percent={(band.stats.done / TASKS_PER_GENRE) * 100}
            color="var(--wr-purple)"
            size={76}
            label={band.stats.done + '/' + TASKS_PER_GENRE}
          />
          <div>{t('writing.overall.rings.done')}</div>
        </div>
        <div className="wr-ringwrap">
          <Ring
            percent={band.stats.accuracy}
            color="var(--wr-sky-ink)"
            size={76}
            label={band.stats.accuracy + '%'}
          />
          <div>{t('writing.overall.rings.accuracy')}</div>
        </div>
        <div className="wr-ringwrap">
          <Ring
            percent={textPct}
            color="var(--wr-green)"
            size={76}
            label={band.last ? Math.round((textPct / 20) * 10) / 10 + '/5' : '—'}
          />
          <div>{t('writing.overall.rings.text')}</div>
        </div>
        <div className="wr-ringwrap">
          <Ring percent={band.percent} color="var(--wr-gold)" size={76} label={band.score + '/5'} />
          <div>{t('writing.overall.rings.overall')}</div>
        </div>
      </div>

      <div className="wr-fb wr-fb--tip">{verdict}</div>

      {band.cefr ? (
        <div className="wr-row">
          <span className="wr-cefrbig">{t('writing.overall.cefr', { cefr: band.cefr })}</span>
        </div>
      ) : (
        <div className="wr-fb wr-fb--tip">{t('writing.overall.noTextTip')}</div>
      )}

      {/* Разбор по критериям — не самооценка, а то, что увидела проверка. */}
      {task.items.map((c) => {
        const label = tOr(t, 'writing.overall.crit.' + c.id, c.label)
        if (band.last) {
          const real = band.last.scores[c.id]
          const good = real >= 3.5
          return (
            <div key={c.id} className={'wr-fb ' + (good ? 'wr-fb--ok' : 'wr-fb--no')}>
              <b>
                {label}: {real} / 5.{' '}
              </b>
              {good
                ? t('writing.overall.holds')
                : t('writing.overall.lookAt', { hint: genre.rubricHints[c.id] || '' })}
            </div>
          )
        }
        return (
          <div key={c.id} className="wr-fb wr-fb--tip">
            <b>
              {label}: {t('writing.overall.critNotChecked')}{' '}
            </b>
            {genre.rubricHints[c.id] || ''}
          </div>
        )
      })}

      {/* Поздравление — только когда жанр действительно пройден. */}
      {band.stats.done >= TASKS_PER_GENRE && band.last ? (
        <div className="wr-done-card">
          <h3>{t('writing.congrats.title')}</h3>
          <p>{t('writing.congrats.goal', { goal: genre.goal })}</p>
          <p>{t('writing.overall.congratsBody', { n: TASKS_PER_GENRE, title: genre.title })}</p>
        </div>
      ) : (
        <div className="wr-fb wr-fb--tip">{t('writing.overall.keepGoing')}</div>
      )}

      <div className="wr-row">
        <button
          type="button"
          className="wr-ghost wr-btn-sm"
          onClick={() => setTick((n) => n + 1)}
        >
          {t('writing.overall.refresh')}
        </button>
      </div>
    </TaskShell>
  )
}
