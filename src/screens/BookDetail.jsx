import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronLeftIcon } from '../components/icons.jsx'

// Демо-текст главы — показываем, пока у главы (track.text) нет собственного
// текста в админке. Реальный текст подхватится автоматически, когда его заведут.
const DEMO_TEXT = `Chapter One: The Cosmic Egg
Before There Was Anything

Imagine a question so simple a child might ask it, yet so profound that the greatest minds of history have struggled to answer: Where did everything come from? Not just the Earth, not just the Sun, not even just our galaxy — but everything. Every star you see at night, every atom in your body, every drop of water in every ocean across every world. Where did it all begin?

The answer, as far as modern science can tell us, lies in an event of unimaginable violence and beauty that scientists call the Big Bang.

Let us begin by clearing up a common misconception. The term "Big Bang" suggests an explosion — a bomb detonating in empty space, hurling debris outward into a pre-existing void. This picture, though intuitive, is profoundly wrong. The Big Bang was not an explosion in space. It was an expansion of space itself.

The Singularity

When scientists trace the expansion of the universe backward in time, like rewinding a film, everything grows closer and closer together. Galaxies converge. Matter compresses. Temperatures soar.

The Journey Ahead

In the chapters that follow, we will unfold this story step by step. But it all starts here, with that single, extraordinary truth: the universe had a beginning.`

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

export default function BookDetail({ book, onBack }) {
  const [mode, setMode] = useState('overview') // overview | read | audio
  const [ch, setCh] = useState(0)
  const [visited, setVisited] = useState(() => new Set())

  const tracks = useMemo(() => {
    const t = book.tracks?.length
      ? book.tracks
      : book.audioUrl
      ? [{ id: 'main', title: book.title, audioUrl: book.audioUrl, durationLabel: book.durationLabel }]
      : []
    return t
  }, [book])

  const total = tracks.length || 1
  const track = tracks[ch] || {}

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
                {tracks.map((t, i) => (
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
        tracks={tracks}
        ch={ch}
        onPick={(i) => openChapter(i, 'read')}
        onNext={() => ch < total - 1 && openChapter(ch + 1, 'read')}
        onBack={() => setMode('overview')}
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
function BookRead({ book, tracks, ch, onPick, onNext, onBack }) {
  const track = tracks[ch] || {}
  const text = track.text || DEMO_TEXT
  const vocab = track.vocab || {}
  const [pop, setPop] = useState(null) // {word, translation, x, y}

  const onWord = (e, raw) => {
    const w = cleanWord(raw)
    if (!w) return
    const r = e.target.getBoundingClientRect()
    setPop({
      word: w,
      translation: vocab[w.toLowerCase()] || '',
      x: r.left + r.width / 2,
      y: r.bottom,
    })
  }

  useEffect(() => {
    const close = () => setPop(null)
    window.addEventListener('scroll', close, true)
    return () => window.removeEventListener('scroll', close, true)
  }, [])

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
        <article className="bk-read__text" onClick={() => setPop(null)}>
          {text.split('\n').map((para, pi) =>
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
          )}
          {ch < tracks.length - 1 && (
            <button className="bk-btn bk-btn--primary bk-read__next" onClick={onNext}>
              Перейти к следующей главе
            </button>
          )}
        </article>

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

      {pop && (
        <div className="bk-pop" style={{ left: pop.x, top: pop.y + 8 }} onClick={(e) => e.stopPropagation()}>
          <div className="bk-pop__word">{pop.word}</div>
          <div className="bk-pop__tr">{pop.translation || '—'}</div>
          <button className="bk-pop__save" onClick={() => setPop(null)}>
            Сохранить в словарь
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
