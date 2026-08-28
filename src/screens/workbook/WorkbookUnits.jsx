'use client'

import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { ICON } from '../../practice/workbook/engine.js'
import { lessonDone, missCount, nextLesson } from '../../practice/workbook/workbookProgress.js'
import { loc, vocEmoji, vocMeaning } from './loc.js'

// Каталог уровня: юниты-аккордеоны с уроками. Порт renderHome
// (data/jtsworkbook-a0.html:6189) — раскрытие юнита не прыгает наверх
// (в прототипе это чинили опцией keepScroll), потому что тут ничего не
// перерисовывается заново: открытый юнит — обычное состояние компонента.

export function Ring({ percent, size = 64, label }) {
  const r = size / 2 - 5
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.max(0, Math.min(1, percent / 100)))
  return (
    <div className="wb-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--wb-line)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--wb-purple)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={off.toFixed(1)}
        />
      </svg>
      <b>{label !== undefined ? label : percent + '%'}</b>
    </div>
  )
}

function LessonRow({ level, n, meta, progress, onOpen, review }) {
  const { t, lang } = useI18n()
  const done = lessonDone(level, n, meta.acts, progress)
  const pct = meta.acts ? Math.round((done / meta.acts) * 100) : 0
  const full = done >= meta.acts
  return (
    <button type="button" className={'wb-lrow' + (full ? ' is-done' : '')} onClick={() => onOpen(n)}>
      {/* Итог юнита — звёздочкой, как в оригинале: номер 101 читался как
          «сто первый урок», хотя это разбор пройденного за юнит. Признак
          берём из структуры каталога (юнит указывает на него полем rev), а не
          из поля урока: public/ отдаётся с часовым кэшем, и у клиента может
          лежать index.json, собранный до появления этого поля. */}
      <span className={'wb-lrow__n' + (review ? ' wb-lrow__n--star' : '')}>{review ? '★' : n}</span>
      <span className="wb-lrow__b">
        <b>{meta.title}</b>
        <span className="wb-lrow__fn">{loc(meta.fn, lang) || meta.gr || ''}</span>
        <span className="wb-lrow__bar">
          <i style={{ width: pct + '%' }} />
        </span>
      </span>
      <span className="wb-lrow__c">
        {done} / {meta.acts}
        <em>{t('workbook.screens')}</em>
      </span>
    </button>
  )
}

export default function WorkbookUnits({ level, index, progress, onOpenLesson, onReview, levelTitle }) {
  const { t } = useI18n()
  const counts = Object.fromEntries(Object.entries(index.lessons).map(([n, m]) => [n, m.acts]))
  const nums = Object.keys(index.lessons).map(Number).sort((a, b) => a - b)
  const doneAll = nums.reduce((s, n) => s + lessonDone(level, n, counts[n], progress), 0)
  const totalAll = nums.reduce((s, n) => s + counts[n], 0)
  const pct = totalAll ? Math.round((doneAll / totalAll) * 100) : 0
  const mistakes = missCount(level, progress)
  const cont = nextLesson(level, nums, counts, progress)

  // Первый незакрытый юнит раскрыт сразу: студент попадает туда, где он есть.
  const [open, setOpen] = useState(() => {
    // У A1 ревью-уроков нет вовсе, а у B2 они есть только у каждого третьего
    // юнита — rev может быть null, и приклеивать его вслепую нельзя.
    const u = index.units.find((x) => x.ls.concat(x.rev == null ? [] : [x.rev]).includes(cont))
    return u ? { [u.n]: true } : {}
  })

  return (
    <>
      <div className="wb-hero">
        <div className="wb-hero__t">
          <h1>{levelTitle}</h1>
          <p>
            {doneAll} / {totalAll} {t('workbook.screensDone')}
          </p>
          <button type="button" className="wb-primary" onClick={() => onOpenLesson(cont)}>
            {doneAll ? t('workbook.continue') : t('workbook.start')}
          </button>
        </div>
        <Ring percent={pct} />
      </div>

      {mistakes > 0 ? (
        <button type="button" className="wb-mistakes" onClick={onReview}>
          <span className="wb-mistakes__ic" aria-hidden="true">
            ⌾
          </span>
          <span>
            <b>{t('workbook.reviewTitle')}</b>
            <em>{t('workbook.mistakesN', { n: mistakes })}</em>
          </span>
          <span className="wb-mistakes__go">→</span>
        </button>
      ) : null}

      {index.units.map((u) => {
        const ls = u.ls.concat(u.rev == null ? [] : [u.rev])
        const uDone = ls.reduce((s, n) => s + lessonDone(level, n, counts[n], progress), 0)
        const uTotal = ls.reduce((s, n) => s + counts[n], 0)
        const isOpen = !!open[u.n]
        return (
          <div className={'wb-unit' + (isOpen ? ' is-open' : '')} key={u.n}>
            <button
              type="button"
              className="wb-unit__head"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [u.n]: !o[u.n] }))}
            >
              <span className="wb-unit__n">{u.n}</span>
              <span className="wb-unit__t">
                <b>{u.title}</b>
                <em>
                  {uDone} / {uTotal} {t('workbook.screens')}
                </em>
              </span>
              <span className="wb-unit__chev" aria-hidden="true">
                {isOpen ? '▴' : '▾'}
              </span>
            </button>
            {isOpen ? (
              <div className="wb-unit__body">
                {ls.map((n) => (
                  <LessonRow
                    key={n}
                    level={level}
                    n={n}
                    meta={index.lessons[n]}
                    progress={progress}
                    onOpen={onOpenLesson}
                    review={n === u.rev || !!index.lessons[n].test}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

/** Оглавление урока: шаги, слова и фразы «на уроке». Порт openLessonSheet (:6345). */
export function LessonSheet({ level, lesson, progress, meta, onPick, onClose }) {
  const { t, lang } = useI18n()
  const [tab, setTab] = useState('steps')
  // Третья вкладка зависит от уровня: у A0 это фразы «на уроке» (CLASS), с A1
  // автор их не выпускает, зато у урока появляется «полезный язык». Пустую
  // вкладку не показываем — она читалась бы как потерянные данные.
  const help = (meta.classroom || []).length ? 'help' : lesson.useful?.length ? 'useful' : null
  const tabs = ['steps', 'words'].concat(help ? [help] : [])
  return (
    <div className="wb-sheetwrap" role="dialog" aria-modal="true">
      <div className="wb-scrim" onClick={onClose} />
      <div className="wb-sheet">
        <div className="wb-sheet__tabs">
          {tabs.map((k) => (
            <button
              key={k}
              type="button"
              className={'wb-sheet__tab' + (tab === k ? ' is-on' : '')}
              onClick={() => setTab(k)}
            >
              {t('workbook.tab.' + k)}
            </button>
          ))}
          <button type="button" className="wb-sheet__x" aria-label={t('workbook.close')} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="wb-sheet__body">
          {tab === 'steps' ? (
            <div className="wb-steps">
              {lesson.acts.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  className={'wb-step' + (progress.prog[level + ':' + lesson.n + '.' + i] ? ' is-done' : '')}
                  onClick={() => onPick(i)}
                >
                  <span aria-hidden="true">{ICON[a.t] || '✳️'}</span>
                  <b>{t('workbook.type.' + a.t)}</b>
                  <em>{i + 1}</em>
                </button>
              ))}
            </div>
          ) : null}
          {tab === 'words' ? (
            <div className="wb-words">
              {lesson.voc.map((v, i) => (
                <div className="wb-word" key={i}>
                  <span aria-hidden="true">{vocEmoji(v, meta.voc)}</span>
                  <b>{v[0]}</b>
                  <em>{vocMeaning(v, lang, meta.voc)}</em>
                </div>
              ))}
            </div>
          ) : null}
          {tab === 'useful' ? (
            <div className="wb-words">
              <p className="wb-help__hint">{t('workbook.usefulHint')}</p>
              {(lesson.useful || []).map((p, i) => (
                <div className="wb-word" key={i}>
                  <span aria-hidden="true">💬</span>
                  <b>{p}</b>
                </div>
              ))}
            </div>
          ) : null}
          {tab === 'help' ? (
            <div className="wb-help">
              <p className="wb-help__hint">{t('workbook.classHint')}</p>
              {(meta.classroom || []).map((p, i) => (
                <div className="wb-word" key={i}>
                  <span aria-hidden="true">{p.e || '💬'}</span>
                  <b>{p.en}</b>
                  {/* На английском интерфейсе перевод не дублируем — это была
                      бы та же строка дважды. */}
                  {lang === 'en' ? null : <em>{lang === 'kk' ? p.kk : p.ru}</em>}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
