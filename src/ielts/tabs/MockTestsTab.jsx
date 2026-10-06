import { useEffect, useState } from 'react'
import Chip from '../ui/Chip.jsx'
import PillButton from '../ui/PillButton.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import { TrackSwitch } from '../reading/ReadingListView.jsx'
import { fullTests, singleTexts, testNumber } from '../reading/catalog.js'
import { listDrafts, pausedLeftSec } from '../reading/run.js'
import { listeningFullTests } from '../listening/catalog.js'
import { plural } from '../../lib/plural.js'
import { HeadphonesIcon, MenuBookIcon, TimerIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Вкладка «Пробные тесты» (Figma «Пробные тесты»): незаконченный тест, четыре формата и таблица выбранного.
// Reading — живой (один текст 20 минут и полный тест 60 минут), Listening — полные тесты банка (kind: test, 4 части);
// полный mock — «Готовится»
//. Mock идёт только экзаменом: band честен лишь в условиях экзамена.
const FORMATS = ['single', 'full', 'listening', 'fullMock']

function resultLine(a, t) {
  if (!a) return null
  const band = a.band != null ? ` · band ${a.band.toFixed(1)}` : ''
  return `${t('ieltsReading.of', { n: String(a.rawScore), total: String(a.maxScore) })}${band}`
}

export default function MockTestsTab({ catalog, listeningCatalog, track, onTrack, onStart, onOpenTest }) {
  const { t, lang } = useI18n()
  const [format, setFormat] = useState('full')
  const [draft, setDraft] = useState(null)

  // черновик — с устройства, читаем после монтирования (иначе SSR и клиент разойдутся)
  useEffect(() => {
    const ids = new Set(catalog.items.map((x) => x.id))
    const mocks = listDrafts().filter((d) => ids.has(d.testId) && d.mode === 'exam')
    const d = mocks.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0] || null
    // остаток — на момент закрытия: таймер черновика стоит, пока тест закрыт (Figma «Пробные тесты»)
    setDraft(d && { ...d, minLeft: Math.max(0, Math.round(pausedLeftSec(d) / 60)) })
  }, [catalog.items])

  const single = singleTexts(catalog.items, track)
  const full = fullTests(catalog.items, track)
  const draftTest = draft && catalog.items.find((x) => x.id === draft.testId)
  // Listening общий для обоих треков (ТЗ §3) — трек его не фильтрует
  const listening = listeningFullTests(listeningCatalog?.items)
  const rows = format === 'single' ? single : format === 'listening' ? listening : full
  const shown = format === 'listening' ? listeningCatalog || { status: 'loading' } : catalog

  const card = (key) => {
    const live = key === 'single' || key === 'full' || key === 'listening'
    const count = key === 'single' ? single.length : key === 'full' ? full.length : key === 'listening' ? listening.length : 0
    const icon = key === 'listening' ? <HeadphonesIcon size={20} /> : key === 'fullMock' ? <TimerIcon size={20} /> : <MenuBookIcon size={20} />
    const content = (
      <>
        <span className="ih-format__top">
          <span className={`ih-format__icon ih-format__icon--${key === 'listening' ? 'listening' : key === 'fullMock' ? 'mock' : 'reading'}`}>{icon}</span>
          {live ? (
            <Chip tone="green" size="sm">{t('ieltsMocks.available', { n: String(count) })}</Chip>
          ) : (
            <Chip tone="muted" size="sm">{t('ieltsMocks.preparing')}</Chip>
          )}
        </span>
        <b>{t(`ieltsMocks.format.${key}.title`)}</b>
        <span className="ih-format__meta">{t(`ieltsMocks.format.${key}.meta`)}</span>
        <span className="ih-format__text">{t(`ieltsMocks.format.${key}.text`)}</span>
      </>
    )
    return live ? (
      <button key={key} type="button" className={`ih-format ${format === key ? 'is-on' : ''}`} onClick={() => setFormat(key)} aria-pressed={format === key}>
        {content}
      </button>
    ) : (
      <div key={key} className="ih-format is-off">{content}</div>
    )
  }

  return (
    <div className="ih-mocks">
      {draft && draftTest && (
        <div className="ih-mocks__draft" role="status">
          <TimerIcon size={22} />
          <div>
            <b>{t('ieltsMocks.draft.title', { name: `Reading, ${draftTest.kind === 'test' ? `Test ${testNumber(draftTest.id) ?? ''}` : draftTest.title}` })}</b>
            <span>
              {t('ieltsMocks.draft.text', {
                // ответ choose-TWO — массив букв, и каждая буква — свой номер из 40
                n: String(Object.values(draft.answers || {}).reduce((s, v) => s + (Array.isArray(v) ? v.length : v ? 1 : 0), 0)),
                total: String(draftTest.maxScore || draftTest.questionCount),
                left: plural(t, lang, 'ieltsHub.minutesLeft', draft.minLeft),
              })}
            </span>
          </div>
          <button type="button" className="ih-btn ih-btn--dark" onClick={() => onStart(draft.testId, 'exam')}>{t('ieltsMocks.draft.continue')}</button>
        </div>
      )}

      <div className="ih-mocks__formats">{FORMATS.map(card)}</div>

      <section className="ih-card ih-mocks__table">
        <header className="ih-mocks__head">
          <h2>{t(`ieltsMocks.tableTitle.${format}`)}{format === 'listening' ? '' : ` · ${track === 'general' ? 'General Training' : 'Academic'}`}</h2>
          {format !== 'listening' && <TrackSwitch track={track} onChange={onTrack} />}
          <Chip tone="neutral" size="sm" className="ih-chip--soft-ink">
            {t('ieltsMocks.passed', { n: String(rows.filter((x) => x.attemptCount > 0).length), total: String(rows.length) })}
          </Chip>
        </header>
        {shown.status === 'loading' && <p className="ih-muted">{t('ieltsReading.loading')}</p>}
        {shown.status === 'guest' && <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.guestTitle')} text={t('ieltsReading.guestText')} />}
        {shown.status === 'error' && <EmptyState icon={<MenuBookIcon size={28} />} title={t('ieltsReading.errorTitle')} text={t('ieltsReading.errorText')} />}
        {shown.status === 'ready' && rows.length === 0 && <p className="ih-muted">{t('ieltsReading.emptyList')}</p>}
        {shown.status === 'ready' && rows.length > 0 && (
          <table className="ih-mtable">
            <thead>
              <tr>
                <th>{t('ieltsMocks.col.test')}</th>
                <th>{t('ieltsMocks.col.topics')}</th>
                <th>{t('ieltsMocks.col.last')}</th>
                <th>{t('ieltsMocks.col.best')}</th>
                <th aria-label={t('ieltsMocks.col.action')} />
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>
                    <button type="button" className="ih-mtable__name" onClick={() => onOpenTest(x.id)}>
                      {format === 'full' ? `Test ${testNumber(x.id) ?? ''}` : x.title}
                    </button>
                  </td>
                  <td className="ih-mtable__topics">{(x.textTitles || []).join(' · ') || x.title}</td>
                  <td>{resultLine(x.lastAttempt, t) || <span className="ih-muted">{t('ieltsReading.notYet')}</span>}</td>
                  <td>{x.bestAttempt ? t('ieltsReading.of', { n: String(x.bestAttempt.rawScore), total: String(x.bestAttempt.maxScore) }) : '—'}</td>
                  <td>
                    <PillButton variant={x.attemptCount ? 'soft' : 'primary'} onClick={() => onStart(x.id, 'exam')}>
                      {x.attemptCount ? t('ieltsMocks.again') : t('ieltsMocks.start')}
                    </PillButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <p className="ih-mocks__note">{t('ieltsMocks.bandNote')}</p>
    </div>
  )
}
