import { useState, useEffect, useMemo, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import {
  PlayIcon,
  EyeIcon,
  VolumeIcon,
  ChevronRightCircleIcon,
  ChevronLeftIcon,
  SearchIcon,
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
import BookDetail, { normTitle } from './BookDetail.jsx'
import GrammarCatalog, { GrammarRail } from './GrammarCatalog.jsx'
import GrammarLesson from './GrammarLesson.jsx'
import { loadGrammarIndex, levelToCourse, GRAMMAR_LEVELS } from '../practice/grammar/grammarData.js'

// Фолбэк для сказок (открытие в новой вкладке по ctrl/cmd-клику); обычный клик
// открывает мир нативно внутри приложения (src/practice/fairytale/).
// Книжки полностью нативные: каталог из dev-admin + тексты и словари из
// public/practice/books/ (см. scripts/extract-books.js).
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

function SectionHead({ title, onAll, children }) {
  return (
    <div className="pp-sec__head">
      <h2>{title}</h2>
      <div className="pp-sec__tools">
        {children}
        <button className="pp-all" onClick={onAll}>
          Посмотреть все <ChevronRightCircleIcon size={18} />
        </button>
      </div>
    </div>
  )
}

// Лента контента. grid=true (когда включён фильтр по типу) раскладывает
// карточки сеткой вместо горизонтальной прокрутки.
function Rail({ children, grid }) {
  return <div className={grid ? 'pp-rail pp-rail--grid' : 'pp-rail'}>{children}</div>
}

// Фигурная «печать» бейджа уровня (14 округлых фестонов), путь сгенерирован
// детерминированно. См. .pp-listen__seal-bg.
const SEAL_PATH =
  'M50.00 10.00 Q60.90 2.23 67.36 13.96 Q80.55 11.69 81.27 25.06 Q94.15 28.74 89.00 41.10 ' +
  'Q99.00 50.00 89.00 58.90 Q94.15 71.26 81.27 74.94 Q80.55 88.31 67.36 86.04 ' +
  'Q60.90 97.77 50.00 90.00 Q39.10 97.77 32.64 86.04 Q19.45 88.31 18.73 74.94 ' +
  'Q5.85 71.26 11.00 58.90 Q1.00 50.00 11.00 41.10 Q5.85 28.74 18.73 25.06 ' +
  'Q19.45 11.69 32.64 13.96 Q39.10 2.23 50.00 10.00Z'

// Баннер «Аудирование»: промо мини-игры listening. Бейдж уровня синхронизирован
// с уровнем пользователя (проп userLevel). Кнопки — заглушки; поведение
// «Посмотреть все» / «Перейти к тренировке» подключим позже.
function ListeningBanner({ userLevel = 'A1', onAll, onStart }) {
  const level = String(userLevel || 'A1').toUpperCase()
  const noop = () => {}
  return (
    <section id="sec-Аудирование" className="pp-sec pp-listen">
      <SectionHead title="Аудирование" onAll={onAll || noop} />
      <div className="pp-listen__card">
        <div className="pp-listen__body">
          <h3 className="pp-listen__title">
            Тренируй Listening
            <br />в мини-игре
          </h3>
          <p className="pp-listen__desc">
            Слушай и разбирай английскую речь: собери фразу, напиши диктант,
            различи похожие слова
          </p>
          <button type="button" className="pp-listen__cta" onClick={onStart || noop}>
            Перейти к тренировке
          </button>
        </div>
        <img
          className="pp-listen__art"
          src="/practice/listening-mascot.png"
          alt=""
          aria-hidden="true"
        />
        <div className="pp-listen__aside">
          <span className="pp-listen__hint">Собран по вашему уровню</span>
          <div className="pp-listen__seal">
            <svg className="pp-listen__seal-bg" viewBox="0 0 100 100" aria-hidden="true">
              <path d={SEAL_PATH} fill="#fff" />
            </svg>
            <span className="pp-listen__level">{level}</span>
          </div>
        </div>
      </div>
    </section>
  )
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

// У части книг каталога dev-admin нет coverImageUrl — карточка падала на
// градиент-заглушку. Обложки этих книг лежат в извлечённой библиотеке
// (extract-books.js → public/practice/covers/books/, пути в index.json);
// подставляем их по нормализованному названию до рендера каталога.
// Индекс — маленький статический JSON; промис мемоизируется на модуль, а сам
// запрос стартует вместе с каталогами (см. эффект загрузки), а не после ответа
// аудиокниг — раньше тут была последовательная «лестница» из двух запросов.
let _coversIndexPromise = null
function fetchCoversIndex() {
  if (!_coversIndexPromise) {
    _coversIndexPromise = fetch('/practice/books/index.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []) // нет индекса — карточки останутся с градиентами
  }
  return _coversIndexPromise
}

async function enrichCovers(list) {
  const books = Array.isArray(list) ? list : list?.content || list?.items || []
  if (!books.some((b) => !(b.coverImageUrl || b.coverUrl))) return books
  const idx = await fetchCoversIndex()
  const covers = {}
  for (const it of idx) if (it.cover) covers[normTitle(it.title)] = it.cover
  return books.map((b) =>
    b.coverImageUrl || b.coverUrl ? b : { ...b, coverImageUrl: covers[normTitle(b.title)] || '' },
  )
}

export default function PracticePage({ userLevel = 'A1', userName, token, onNav, onProfile }) {
  const { t } = useI18n()
  const [state, setState] = useState({ loading: true, error: '' })
  const [clips, setClips] = useState([])
  const [situations, setSituations] = useState([])
  const [books, setBooks] = useState([])
  const [words, setWords] = useState([])
  const [tab, setTab] = useState('saved') // 'saved' | 'learned'
  // Фактический Bearer для действий внутри Практики (у гостя — демо-токен).
  const [apiToken, setApiToken] = useState(token || '')

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: '' })
    fetchCoversIndex() // параллельно с токеном и каталогами, а не после аудиокниг
    getPracticeToken(token)
      .then((tok) => {
        if (alive) setApiToken(tok)
        // Тянем всё параллельно; отдельные сбои не роняют страницу целиком.
        // apply применяется дважды: к кэшу (мгновенный рендер) и к свежим
        // данным, когда фоновое обновление SWR-кэша доходит до сети.
        const pull = (start, set, transform) => {
          const apply = async (d) => {
            if (!alive || d == null) return
            const arr = Array.isArray(d) ? d : d?.content || d?.items || []
            set(transform ? await transform(arr) : arr)
          }
          return start(apply).then(apply).catch(() => {})
        }
        return Promise.all([
          pull((onFresh) => getMediaClips(tok, onFresh), setClips),
          pull((onFresh) => getSituativki(tok, userLevel, onFresh), setSituations),
          pull((onFresh) => getAudiobooks(tok, onFresh), setBooks, enrichCovers),
          pull((onFresh) => getSavedWords(tok, onFresh), setWords),
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

  // Тяжёлые оверлеи (мир сказок ~3 МБ, разговорные ситуации) подгружаем на
  // простое после первого рендера: первый клик открывает их мгновенно и
  // загрузка не конкурирует с каталогами выше.
  useEffect(() => {
    const load = () => {
      import('../practice/fairytale/taleWorld.js').catch(() => {})
      import('../practice/situations/situationsOverlay.js').catch(() => {})
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(load, 2500) // Safari: requestIdleCallback нет
    return () => clearTimeout(id)
  }, [])

  const saved = words
  const learned = useMemo(() => words.filter((w) => w.learned), [words])
  const list = tab === 'learned' ? learned : saved

  // Поиск по книжкам: живой фильтр по названию и автору. Каталог уже загружен
  // целиком, поэтому без запросов к бэкенду; normTitle не подходит — вырезает
  // кириллицу, а названия/запросы бывают русскими.
  const [bookQuery, setBookQuery] = useState('')
  const visibleBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase()
    if (!q) return books
    return books.filter((b) => `${b.title || ''} ${b.author || ''}`.toLowerCase().includes(q))
  }, [books, bookQuery])

  // Грамматика: нативный каталог уроков (данные — public/practice/grammar/,
  // см. scripts/extract-grammar.js). Лёгкий index грузим один раз при монтировании
  // — он нужен и рейлу в «Все», и полному каталогу.
  const [grammarIndex, setGrammarIndex] = useState(null)
  const [grammarLevel, setGrammarLevel] = useState(() => levelToCourse(userLevel))
  const [grammarSearch, setGrammarSearch] = useState('')
  const [openUnit, setOpenUnit] = useState(null) // { level, unit }

  useEffect(() => {
    let alive = true
    loadGrammarIndex().then((idx) => alive && idx && setGrammarIndex(idx))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    setGrammarLevel(levelToCourse(userLevel))
  }, [userLevel])

  const grammarLevelLabel =
    (GRAMMAR_LEVELS.find((l) => l.code === grammarLevel) || {}).label || grammarLevel.toUpperCase()

  // «Видеоклипы» убраны из клиентской части: контент остаётся в dev-admin
  // (/mobile/video-lessons живёт), но страница его не запрашивает и не рисует.
  const chips = ['Все', 'Грамматика', 'Ситуации', 'Сказки', 'Мемы и рилсы', 'Книжки']
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

  // Урок грамматики — полноэкранный takeover (как открытая книга/рилс).
  if (openUnit) {
    const lvl = grammarIndex && grammarIndex[openUnit.level]
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
        <GrammarLesson
          level={openUnit.level}
          units={lvl ? lvl.units : null}
          unit={openUnit.unit}
          token={token}
          onExit={() => setOpenUnit(null)}
          onOpenUnit={(u) => setOpenUnit({ level: openUnit.level, unit: u })}
        />
      </LearningLayout>
    )
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
        <BookDetail
          book={openBook}
          token={apiToken}
          onBack={() => setOpenBook(null)}
          onWordSaved={(w) =>
            w?.word && setWords((ws) => [w, ...ws.filter((x) => x.id !== w.id)])
          }
        />
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

          {/* Аудирование — промо мини-игры listening (только на вкладке «Все») */}
          {filter === null && (
            <ListeningBanner
              userLevel={userLevel}
              onAll={() => onNav?.('listening')}
              onStart={() => onNav?.('listening')}
            />
          )}

          {/* Грамматика — полный каталог (чип «Грамматика») */}
          {filter === 'Грамматика' &&
            (grammarIndex ? (
              <GrammarCatalog
                index={grammarIndex}
                activeLevel={grammarLevel}
                onLevel={setGrammarLevel}
                search={grammarSearch}
                onSearch={setGrammarSearch}
                onOpen={(u) => setOpenUnit({ level: grammarLevel, unit: u })}
              />
            ) : (
              <div className="gr-loading">Загрузка…</div>
            ))}

          {/* Грамматика — рейл в общем виде «Все» */}
          {filter === null && grammarIndex && (
            <GrammarRail
              index={grammarIndex}
              courseCode={grammarLevel}
              levelLabel={grammarLevelLabel}
              onOpen={(u) => setOpenUnit({ level: grammarLevel, unit: u })}
              onSeeAll={() => setFilter('Грамматика')}
            />
          )}

          {/* Мемы и рилсы */}
          {show('Мемы и рилсы') && (
          <section id="sec-Мемы и рилсы" className="pp-sec">
            <SectionHead title="Мемы и рилсы" onAll={() => setFilter('Мемы и рилсы')} />
            {clips.length === 0 ? (
              <Empty loading={state.loading} skeleton="portrait" />
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
            <SectionHead title="Книжки" onAll={() => setFilter('Книжки')}>
              <label className="pp-search">
                <SearchIcon size={15} />
                <input
                  type="search"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setBookQuery('')}
                  placeholder="Название или автор"
                  aria-label="Поиск по книжкам"
                />
                {bookQuery && (
                  <button
                    type="button"
                    className="pp-search__clear"
                    onClick={() => setBookQuery('')}
                    aria-label="Очистить поиск"
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  </button>
                )}
              </label>
            </SectionHead>
            {books.length === 0 ? (
              <Empty loading={state.loading} skeleton="book" />
            ) : visibleBooks.length === 0 ? (
              <Empty text={`Ничего не нашлось по запросу «${bookQuery.trim()}»`} />
            ) : (
              <Rail grid={grid}>
                {visibleBooks.map((b) => (
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
              state.loading ? (
                <div className="pp-voc__skel" aria-hidden="true">
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="pp-voc__skelrow">
                      <span className="pp-skel__line" />
                      <span className="pp-skel__line pp-skel__line--short" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="pp-voc__empty">Пока нет слов</div>
              )
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

// Пока секция грузится — скелетон в форме будущих карточек вместо текста:
// нет прыжка раскладки и ощущения «пустой» страницы. variant повторяет
// габариты реальных карточек (portrait — мемы 150×3:4, book — обложка + строки).
function SkeletonRail({ variant = 'portrait' }) {
  return (
    <div className="pp-rail" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="pp-skel">
          <span className="pp-skel__thumb" />
          {variant === 'book' && (
            <>
              <span className="pp-skel__line" />
              <span className="pp-skel__line pp-skel__line--short" />
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function Empty({ loading, text, skeleton }) {
  if (loading && skeleton) return <SkeletonRail variant={skeleton} />
  return (
    <div className="pp-empty">
      {loading ? 'Загрузка…' : text || 'Нет данных'}
    </div>
  )
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
