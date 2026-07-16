import { useState, useEffect, useMemo } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  PlayIcon,
  EyeIcon,
  VolumeIcon,
  ChevronRightCircleIcon,
} from '../components/icons.jsx'
import {
  getPracticeToken,
  getVideoLessons,
  getMediaClips,
  getSituativki,
  getSavedWords,
  getAudiobooks,
} from '../api.js'
import { TALES } from '../data/practiceLibrary.js'

// URL hosted-библиотек. Книжки (109 МБ) хостятся на бэкенде (dev-admin S3,
// files-api) — в репозиторий такой файл не влезает; сказки (2.9 МБ) лежат в public.
const BOOKS_URL =
  'https://files-api.iqra.space/development/development/practice/books.html'
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

function Rail({ children }) {
  return <div className="pp-rail">{children}</div>
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
  const [videos, setVideos] = useState([])
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
          pull((k) => getVideoLessons(k), setVideos),
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

  const chips = ['Видеоклипы', 'Ситуации', 'Сказки', 'Мемы и рилсы', 'Книжки']
  const [chip, setChip] = useState('Видеоклипы')

  const jump = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="pp pp--enter">
        {/* ───── Центр: ленты контента ───── */}
        <div className="pp__center">
          <h1 className="pp__title">Практика</h1>

          <div className="pp-chips">
            {chips.map((c) => (
              <button
                key={c}
                className={`pp-chip ${chip === c ? 'pp-chip--on' : ''}`}
                onClick={() => {
                  setChip(c)
                  jump('sec-' + c)
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {state.error && <div className="pp-note pp-note--err">{state.error}</div>}

          {/* Видеоклипы */}
          <section id="sec-Видеоклипы" className="pp-sec">
            <SectionHead title="Видеоклипы" onAll={() => jump('sec-Видеоклипы')} />
            {videos.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
                {videos.map((v) => (
                  <a
                    key={v.id}
                    className="pp-vcard"
                    href={v.videoUrl || (v.youtubeKey ? `https://youtu.be/${v.youtubeKey}` : '#')}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Thumb src={v.thumbnailUrl} alt={v.title} className="pp-thumb--16x9">
                      <span className="pp-play"><PlayIcon size={22} /></span>
                    </Thumb>
                    <div className="pp-vcard__title">{v.title}</div>
                    <div className="pp-vcard__meta">
                      <span className="pp-views"><EyeIcon size={14} /> {formatViews(v.views)}</span>
                      <Dots level={v.level} />
                    </div>
                  </a>
                ))}
              </Rail>
            )}
          </section>

          {/* Мемы и рилсы */}
          <section id="sec-Мемы и рилсы" className="pp-sec">
            <SectionHead title="Мемы и рилсы" onAll={() => jump('sec-Мемы и рилсы')} />
            {clips.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
                {clips.map((c) => (
                  <a
                    key={c.id}
                    className="pp-mcard"
                    href={c.mediaUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Thumb src={c.thumbnailUrl} alt={c.title} className="pp-thumb--portrait" />
                    <span className="pp-mcard__views"><EyeIcon size={13} /> {formatViews(c.views)}</span>
                  </a>
                ))}
              </Rail>
            )}
          </section>

          {/* Книжки — каталог аудиокниг из dev-admin (реальные обложки) */}
          <section id="sec-Книжки" className="pp-sec">
            <SectionHead title="Книжки" onAll={() => openHosted(BOOKS_URL)} />
            {books.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
                {books.map((b) => (
                  <a
                    key={b.id}
                    className="pp-bcard"
                    href={BOOKS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookCover book={b} />
                    <div className="pp-bcard__title">{b.title}</div>
                    <div className="pp-bcard__meta">
                      <Dots level={b.level} />
                      {b.level && <span className="pp-bcard__cefr">{b.level}</span>}
                    </div>
                    {b.author && <div className="pp-bcard__author">{b.author}</div>}
                  </a>
                ))}
              </Rail>
            )}
          </section>

          {/* Сказки — реестр из fairytales.html (title/desc/len/chars + coverGrad) */}
          <section id="sec-Сказки" className="pp-sec">
            <SectionHead title="Сказки" onAll={() => openHosted(TALES_URL)} />
            <Rail>
              {TALES.map((tl) => (
                <a
                  key={tl.id}
                  className="pp-tcard"
                  href={TALES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
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

          {/* Ситуации */}
          <section id="sec-Ситуации" className="pp-sec">
            <SectionHead title="Ситуации" onAll={() => jump('sec-Ситуации')} />
            {situations.length === 0 ? (
              <Empty loading={state.loading} />
            ) : (
              <Rail>
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
            )}
          </section>
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

// Обложка сказки: настоящий арт из библиотеки (снят Playwright'ом в
// public/practice/covers/tales/<id>.png); при отсутствии — градиент + мотив.
function TaleCover({ tale }) {
  const [ok, setOk] = useState(true)
  if (ok) {
    return (
      <span className="pp-tcard__cover pp-tcard__cover--img">
        <img
          src={`/practice/covers/tales/${tale.id}.png`}
          alt={tale.title}
          loading="lazy"
          onError={() => setOk(false)}
        />
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
