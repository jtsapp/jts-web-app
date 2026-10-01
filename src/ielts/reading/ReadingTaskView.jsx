import { useEffect, useState } from 'react'
import Breadcrumbs from '../ui/Breadcrumbs.jsx'
import Chip from '../ui/Chip.jsx'
import PillButton from '../ui/PillButton.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { SectionTile } from '../sections.jsx'
import { getIeltsTest } from '../../api.js'
import { loadToken } from '../../lib/session.js'
import { typeLabel } from './meta.js'
import { examSeconds, loadDraft, dropDraft, MODES } from './run.js'
import { formatDate } from '../format.js'
import { ArrowForwardIcon, CheckCircleIcon, DescriptionIcon, EditIcon, HeadphonesIcon, MenuBookIcon, RadioOffIcon, Replay5Icon, TaskAltIcon, TimerIcon, TranslateIcon } from '../icons.jsx'
import { totalAudioSec } from '../listening/listening.js'
import { useI18n } from '../../i18n.jsx'

const MODE_ICON = { exam: TimerIcon, practice: TaskAltIcon, study: MenuBookIcon }

// Полный тест (60 минут, 40 вопросов) и mock'и идут только экзаменом — как в прототипе: band по ним считается
// по таблице и честен лишь в условиях экзамена. Тренажёры и отдельные тексты — в любом из трёх режимов.
export function modesFor(test) {
  return test?.kind === 'test' ? ['exam'] : MODES
}

// Подзаголовок текста: «Passage 1» у Academic, «Section 1» у GT, «Full test» у полного теста — как на экзамене,
// по-английски во всех языках.
export function partLabel(test, doc) {
  if (test.kind === 'test') return 'Full test'
  if (doc?.skill === 'listening' && doc.parts?.length) return `Part ${doc.parts[0].number}`
  if (doc?.passage) return `Passage ${doc.passage}`
  if (doc?.section) return `Section ${doc.section}`
  return null
}

function lastAttemptLine(a, t, lang) {
  const min = Math.floor((a.timeSec || 0) / 60)
  const sec = (a.timeSec || 0) % 60
  return `${t(`ieltsReading.mode.${a.mode}`)} · ${formatDate(a.finishedAt, lang)} · ${t('ieltsReading.minSec', { m: String(min), s: String(sec) })}`
}

// Экран задания (Figma «5 · Reading — задание и режим»): о чём текст, режим, последняя попытка, инструменты.
// Тот же экран у Listening (skill="listening"): цвет секции, длина записи вместо слов, свои подсказки режимов.
export default function ReadingTaskView({ token, testId, listLabel, onBackToLearn, onBackToList, onStart, onReview, skill = 'reading' }) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ status: 'loading' })
  const [mode, setMode] = useState(null)
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    let alive = true
    getIeltsTest(token || loadToken(), testId)
      .then((r) => alive && setState({ status: 'ready', test: r.test, doc: r.document }))
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error' }))
    setDraft(loadDraft(testId))
    return () => {
      alive = false
    }
  }, [token, testId])

  const listening = skill === 'listening'
  const crumbs = [{ label: t('ieltsHub.tab.learn'), onClick: onBackToLearn }, { label: listening ? 'Listening' : 'Reading', onClick: onBackToLearn }]
  if (listLabel) crumbs.push({ label: listLabel, onClick: onBackToList })

  if (state.status !== 'ready') {
    return (
      <div className="ih-rtask">
        <Breadcrumbs items={[...crumbs, { label: '…' }]} />
        {state.status === 'loading' ? (
          <p className="ih-muted">{t('ieltsReading.loading')}</p>
        ) : (
          <EmptyState icon={<MenuBookIcon size={28} />} title={t(state.status === 'missing' ? 'ieltsReading.missingTitle' : 'ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />
        )}
      </div>
    )
  }

  const { test, doc } = state
  const allowed = modesFor(test)
  const chosen = draft ? draft.mode : mode && allowed.includes(mode) ? mode : allowed.includes('practice') ? 'practice' : allowed[0]
  const minutes = listening ? Math.max(1, Math.round(totalAudioSec(doc) / 60)) : Math.round(examSeconds(doc) / 60)
  const topic = doc.topic?.[lang] || doc.topic?.ru || (listening ? doc.parts?.[0]?.context : null)
  const part = partLabel(test, doc)
  const last = test.lastAttempt

  return (
    <div className="ih-rtask">
      <Breadcrumbs items={[...crumbs, { label: test.title }]} />
      <div className="ih-rtask__grid">
        <div className="ih-rtask__main">
          <section className={`ih-card ih-rtask__info ${listening ? 'is-listening' : ''}`}>
            <div className="ih-rtask__title">
              <SectionTile section={skill} size={48} iconSize={24} />
              <div>
                <h2>{test.title}</h2>
                {topic && <p>{topic}</p>}
              </div>
            </div>
            <div className="ih-rtask__chips">
              {/* Listening общий для Academic и GT — модуль у него не подписываем */}
              {!listening && <Chip tone="neutral" className="ih-chip--soft-ink">{test.module === 'general' ? 'General Training' : 'Academic'}</Chip>}
              {part && <Chip tone="neutral" className="ih-chip--soft-ink">{part}</Chip>}
              <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsReading.questions', { n: String(test.questionCount) })}</Chip>
              {test.words > 0 && <Chip tone="neutral" className="ih-chip--soft-ink">{t('ieltsReading.words', { n: String(test.words) })}</Chip>}
              <Chip tone="neutral" className="ih-chip--soft-ink">{t(listening ? 'ieltsListening.audioMin' : 'ieltsReading.aboutMin', { n: String(minutes) })}</Chip>
            </div>
            <div className="ih-rtask__types">
              <span>{t('ieltsReading.questionTypes')}</span>
              {[...new Set(test.questionTypes.map(typeLabel))].map((label) => (
                <Chip key={label} tone="orange" size="sm" className={listening ? 'ih-chip--listening' : 'ih-chip--reading'}>{label}</Chip>
              ))}
            </div>
          </section>

          <h3 className="ih-rtask__label">{t('ieltsReading.modeLabel')}</h3>
          {draft && (
            <div className="ih-rtask__draft" role="status">
              {t('ieltsReading.draftNote', { mode: t(`ieltsReading.mode.${draft.mode}`), n: String(Object.keys(draft.answers || {}).length) })}
              <button type="button" onClick={() => { dropDraft(testId); setDraft(null) }}>{t('ieltsReading.draftDrop')}</button>
            </div>
          )}
          <div className="ih-modes" role="radiogroup" aria-label={t('ieltsReading.modeLabel')}>
            {MODES.map((m) => {
              const Icon = MODE_ICON[m]
              const on = chosen === m
              const disabled = !allowed.includes(m) || (draft && draft.mode !== m)
              return (
                <button key={m} type="button" role="radio" aria-checked={on} disabled={disabled} className={`ih-mode ${on ? 'is-on' : ''}`} onClick={() => setMode(m)}>
                  <span className="ih-mode__icon"><Icon size={22} /></span>
                  <span className="ih-mode__body">
                    <b>{t(`ieltsReading.mode.${m}`)}</b>
                    <span>{listening ? t(`ieltsListening.modeHint.${m}`) : m === 'exam' ? t('ieltsReading.modeHint.exam', { n: String(minutes) }) : t(`ieltsReading.modeHint.${m}`)}</span>
                  </span>
                  <span className="ih-mode__radio">{on ? <CheckCircleIcon size={22} /> : <RadioOffIcon size={22} />}</span>
                </button>
              )
            })}
          </div>
          <div className="ih-rtask__start">
            <button type="button" className="ih-cta" onClick={() => onStart(test.id, chosen, test.kind)}>
              {draft ? t('ieltsReading.continue') : t(`ieltsReading.start.${chosen}`)}
              <ArrowForwardIcon size={20} />
            </button>
          </div>
        </div>

        <aside className="ih-rtask__side">
          <section className="ih-rtask__tools">
            <h3>{t(listening ? 'ieltsListening.tools.title' : 'ieltsReading.tools.title')}</h3>
            {listening ? (
              <>
                <p><Replay5Icon size={18} />{t('ieltsListening.tools.player')}</p>
                <p><DescriptionIcon size={18} />{t('ieltsListening.tools.transcript')}</p>
                <p><HeadphonesIcon size={18} />{t('ieltsListening.tools.segment')}</p>
              </>
            ) : (
              <>
                <p><EditIcon size={18} />{t('ieltsReading.tools.marker')}</p>
                <p><TranslateIcon size={18} />{t('ieltsReading.tools.vocab')}</p>
                <p><MenuBookIcon size={18} />{t('ieltsReading.tools.paragraph')}</p>
              </>
            )}
          </section>
          <section className="ih-card ih-rtask__last">
            <h3>{t('ieltsReading.last.title')}</h3>
            {last ? (
              <>
                <div className="ih-rtask__score">
                  <b>{t('ieltsReading.of', { n: String(last.rawScore), total: String(last.maxScore) })}</b>
                  <span>· {t('ieltsReading.accuracy', { n: String(Math.round((last.rawScore / Math.max(1, last.maxScore)) * 100)) })}</span>
                </div>
                <p>{lastAttemptLine(last, t, lang)}{last.band != null ? ` · band ${last.band.toFixed(1)}` : ''}</p>
                <PillButton variant="outline" onClick={() => onReview(last.id)}>{t('ieltsReading.last.open')}</PillButton>
              </>
            ) : (
              <p>{t('ieltsReading.last.none')}</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  )
}
