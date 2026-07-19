import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { saveWord } from '../api.js'
import { useI18n } from '../i18n.jsx'

// ── Контент книг ────────────────────────────────────────────────────────────
// Полные тексты глав и словари переводов извлечены из hosted-библиотеки
// «Книжек» (scripts/extract-books.js → public/practice/books/). Каталог там
// свой, без общих id с бэкендом, поэтому связываем по нормализованному
// названию. Книга не из библиотеки читается как раньше (track.text/демо).
let _bookIndexPromise = null
const _bookContentCache = {}

export function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function loadBookContent(title) {
  if (!_bookIndexPromise) {
    _bookIndexPromise = fetch('/practice/books/index.json').then((r) => (r.ok ? r.json() : []))
  }
  const index = await _bookIndexPromise.catch(() => [])
  const want = normTitle(title)
  if (!want) return null
  const hit =
    index.find((b) => normTitle(b.title) === want) ||
    // «Alice in Wonderland» ↔ «Alice's Adventures in Wonderland» и т.п.
    index.find((b) => normTitle(b.title).includes(want) || want.includes(normTitle(b.title)))
  if (!hit) return null
  if (!_bookContentCache[hit.id]) {
    _bookContentCache[hit.id] = fetch(`/practice/books/${hit.id}.json`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return _bookContentCache[hit.id]
}

// ── Перевод слова ───────────────────────────────────────────────────────────
// Как в мобильной читалке: сначала словарь книги, иначе gtx (dt=t — основной
// перевод, dt=bd — словарные альтернативы). tl — язык перевода, следует за
// языком интерфейса ('kk' → казахский, иначе русский). Кэш в localStorage
// (ключи «tl:слово»), чтобы повторные тапы не ходили в сеть; v2 — смена
// формата ключей после добавления казахского.
const TR_CACHE_KEY = 'jts_word_tr_v2'
let _trCache = null
function trCache() {
  if (_trCache) return _trCache
  try {
    _trCache = JSON.parse(window.localStorage.getItem(TR_CACHE_KEY)) || {}
  } catch {
    _trCache = {}
  }
  return _trCache
}

async function translateWord(word, tl = 'ru') {
  const key = `${tl}:${word.toLowerCase()}`
  const cache = trCache()
  if (cache[key]) return cache[key]
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&dt=bd&q=` +
    encodeURIComponent(word)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`translate ${res.status}`)
  const data = await res.json()
  const primary = String(data?.[0]?.[0]?.[0] || '').trim()
  const alternates = []
  if (Array.isArray(data?.[1])) {
    for (const pos of data[1]) {
      for (const m of pos?.[1] || []) {
        const s = String(m).trim()
        if (s && s.toLowerCase() !== primary.toLowerCase() && !alternates.includes(s)) {
          alternates.push(s)
        }
      }
    }
  }
  const out = { tr: primary, alternates: alternates.slice(0, 4) }
  if (primary) {
    cache[key] = out
    try {
      window.localStorage.setItem(TR_CACHE_KEY, JSON.stringify(cache))
    } catch {
      /* квота localStorage — работаем без кэша */
    }
  }
  return out
}

// Абзацы: тексты из библиотеки — одна строка без переводов строк, поэтому
// группируем по 2–3 предложения (как это делает сама hosted-библиотека);
// тексты с \n (track.text из админки, демо) режем по строкам, как раньше.
function toParas(text) {
  if (text.includes('\n')) return text.split('\n')
  const sents = text.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*["”']*\s*/g) || [text]
  const out = []
  let buf = []
  for (const raw of sents) {
    const s = raw.trim()
    if (!s) continue
    if (/^["“]/.test(s) && buf.length) {
      out.push(buf.join(' '))
      buf = []
    }
    buf.push(s)
    if (buf.length >= 3 || (/["”]\s*$/.test(s) && buf.length >= 2)) {
      out.push(buf.join(' '))
      buf = []
    }
  }
  if (buf.length) out.push(buf.join(' '))
  return out
}

// Разбивает текст на слова, чтобы навесить тап-перевод. Знаки препинания
// остаются частью «токена», но для поиска перевода чистим их.
function cleanWord(w) {
  return w.replace(/[^A-Za-zА-Яа-яЁё'-]/g, '')
}

function fmtTime(sec) {
  if (!sec && sec !== 0) return '0:00'
  const s = Math.floor(sec % 60)
  const m = Math.floor(sec / 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function BookDetail({ book, token, onBack, onWordSaved }) {
  const [mode, setMode] = useState('overview') // overview | read | audio
  const [ch, setCh] = useState(0)
  const [visited, setVisited] = useState(() => new Set())
  const [content, setContent] = useState(null)

  useEffect(() => {
    let alive = true
    loadBookContent(book.title).then((c) => alive && setContent(c))
    return () => {
      alive = false
    }
  }, [book])

  const tracks = useMemo(() => {
    const t = book.tracks?.length
      ? book.tracks
      : book.audioUrl
      ? [{ id: 'main', title: book.title, audioUrl: book.audioUrl, durationLabel: book.durationLabel }]
      : []
    return t
  }, [book])

  // Главы для чтения: полный текст из библиотеки. Длительности аудио-треков
  // привязываем только при совпадении числа глав — иначе они врут.
  const chapters = useMemo(() => {
    if (content?.chapters?.length) {
      const sameCount = tracks.length === content.chapters.length
      return content.chapters.map((c, i) => ({
        id: `ch-${c.num}`,
        title: c.title,
        text: c.text,
        durationLabel: sameCount ? tracks[i]?.durationLabel : '',
      }))
    }
    return tracks
  }, [content, tracks])

  const total = chapters.length || 1

  const openChapter = (i, m = 'read') => {
    setCh(i)
    setVisited((s) => new Set(s).add(i))
    setMode(m)
  }

  // ── Обзор книги ─────────────────────────────────────────────────────────
  if (mode === 'overview') {
    return (
      <div className="bk">
        <div className="vd__head">
          <button className="vd__back" onClick={onBack}>
            <ChevronLeftIcon size={18} /> Назад
          </button>
          <div className="vd__headtitle">
            <b>{book.title}</b>
            <span>Книжки</span>
          </div>
        </div>

        <div className="bk-ov">
          <div className="bk-ov__left">
            {book.coverImageUrl ? (
              <img className="bk-ov__cover" src={book.coverImageUrl} alt={book.title} />
            ) : (
              <div className="bk-ov__cover bk-ov__cover--ph">{book.title}</div>
            )}
            <div className="bk-ov__actions">
              <button className="bk-btn bk-btn--primary" onClick={() => openChapter(0, 'read')}>
                Начать чтение
              </button>
              {tracks.some((t) => t.audioUrl) && (
                <button className="bk-btn bk-btn--ghost" onClick={() => openChapter(0, 'audio')}>
                  🎧 Аудио
                </button>
              )}
            </div>
          </div>

          <div className="bk-ov__body">
            <h1 className="bk-ov__title">{book.title}</h1>
            {book.author && <div className="bk-ov__author">{book.author}</div>}
            {book.description && (
              <>
                <div className="bk-ov__label">Описание</div>
                <p className="bk-ov__desc">{book.description}</p>
              </>
            )}

            <div className="bk-ov__progress">
              <div className="bk-ov__progress-top">
                Прогресс книги <b>{visited.size}/{total} глав</b>
              </div>
              <div className="bk-prog">
                <div className="bk-prog__fill" style={{ width: `${(visited.size / total) * 100}%` }} />
              </div>
            </div>

            <div className="bk-ov__contents">
              <div className="bk-ov__contents-head">
                <span className="bk-ov__label">Содержание</span>
                <span className="bk-ov__count">{total} глав</span>
              </div>
              <div className="bk-chapters">
                {chapters.map((t, i) => (
                  <button key={t.id || i} className="bk-chapter" onClick={() => openChapter(i, 'read')}>
                    <span className="bk-chapter__idx">{i + 1}</span>
                    <span className="bk-chapter__title">{t.title || `Глава ${i + 1}`}</span>
                    <span className="bk-chapter__dur">{t.durationLabel || ''}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Чтение главы ────────────────────────────────────────────────────────
  if (mode === 'read') {
    return (
      <BookRead
        book={book}
        chapters={chapters}
        dict={content?.dict || {}}
        token={token}
        ch={ch}
        onPick={(i) => openChapter(i, 'read')}
        onNext={() => ch < total - 1 && openChapter(ch + 1, 'read')}
        onBack={() => setMode('overview')}
        onWordSaved={onWordSaved}
        onAudio={
          tracks.some((t) => t.audioUrl)
            ? (i) => openChapter(Math.min(i, tracks.length - 1), 'audio')
            : null
        }
      />
    )
  }

  // ── Аудио ───────────────────────────────────────────────────────────────
  return (
    <BookAudio
      book={book}
      tracks={tracks}
      ch={ch}
      onPick={(i) => openChapter(i, 'audio')}
      onBack={() => setMode('overview')}
    />
  )
}

// ── Режим чтения ────────────────────────────────────────────────────────────
function BookRead({ book, chapters, dict, token, ch, onPick, onNext, onBack, onWordSaved, onAudio }) {
  // Язык перевода следует за языком интерфейса: казахский — en→kk, иначе en→ru.
  const { lang } = useI18n()
  const tl = lang === 'kk' ? 'kk' : 'ru'
  const chapter = chapters[ch] || {}
  // Главы без текста (книга не из библиотеки и текст не заведён в админке)
  // показываем честной заглушкой — раньше тут был общий демо-текст, из-за
  // которого переход между главами выглядел как «ничего не поменялось».
  const text = chapter.text || ''
  // {word, translation, alternates, loading, saving, saved, x, y}
  const [pop, setPop] = useState(null)
  // Отсекает ответы перевода/сохранения от уже закрытого или сменённого попапа.
  const seqRef = useRef(0)

  const onWord = (e, raw) => {
    const w = cleanWord(raw)
    if (!w) return
    const r = e.target.getBoundingClientRect()
    const seq = ++seqRef.current
    // Попап фиксированный: снизу от слова, а у нижнего края экрана — сверху,
    // чтобы кнопка сохранения не уезжала за вьюпорт. По X прижимаем к краям.
    const below = r.bottom + 180 < window.innerHeight
    const base = {
      word: w,
      alternates: [],
      loading: false,
      saving: false,
      saved: false,
      x: Math.min(Math.max(r.left + r.width / 2, 140), window.innerWidth - 140),
      y: below ? r.bottom : r.top,
      below,
    }
    // В словаре книги перевод берём на языке интерфейса; если для казахского
    // его там нет — не подменяем русским, а переводим сетью на казахский.
    const hit = dict[w.toLowerCase()]
    const hitTr = tl === 'kk' ? hit?.kz : hit?.ru
    if (hitTr) {
      setPop({ ...base, translation: hitTr })
      return
    }
    setPop({ ...base, translation: '', loading: true })
    translateWord(w, tl)
      .then(
        (t) =>
          seqRef.current === seq &&
          setPop((p) => p && { ...p, translation: t.tr, alternates: t.alternates, loading: false }),
      )
      .catch(() => seqRef.current === seq && setPop((p) => p && { ...p, loading: false }))
  }

  const onSave = async () => {
    if (!pop?.translation || pop.saving || pop.saved) return
    const seq = seqRef.current
    setPop((p) => p && { ...p, saving: true })
    try {
      const saved = await saveWord(token, {
        word: pop.word,
        translation: pop.translation,
        alternates: pop.alternates.length ? pop.alternates.join(', ') : undefined,
        language: tl,
        source: book.title,
      })
      if (seqRef.current === seq) setPop((p) => p && { ...p, saving: false, saved: true })
      onWordSaved?.(saved)
    } catch {
      if (seqRef.current === seq) setPop((p) => p && { ...p, saving: false })
    }
  }

  useEffect(() => {
    const close = () => setPop(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [])

  // Новая глава: закрываем попап и мотаем наверх — без этого читатель
  // оставался на прежней позиции скролла и смены главы не было видно.
  useEffect(() => {
    setPop(null)
    window.scrollTo(0, 0)
  }, [ch])

  return (
    <div className="bk">
      <div className="vd__head">
        <button className="vd__back" onClick={onBack}>
          <ChevronLeftIcon size={18} /> {chapter.title || `Глава ${ch + 1}`}
        </button>
        <div className="vd__headtitle">
          <span>{book.title}</span>
        </div>
      </div>

      <div className="bk-read">
        {/* key={ch} ремоунтит статью при смене главы — CSS-анимация входа
            проигрывается заново (и отключена при prefers-reduced-motion). */}
        <article key={ch} className="bk-read__text" onClick={() => setPop(null)}>
          {text ? (
            toParas(text).map((para, pi) =>
              para.trim() === '' ? (
                <div key={pi} className="bk-read__gap" />
              ) : (
                <p key={pi}>
                  {para.split(/(\s+)/).map((tok, ti) =>
                    /\s+/.test(tok) || !cleanWord(tok) ? (
                      tok
                    ) : (
                      <span
                        key={ti}
                        className="bk-w"
                        onClick={(e) => {
                          e.stopPropagation()
                          onWord(e, tok)
                        }}
                      >
                        {tok}
                      </span>
                    ),
                  )}
                </p>
              ),
            )
          ) : (
            <div className="bk-read__notext">
              <div className="bk-read__notext-num">Глава {ch + 1}</div>
              <b>{chapter.title || `Глава ${ch + 1}`}</b>
              <p>
                Текст этой главы ещё не добавлен.
                {onAudio ? ' Её можно послушать в аудио-формате.' : ''}
              </p>
              {onAudio && (
                <button className="bk-btn bk-btn--primary" onClick={() => onAudio(ch)}>
                  🎧 Слушать главу
                </button>
              )}
            </div>
          )}
          {ch < chapters.length - 1 && (
            <button className="bk-btn bk-btn--primary bk-read__next" onClick={onNext}>
              Перейти к следующей главе
            </button>
          )}
        </article>

        <aside className="bk-read__side">
          <h2 className="bk-read__sidetitle">Главы книги</h2>
          <div className="bk-chapters">
            {chapters.map((t, i) => (
              <button
                key={t.id || i}
                className={`bk-chapter ${i === ch ? 'bk-chapter--on' : ''}`}
                onClick={() => onPick(i)}
              >
                <span className="bk-chapter__idx">{i + 1}</span>
                <span className="bk-chapter__title">{t.title || `Глава ${i + 1}`}</span>
                <span className="bk-chapter__dur">{t.durationLabel || ''}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {pop && (
        <div
          className={`bk-pop ${pop.below ? '' : 'bk-pop--above'}`}
          style={{ left: pop.x, top: pop.y + (pop.below ? 8 : -8) }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bk-pop__word">{pop.word}</div>
          <div className="bk-pop__tr">{pop.loading ? 'Переводим…' : pop.translation || 'Перевод не найден'}</div>
          {pop.alternates.length > 0 && <div className="bk-pop__alts">{pop.alternates.join(', ')}</div>}
          <button
            className={`bk-pop__save ${pop.saved ? 'bk-pop__save--on' : ''}`}
            onClick={onSave}
            disabled={!pop.translation || pop.loading || pop.saving || pop.saved}
          >
            {pop.saved ? '✓ В словаре' : pop.saving ? 'Сохраняем…' : 'Сохранить в словарь'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Аудио-плеер ─────────────────────────────────────────────────────────────
function BookAudio({ book, tracks, ch, onPick, onBack }) {
  const track = tracks[ch] || {}
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  useEffect(() => {
    setCur(0)
    setPlaying(false)
  }, [ch])

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (a.paused) {
      a.play()
      setPlaying(true)
    } else {
      a.pause()
      setPlaying(false)
    }
  }
  const seek = (d) => {
    const a = audioRef.current
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + d))
  }

  return (
    <div className="bk">
      <div className="vd__head">
        <button className="vd__back" onClick={onBack}>
          <ChevronLeftIcon size={18} /> {track.title || `Глава ${ch + 1}`}
        </button>
        <div className="vd__headtitle">
          <span>{book.title}</span>
        </div>
      </div>

      <div className="bk-read">
        <div className="bk-audio">
          {book.coverImageUrl ? (
            <img className="bk-audio__cover" src={book.coverImageUrl} alt={book.title} />
          ) : (
            <div className="bk-audio__cover bk-ov__cover--ph">{book.title}</div>
          )}
          <div className="bk-audio__title">{track.title || book.title}</div>
          <div className="bk-audio__sub">{book.title}</div>

          <audio
            ref={audioRef}
            src={track.audioUrl}
            onTimeUpdate={(e) => setCur(e.target.currentTime)}
            onLoadedMetadata={(e) => setDur(e.target.duration)}
            onEnded={() => (ch < tracks.length - 1 ? onPick(ch + 1) : setPlaying(false))}
          />

          <div className="bk-audio__bar">
            <div className="bk-audio__fill" style={{ width: dur ? `${(cur / dur) * 100}%` : '0%' }} />
          </div>
          <div className="bk-audio__time">
            <span>{fmtTime(cur)}</span>
            <span>{track.durationLabel || fmtTime(dur)}</span>
          </div>

          <div className="bk-audio__ctrls">
            <button className="bk-audio__skip" onClick={() => seek(-15)} aria-label="Назад 15с">⟲ 15</button>
            <button className="bk-audio__play" onClick={toggle} aria-label="Играть/пауза">
              {playing ? '❚❚' : '▶'}
            </button>
            <button className="bk-audio__skip" onClick={() => seek(15)} aria-label="Вперёд 15с">15 ⟳</button>
          </div>
        </div>

        <aside className="bk-read__side">
          <h2 className="bk-read__sidetitle">Главы книги</h2>
          <div className="bk-chapters">
            {tracks.map((t, i) => (
              <button
                key={t.id || i}
                className={`bk-chapter ${i === ch ? 'bk-chapter--on' : ''}`}
                onClick={() => onPick(i)}
              >
                <span className="bk-chapter__idx">{i + 1}</span>
                <span className="bk-chapter__title">{t.title || `Глава ${i + 1}`}</span>
                <span className="bk-chapter__dur">{t.durationLabel || ''}</span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}
