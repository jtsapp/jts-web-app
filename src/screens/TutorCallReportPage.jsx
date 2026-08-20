import { useCallback, useEffect, useMemo, useState } from 'react'

import TutorShell from '../tutor/TutorShell.jsx'
import TutorThumb from '../tutor/TutorThumb.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { callStats, formatDuration } from '../lib/callSummary/stats.js'
import { authHeaders, getDeviceId } from '../lib/identity.js'
import { saveWord } from '../api.js'

// Отчёт после голосового разговора: цифры по речи ученика, о чём говорили,
// что удалось, над чем поработать и новые слова тьютора — с кнопкой «в словарь».
//
// Два пути входа:
//   1) сразу после звонка — звонка ещё нет в базе, его пишет агент в своём
//      shutdown-колбэке, поэтому экран поллит GET /api/profile/calls?limit=1;
//   2) из истории разговоров — строка уже на руках, приходит пропсом `call`,
//      поллинг не нужен вообще.

const POLL_MS = 1500
// ~21 секунда. Столько ждём и появления строки, и фоновой выжимки.
const MAX_TRIES = 14
// После стольких попыток перестаём ждать выжимку, которая даже не началась
// (summary_status так и остался null — суммаризатор не дошёл до 'pending').
const GIVE_UP_ON_NULL_AFTER = 6
const SETTLED = new Set(['done', 'failed', 'skipped'])

// Ловушка кодов: зона тьютора живёт на ru|kz|en, а бэкенд словаря принимает коды
// приложения ru|kk. Ту же пару путает resolveLangName в shadowing/tipPrompt.js —
// здесь маппим явно.
function backendLang(lang) {
  return lang === 'kz' ? 'kk' : lang === 'en' ? 'en' : 'ru'
}

function Section({ title, children }) {
  return (
    <section className="t-report__card">
      <h2 className="t-report__cardtitle">{title}</h2>
      {children}
    </section>
  )
}

export default function TutorCallReportPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  tutor = {},
  token = null,
  // Готовый звонок (открыт из истории). null — экран сам дождётся записи агента.
  call = null,
  // id последнего звонка ДО этого разговора: по нему отличаем свежую запись от
  // предыдущей. Сравниваем именно id, а не created_at — это время базы, а часы
  // клиента могут разъезжаться.
  prevCallId = null,
  onTranscript,
  onDone,
  onLogin,
}) {
  const { lang, t } = useLang()
  // Готовый звонок из истории и звонок, дождавшийся поллинга, держим порознь:
  // так эффекту не нужно ничего синхронно класть в состояние на первом же
  // рендере (каскадные ререндеры), а `row` остаётся производным значением.
  const [polled, setPolled] = useState(null)
  const [pollState, setPollState] = useState('waiting')
  const [saved, setSaved] = useState({})
  const row = call || polled
  const status = call ? 'ready' : pollState

  useEffect(() => {
    if (call) return undefined
    let alive = true
    let timer = null
    let tries = 0
    let found = false

    const poll = async () => {
      tries += 1
      try {
        const res = await fetch(
          '/api/profile/calls?limit=1&deviceId=' + encodeURIComponent(getDeviceId()),
          { headers: authHeaders(token) },
        )
        const data = await res.json().catch(() => ({}))
        const next = Array.isArray(data.calls) ? data.calls[0] : null
        if (next && next.id !== prevCallId) {
          found = true
          if (!alive) return
          setPolled(next)
          const settled =
            SETTLED.has(next.summaryStatus) ||
            (!next.summaryStatus && tries >= GIVE_UP_ON_NULL_AFTER)
          if (settled) {
            setPollState('ready')
            return
          }
        }
      } catch {
        /* сеть моргнула — просто следующая попытка */
      }
      if (!alive) return
      if (tries >= MAX_TRIES) {
        setPollState(found ? 'ready' : 'empty')
        return
      }
      timer = setTimeout(poll, POLL_MS)
    }

    poll()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [call, prevCallId, token])

  const stats = useMemo(() => callStats(row?.transcript), [row])
  const topics = Array.isArray(row?.topics) ? row.topics : []
  const wins = Array.isArray(row?.wins) ? row.wins : []
  const mistakes = Array.isArray(row?.mistakes) ? row.mistakes : []
  // useMemo, а не тернарник: `words` уходит в зависимости addAll, и новый массив
  // на каждом рендере пересобирал бы колбэк.
  const words = useMemo(() => (Array.isArray(row?.newWords) ? row.newWords : []), [row])

  const addWord = useCallback(
    async (word) => {
      if (!token || !word?.term) return
      const state = saved[word.term]
      if (state === 'ok' || state === 'busy') return
      setSaved((prev) => ({ ...prev, [word.term]: 'busy' }))
      try {
        await saveWord(token, {
          word: word.term,
          translation: word.translation || '',
          language: backendLang(lang),
          source: 'tutor',
        })
        setSaved((prev) => ({ ...prev, [word.term]: 'ok' }))
      } catch {
        setSaved((prev) => ({ ...prev, [word.term]: 'err' }))
      }
    },
    [token, lang, saved],
  )

  // Последовательно, а не Promise.all: бэкенд словаря — чужой, заваливать его
  // восемью параллельными POST'ами ради одной кнопки незачем.
  const addAll = useCallback(async () => {
    for (const word of words) await addWord(word)
  }, [words, addWord])

  const waiting = status === 'waiting'

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={t('report.title')}
      layout="flow"
    >
      <div className="t-report">
        <div className="t-report__head">
          <TutorThumb tutor={tutor} className="t-report__avatar" />
          <div className="t-report__headtext">
            <b>{t('report.title')}</b>
            <span>{t('report.by')}</span>
          </div>
        </div>

        {status === 'empty' ? (
          <p className="t-erran__empty">{t('report.empty')}</p>
        ) : (
          <>
            <div className="t-report__stats">
              <div className="t-stat">
                <b>{formatDuration(row?.durationSec)}</b>
                <span>{t('report.stat.duration')}</span>
              </div>
              <div className="t-stat">
                <b>{stats.words}</b>
                <span>{t('report.stat.words')}</span>
              </div>
              <div className="t-stat">
                <b>{stats.sentences}</b>
                <span>{t('report.stat.sentences')}</span>
              </div>
              <div className="t-stat">
                <b>{stats.uniqueWords}</b>
                <span>{t('report.stat.unique')}</span>
              </div>
            </div>

            <Section title={t('report.about')}>
              {waiting && !row?.recap ? (
                <p className="t-report__waiting" role="status" aria-live="polite">
                  {t('report.waiting')}
                </p>
              ) : (
                <>
                  {row?.recap ? <p className="t-report__text">{row.recap}</p> : null}
                  {!row?.recap && !waiting ? (
                    <p className="t-report__note">{t('report.partial')}</p>
                  ) : null}
                  {topics.length > 0 ? (
                    <div className="t-report__topics">
                      {topics.map((topic) => (
                        <span className="t-chip t-report__topic" key={topic}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
              {row ? (
                <button
                  className="t-report__link"
                  type="button"
                  onClick={() => onTranscript?.(row)}
                >
                  {t('report.transcript')}
                </button>
              ) : null}
            </Section>

            {wins.length > 0 ? (
              <Section title={t('report.wins')}>
                <ul className="t-report__list">
                  {wins.map((win) => (
                    <li className="t-report__item" key={`${win.title}-${win.quote}`}>
                      <b>{win.title}</b>
                      <i>«{win.quote}»</i>
                    </li>
                  ))}
                </ul>
              </Section>
            ) : null}

            {mistakes.length > 0 ? (
              <Section title={t('report.grow')}>
                <ul className="t-report__list">
                  {mistakes.map((item) => (
                    <li className="t-report__item" key={`${item.title}-${item.quote}`}>
                      <b>{item.title}</b>
                      <i>«{item.quote}»</i>
                      <span className="t-report__fix">
                        {t('report.fix')}: {item.fix}
                      </span>
                    </li>
                  ))}
                </ul>
                {/* Цитаты приходят из распознавания речи — предупреждаем честно,
                    чтобы слип STT не читался как «тьютор придумал мне ошибку». */}
                <p className="t-report__note">{t('report.growNote')}</p>
              </Section>
            ) : null}

            {!waiting || words.length > 0 ? (
              <Section title={t('report.words')}>
                {words.length === 0 ? (
                  <p className="t-report__note">{t('report.wordsEmpty')}</p>
                ) : (
                  <>
                    <ul className="t-report__words">
                      {words.map((word) => {
                        const state = saved[word.term]
                        return (
                          <li className="t-report__word" key={word.term}>
                            <div className="t-report__wordtext">
                              <b>{word.term}</b>
                              <span>{word.translation}</span>
                              {word.example ? <i>«{word.example}»</i> : null}
                            </div>
                            <button
                              className={`t-report__add${state === 'ok' ? ' is-done' : ''}`}
                              type="button"
                              disabled={!token || state === 'ok' || state === 'busy'}
                              onClick={() => addWord(word)}
                            >
                              {state === 'ok'
                                ? t('report.added')
                                : state === 'err'
                                  ? t('report.addFail')
                                  : t('report.add')}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    {token ? (
                      <button className="t-report__link" type="button" onClick={addAll}>
                        {t('report.addAll')}
                      </button>
                    ) : (
                      // Ручка словаря — Bearer-only, анонимного пути у неё нет.
                      // Список всё равно показываем: слова полезны и без сохранения.
                      <p className="t-report__note">
                        {t('report.loginToSave')}{' '}
                        <button className="t-report__link" type="button" onClick={onLogin}>
                          {t('report.login')}
                        </button>
                      </p>
                    )}
                  </>
                )}
              </Section>
            ) : null}

            {row?.focus ? (
              <Section title={t('report.focus')}>
                <p className="t-report__text">{row.focus}</p>
              </Section>
            ) : null}
          </>
        )}

        <div className="t-btnstack t-report__btns">
          <button className="t-pill t-pill--primary" type="button" onClick={onDone}>
            {status === 'empty' ? t('report.toDash') : t('report.done')}
          </button>
        </div>
      </div>
    </TutorShell>
  )
}
