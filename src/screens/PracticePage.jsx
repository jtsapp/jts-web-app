import { useState, useEffect, useMemo, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  PlayIcon,
  EyeIcon,
  VolumeIcon,
  ChevronRightCircleIcon,
  ChevronLeftIcon,
} from '../components/icons.jsx'
import {
  getPracticeToken,
  getMediaClips,
  getSituativki,
  getSavedWords,
  getAudiobooks,
} from '../api.js'
import { TALES } from '../data/practiceLibrary.js'
import { SITUATION_LEVELS } from '../practice/situations/levels.js'
import BookDetail from './BookDetail.jsx'

// URL hosted-библиотек. Книжки (109 МБ) хостятся на бэкенде (dev-admin S3,
// files-api) — в репозиторий такой файл не влезает; сказки (2.9 МБ) лежат в public.
const BOOKS_URL =
  'https://files-api.iqra.space/development/development/practice/books.html'
// Фолбэк для сказок (открытие в новой вкладке по ctrl/cmd-клику); обычный клик
// открывает мир нативно внутри приложения (src/practice/fairytale/).
const TALES_URL = '/practice/fairytales.html'

// Просмотры: 1331 → «1 331», 12000 → «12 тыс», 3400000 → «3.4 млн»
function formatViews(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)} млн`
  if (v >= 10_000) return `${Math.round(v / 1000)} тыс`
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// CEFR-уровень → сложность (кол-во точек + подпись)
function difficulty(level) {
  const l = String(level || '').toUpperCase()
  if (l.startsWith('C')) return { dots: 3, label: 'Тяжело' }
  if (l.startsWith('B')) return { dots: 2, label: 'Средне' }
  return { dots: 1, label: 'Легко' }
}

function Dots({ level }) {
  const { dots, label } = difficulty(level)
  return (
    <span className="pp-dots">
      <span className="pp-dots__row">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < dots ? 'on' : ''} />
        ))}
      </span>
      {label}
    </span>
  )
}

// Плитка-обёртка с фолбэком, если картинки нет
function Thumb({ src, alt, className, children }) {
  const [ok, setOk] = useState(true)
  return (
    <div className={`pp-thumb ${className || ''}`}>
      {ok && src ? (
        <img src={src} alt={alt || ''} loading="lazy" onError={() => setOk(false)} />
      ) : (
        <div className="pp-thumb__ph" />
      )}
      {children}
    </div>
  )
}

function SectionHead({ title, onAll }) {
  return (
    <div className="pp-sec__head">
      <h2>{title}</h2>
      <button className="pp-all" onClick={onAll}>
        Посмотреть все <ChevronRightCircleIcon size={18} />
      </button>
    </div>
  )
}

// Лента контента. grid=true (когда включён фильтр по типу) раскладывает
// карточки сеткой вместо горизонтальной прокрутки.
function Rail({ children, grid }) {
  return <div className={grid ? 'pp-rail pp-rail--grid' : 'pp-rail'}>{children}</div>
}

// Проговаривание слова браузером (бэкенд не отдаёт аудио для словаря)
function speak(word) {
  try {
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  } catch {
    /* нет поддержки — молча пропускаем */
  }
}

export default function PracticePage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { t } = useI18n()
  const [state, setState] = useState({ loading: true, error: '' })
  const [clips, setClips] = useState([])
  const [situations, setSituations] = useState([])
  const [books, setBooks] = useState([])
  const [words, setWords] = useState([])
  const [tab, setTab] = useState('saved') // 'saved' | 'learned'

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: '' })
    getPracticeToken(token)
      .then((tok) => {
        // Тянем всё параллельно; отдельные сбои не роняют страницу целиком.
        const pull = (fn, set) =>
          fn(tok)
            .then((d) => alive && set(Array.isArray(d) ? d : d?.content || d?.items || []))
            .catch(() => {})
        return Promise.all([
          pull((k) => getMediaClips(k), setClips),
          pull((k) => getSituativki(k, userLevel), setSituations),
          pull((k) => getAudiobooks(k), setBooks),
          pull((k) => getSavedWords(k), setWords),
        ])
      })
      .then(() => alive && setState({ loading: false, error: '' }))
      .catch((e) =>
        alive && setState({ loading: false, error: e?.message || 'Не удалось загрузить контент' })
      )
    return () => {
      alive = false
    }
  }, [token, userLevel])

  const saved = words
  const learned = useMemo(() => words.filter((w) => w.learned), [words])
  const list = tab === 'learned' ? learned : saved

  // «Видеоклипы» убраны из клиентской части: контент остаётся в dev-admin
  // (/mobile/video-lessons живёт), но страница его не запрашивает и не рисует.
  const chips = ['Все', 'Ситуации', 'Сказки', 'Мемы и рилсы', 'Книжки']
  // Активный фильтр: null = показываем все секции (лентами). Иначе — только
  // выбранный тип, сеткой. Меняется и чипами сверху, и «Посмотреть все».
  const [filter, setFilter] = useState(null)
  const show = (type) => filter === null || filter === type
  const grid = filter !== null

  // Открытый рилс (индекс в clips) — вертикальный плеер с прокруткой.
  const [openReel, setOpenReel] = useState(null)
  const [openBook, setOpenBook] = useState(null)

  // Мир сказок: движок Fairytale's World открывается полноэкранным оверлеем
  // поверх Практики (deep-link на конкретную сказку). Модуль ~3 МБ (base64-
  // музыка и арт), поэтому грузим его лениво при первом клике.
  const taleLoadingRef = useRef(false)
  const openTale = async (tale) => {
    if (taleLoadingRef.current) return
    taleLoadingRef.current = true
    try {
      const mod = await import('../practice/fairytale/taleWorld.js')
      mod.openTaleWorld(tale.id)
    } finally {
      taleLoadingRef.current = false
    }
  }

  // Разговорная практика (Speaking A1–C1): оверлей с уровневыми страницами
  // (src/practice/situations/), открывается на выбранном уровне.
  const openSituationsLevel = async (level) => {
    if (taleLoadingRef.current) return
    taleLoadingRef.current = true
    try {
      const mod = await import('../practice/situations/situationsOverlay.js')
      mod.openSituations(level)
    } finally {
      taleLoadingRef.current = false
    }
  }

  if (openReel !== null) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
        <ReelsViewer clips={clips} startIndex={openReel} onBack={() => setOpenReel(null)} />
      </LearningLayout>
    )
  }

  if (openBook) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
        <BookDetail book={openBook} onBack={() => setOpenBook(null)} />
      </LearningLayout>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="pp pp--enter">
        {/* ───── Центр: ленты контента ───── */}
        <div className="pp__center">
          <h1 className="pp__title">Практика</h1>

          <div className="pp-chips">
            {chips.map((c) => {
              const on = c === 'Все' ? filter === null : filter === c
              return (
                <button
                  key={c}
                  className={`pp-chip ${on ? 'pp-chip--on' : ''}`}
                  onClick={() => setFilter(c === 'Все' ? null : c)}
                >
                  {c}
                </button>
              )
            })}
          </div>

          {state.error && <div className="pp-note pp-note--err">{state.error}</div>}

          {/* Мемы и рилсы */}
          {show('Мемы и рилсы') && (
          <section id="sec-Мемы и рилсы" className="pp-sec">
            <SectionHead title="Мемы и рилсы" onAll={() => setFilter('Мемы и рилсы')} />
            {clips.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail grid={grid}>
                {clips.map((c, i) => (
                  <button key={c.id} type="button" className="pp-mcard" onClick={() => setOpenReel(i)}>
                    <Thumb src={c.thumbnailUrl} alt={c.title} className="pp-thumb--portrait" />
                    <span className="pp-mcard__views"><EyeIcon size={13} /> {formatViews(c.views)}</span>
                  </button>
                ))}
              </Rail>
            )}
          </section>
          )}

          {/* Книжки — каталог аудиокниг из dev-admin (реальные обложки) */}
          {show('Книжки') && (
          <section id="sec-Книжки" className="pp-sec">
            <SectionHead title="Книжки" onAll={() => setFilter('Книжки')} />
            {books.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail grid={grid}>
                {books.map((b) => (
                  <button key={b.id} type="button" className="pp-bcard" onClick={() => setOpenBook(b)}>
                    <BookCover book={b} />
                    <div className="pp-bcard__title">{b.title}</div>
                    <div className="pp-bcard__meta">
                      <Dots level={b.level} />
                      {b.level && <span className="pp-bcard__cefr">{b.level}</span>}
                    </div>
                    {b.author && <div className="pp-bcard__author">{b.author}</div>}
                  </button>
                ))}
              </Rail>
            )}
          </section>
          )}

          {/* Сказки — реестр из fairytales.html (title/desc/len/chars + coverGrad) */}
          {show('Сказки') && (
          <section id="sec-Сказки" className="pp-sec">
            <SectionHead title="Сказки" onAll={() => setFilter('Сказки')} />
            <Rail grid={grid}>
              {TALES.map((tl) => (
                <a
                  key={tl.id}
                  className="pp-tcard"
                  href={TALES_URL}
                  onClick={(e) => {
                    // модифицированные клики оставляем браузеру (новая вкладка)
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                    e.preventDefault()
                    openTale(tl)
                  }}
                >
                  <TaleCover tale={tl} />
                  <div className="pp-tcard__title">{tl.title}</div>
                  <p className="pp-tcard__desc">{tl.desc}</p>
                  <div className="pp-tcard__meta">
                    <span className="pp-chip-meta">
                      Длительность <b>{tl.len}</b>
                    </span>
                    <span className="pp-chip-meta">
                      Персонажей <b>{tl.chars}</b>
                    </span>
                  </div>
                </a>
              ))}
            </Rail>
          </section>
          )}

          {/* Ситуации: разговорная практика A1–C1 (нативный оверлей) + ситуативки из бэкенда */}
          {show('Ситуации') && (
          <section id="sec-Ситуации" className="pp-sec">
            <SectionHead title="Ситуации" onAll={() => setFilter('Ситуации')} />
            <Rail grid={grid}>
              {SITUATION_LEVELS.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className="pp-scard"
                  onClick={() => openSituationsLevel(l.code)}
                >
                  <Thumb src={l.poster} alt={`${l.label} Speaking`} className="pp-thumb--situation">
                    <span className="pp-play"><PlayIcon size={22} /></span>
                  </Thumb>
                  <div className="pp-scard__title">
                    Speaking · {l.label} {l.desc}
                  </div>
                </button>
              ))}
              {situations.map((s) => (
                <a
                  key={s.id}
                  className="pp-scard"
                  href={s.videoUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Thumb src={s.coverUrl} alt={s.title} className="pp-thumb--situation" />
                  <div className="pp-scard__title">{s.title}</div>
                </a>
              ))}
            </Rail>
          </section>
          )}
        </div>

        {/* ───── Правая колонка: Словарь ───── */}
        <aside className="pp__side">
          <h2 className="pp-voc__title">Словарь</h2>

          <div className="pp-voc__tabs">
            <button
              className={`pp-voc__tab ${tab === 'saved' ? 'on' : ''}`}
              onClick={() => setTab('saved')}
            >
              Сохранено <b>{saved.length}</b>
            </button>
            <button
              className={`pp-voc__tab ${tab === 'learned' ? 'on' : ''}`}
              onClick={() => setTab('learned')}
            >
              Изучено <b>{learned.length}</b>
            </button>
          </div>

          <div className="pp-voc__list">
            {list.length === 0 ? (
              <div className="pp-voc__empty">
                {state.loading ? 'Загрузка…' : 'Пока нет слов'}
              </div>
            ) : (
              list.map((w) => (
                <div key={w.id} className="pp-word">
                  <div className="pp-word__text">
                    <b>{w.word}</b>
                    <span>{w.translation}</span>
                  </div>
                  <button className="pp-word__say" onClick={() => speak(w.word)} aria-label="Прослушать">
                    <VolumeIcon size={18} />
                  </button>
                </div>
              ))
            )}
          </div>

          <button className="pp-voc__cta">Практика по словарю</button>
        </aside>
      </div>
    </LearningLayout>
  )
}

function Empty({ loading, text }) {
  return (
    <div className="pp-empty">
      {loading ? 'Загрузка…' : text || 'Нет данных'}
    </div>
  )
}

// Открыть hosted-библиотеку (книжки/сказки) в новой вкладке.
function openHosted(href) {
  window.open(href, '_blank', 'noopener')
}

// Детерминированный градиент из строки (фолбэк-обложка, когда нет coverImageUrl).
function gradFor(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
  const a = h % 360
  return `linear-gradient(150deg, hsl(${a} 45% 42%), hsl(${(a + 40) % 360} 55% 18%))`
}

// Вертикальный просмотр мемов/рилсов (как TikTok): плеер 9:16, переключение
// колёсиком мыши / стрелками / кнопками вверх-вниз.
function ReelsViewer({ clips, startIndex, onBack }) {
  const [i, setI] = useState(startIndex)
  const [hint, setHint] = useState(true)
  const [paused, setPaused] = useState(false)
  const lockRef = useRef(false)
  const videoRef = useRef(null)
  const clip = clips[i]

  const go = (dir) => {
    setI((cur) => {
      const next = Math.min(clips.length - 1, Math.max(0, cur + dir))
      if (next !== cur) setHint(false)
      return next
    })
  }

  // Колёсико: один «щелчок» = одно переключение (с блокировкой на время).
  const onWheel = (e) => {
    if (Math.abs(e.deltaY) < 8) return
    if (lockRef.current) return
    lockRef.current = true
    setTimeout(() => {
      lockRef.current = false
    }, 600)
    go(e.deltaY > 0 ? 1 : -1)
  }

  // Стрелки клавиатуры.
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowDown') go(1)
      else if (e.key === 'ArrowUp') go(-1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [clips.length])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      v.play()
      setPaused(false)
    } else {
      v.pause()
      setPaused(true)
    }
  }

  return (
    <div className="rl">
      <div className="vd__head">
        <button className="vd__back" onClick={onBack}>
          <ChevronLeftIcon size={18} /> Назад
        </button>
        <div className="vd__headtitle">
          <b>Мемы и рилсы</b>
        </div>
      </div>

      <div className="rl__stage" onWheel={onWheel}>
        <div className="rl__player">
          <video
            key={clip.id}
            ref={videoRef}
            className="rl__video"
            src={clip.mediaUrl}
            poster={clip.thumbnailUrl}
            autoPlay
            loop
            playsInline
            onClick={togglePlay}
          />
          {paused && (
            <button className="rl__playbtn" onClick={togglePlay} aria-label="Играть">
              <PlayIcon size={30} />
            </button>
          )}
          {hint && (
            <div className="rl__hint">
              <svg width="26" height="34" viewBox="0 0 26 34" fill="none">
                <rect x="1.5" y="1.5" width="23" height="31" rx="11.5" stroke="currentColor" strokeWidth="2" />
                <rect x="12" y="7" width="2" height="7" rx="1" fill="currentColor" />
              </svg>
              <span>Крутите колесиком вверх и вниз для переключения видео</span>
            </div>
          )}
        </div>

        <div className="rl__nav">
          <button className="rl__navbtn" disabled={i === 0} onClick={() => go(-1)} aria-label="Предыдущее">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="rl__navbtn" disabled={i === clips.length - 1} onClick={() => go(1)} aria-label="Следующее">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Обложка сказки: настоящий арт из библиотеки (снят Playwright'ом в
// public/practice/covers/tales/<id>.png); при отсутствии — градиент + мотив.
function TaleCover({ tale }) {
  const [ok, setOk] = useState(true)
  const src = tale.cover || `/practice/covers/tales/${tale.id}.png`
  if (ok) {
    return (
      <span className="pp-tcard__cover pp-tcard__cover--img">
        <img src={src} alt={tale.title} loading="lazy" onError={() => setOk(false)} />
      </span>
    )
  }
  return (
    <span
      className="pp-tcard__cover"
      style={{ background: `linear-gradient(140deg, ${tale.grad[0]}, ${tale.grad[1]})` }}
    >
      <span className="pp-tcard__motif" aria-hidden="true">{tale.motif}</span>
      <span className="pp-tcard__coverTitle">{tale.title}</span>
    </span>
  )
}

// Обложка книги: реальная картинка из dev-admin (coverImageUrl); при отсутствии
// или ошибке загрузки — цветной фолбэк с названием.
function BookCover({ book }) {
  const [ok, setOk] = useState(true)
  const src = book.coverImageUrl || book.coverUrl || ''
  if (src && ok) {
    return (
      <span className="pp-bcard__cover pp-bcard__cover--img">
        <img src={src} alt={book.title} loading="lazy" onError={() => setOk(false)} />
      </span>
    )
  }
  return (
    <span className="pp-bcard__cover" style={{ background: gradFor(book.title || String(book.id)) }}>
      <span className="pp-bcard__coverTitle">{book.title}</span>
    </span>
  )
}
