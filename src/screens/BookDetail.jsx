import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { saveWord, getAudiobook } from '../api.js'
import { userIdFromToken } from '../lib/jwt.js'
import { useI18n } from '../i18n.jsx'
import { recordSkill } from '../practice/skillStats.js'
import { cleanWord, translateWord } from '../lib/wordTranslate.js'
import { Dots } from './practice/PracticeCards.jsx'
import { chapterProgress, splitSubtitles, subtitleAt, subtitleTextFor } from '../practice/books/readAlong.js'

// ── Контент книг ────────────────────────────────────────────────────────────
// У читалки два источника глав, в порядке приоритета:
//   1) каталог сайта — GET /api/books/<id> (файлы лежат в data/books, вне
//      public: демо-аккаунту роут отдаёт только первые главы),
//      извлечённые из hosted-библиотеки «Книжек» (scripts/extract-books.js).
//      Каталог там свой, без общих id с бэкендом, поэтому связываем по
//      нормализованному названию;
//   2) бэкенд, GET /mobile/audio-lessons/{id} — текст глав, заведённый в
//      админке (tracks[].text). Так книга добавляется без правок фронта:
//      завели в админке — она читается. Словаря у такой книги нет, тап-перевод
//      уходит в сетевой фолбэк (как у книг, дотянутых из Gutenberg).
// Ни того, ни другого — читаем как раньше (голые треки → заглушка главы).
let _bookIndexPromise = null
const _bookContentCache = {}

export function normTitle(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Треки книги с бэкенда → главы читалки. null, если текста нет ни у одной
 *  главы: тогда вызывающая сторона оставляет прежнюю ветку с треками, а не
 *  подменяет их пустышками. */
export function chaptersFromTracks(tracks) {
  const list = Array.isArray(tracks) ? tracks : []
  if (!list.some((t) => String(t?.text || '').trim())) return null
  return list.map((t, i) => ({
    num: String(t?.trackIndex ?? i + 1),
    title: t?.title || '',
    text: String(t?.text || '').trim(),
    // Бэкенд помечает главы за пределами демо-превью (BookPreviewService).
    locked: !!t?.locked,
  }))
}

/** Владелец кэшированного ответа: id аккаунта из токена, иначе аноним. */
function cacheOwner(token) {
  return userIdFromToken(token) ?? 'anon'
}

async function loadStaticContent(title, token) {
  if (!_bookIndexPromise) {
    _bookIndexPromise = fetch('/api/books').then((r) => (r.ok ? r.json() : []))
  }
  const index = await _bookIndexPromise.catch(() => [])
  const want = normTitle(title)
  if (!want) return null
  const hit =
    index.find((b) => normTitle(b.title) === want) ||
    // «Alice in Wonderland» ↔ «Alice's Adventures in Wonderland» и т.п.
    index.find((b) => normTitle(b.title).includes(want) || want.includes(normTitle(b.title)))
  if (!hit) return null
  const cacheKey = `${hit.id}:${cacheOwner(token)}`
  if (!_bookContentCache[cacheKey]) {
    // Промах не кэшируем: единственный сбой сети (офлайн, 404 в момент
    // деплоя) навсегда оставил бы книгу «без текста» до перезагрузки страницы.
    // Ключ несёт id аккаунта, а не «есть токен / нет»: сколько глав вернёт
    // сервер, зависит от конкретного ученика. На общем компьютере (класс,
    // ноутбук преподавателя на пробном уроке) после выхода и входа под другим
    // аккаунтом кэш модуля переживает смену пользователя — и демо-ученик
    // получил бы полную книгу, оставшуюся от предыдущего, вообще не сходив на
    // сервер.
    _bookContentCache[cacheKey] = fetch(`/api/books/${hit.id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((res) => {
        if (!res) delete _bookContentCache[cacheKey]
        return res
      })
  }
  return _bookContentCache[cacheKey]
}

// Экспортируется ради теста кэша (bookCache.test.js): ключ должен различать
// аккаунты, и проверить это можно только через сам загрузчик.
export async function loadBookContent(book, token) {
  const fromStatic = await loadStaticContent(book?.title, token)
  if (fromStatic?.chapters?.length) return fromStatic
  if (book?.id == null) return fromStatic
  return loadApiContent(book, token)
}

// Главы книги из админки. Отдельно от loadBookContent ради субтитров аудио:
// у книги, найденной в статике, читалка бэкенд не спрашивает, а текст трека
// (он и есть субтитры) живёт только там. Кэш общий — повторно в сеть не ходим.
export function loadApiContent(book, token) {
  const id = book?.id
  if (id == null) return Promise.resolve(null)
  // Тот же принцип, что и у каталога сайта: превью книг админки режет бэкенд
  // по демо-статусу ученика, поэтому ответ нельзя переиспользовать между
  // аккаунтами.
  const key = `api:${id}:${cacheOwner(token)}`
  if (!_bookContentCache[key]) {
    // Тот же принцип: null (сбой сети, просроченный токен, книга без текста
    // глав) не замораживаем — иначе повторное открытие книги не ходило бы в
    // сеть до перезагрузки страницы.
    _bookContentCache[key] = getAudiobook(token, id)
      .then((full) => {
        const chapters = chaptersFromTracks(full?.tracks)
        return chapters ? { book: full, chapters, dict: {} } : null
      })
      .catch(() => null)
      .then((res) => {
        if (!res) delete _bookContentCache[key]
        return res
      })
  }
  return _bookContentCache[key]
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

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), Math.max(min, max))
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
  const readCountedRef = useRef(false)
  const [content, setContent] = useState(null)

  useEffect(() => {
    let alive = true
    loadBookContent(book, token).then((c) => alive && setContent(c))
    return () => {
      alive = false
    }
  }, [book, token])

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
        locked: !!c.locked,
        durationLabel: sameCount ? tracks[i]?.durationLabel : '',
      }))
    }
    return tracks
  }, [content, tracks])

  const total = chapters.length || 1
  const lockedCount = chapters.filter((c) => c.locked).length

  // Треки detail-эндпоинта — источник субтитров аудио (см. subtitleTextFor).
  // Спрашиваем только в режиме аудио: книге, которую читают глазами, лишний
  // запрос ни к чему; у книги из админки ответ уже лежит в кэше.
  const [apiTracks, setApiTracks] = useState(null)
  useEffect(() => {
    if (mode !== 'audio') return
    let alive = true
    loadApiContent(book, token).then((c) => alive && setApiTracks(c?.book?.tracks || null))
    return () => {
      alive = false
    }
  }, [mode, book, token])

  const openChapter = (i, m = 'read') => {
    // Закрытая глава не открывается: текста в ней всё равно нет — сервер его
    // не прислал, а пустой экран читалки выглядел бы поломкой.
    if (chapters[i]?.locked) return
    setCh(i)
    setVisited((s) => {
      const next = new Set(s).add(i)
      if (!readCountedRef.current && chapters.length > 0 && next.size >= chapters.length) {
        readCountedRef.current = true
        recordSkill('reading', true)
      }
      return next
    })
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
            {/* Сложность плашкой на обложке — только в мобильном макете
                (кадр 4295:15510); на десктопе её прячет src/mobile/practice.css. */}
            <span className="bk-ov__diff">
              <Dots level={book.level} />
            </span>
            <div className="bk-ov__actions">
              <button className="bk-btn bk-btn--primary" onClick={() => openChapter(0, 'read')}>
                Начать чтение
              </button>
              {tracks.some((t) => t.audioUrl) && (
                <button className="bk-btn bk-btn--ghost" onClick={() => openChapter(0, 'audio')}>
                  {/* Эмодзи в своей обёртке: мобильный макет ставит на его место
                      иконку наушников (src/mobile/practice.css). */}
                  <span className="bk-btn__ico" aria-hidden="true">🎧</span> Аудио
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
              {lockedCount > 0 && (
                <p className="bk-ov__preview">
                  Ознакомительный доступ: открыто {total - lockedCount} из {total} глав. Остальные откроются с полным
                  доступом к платформе.
                </p>
              )}
              <div className="bk-chapters">
                {chapters.map((t, i) => (
                  <button
                    key={t.id || i}
                    className={`bk-chapter ${t.locked ? 'bk-chapter--locked' : ''}`}
                    onClick={() => openChapter(i, 'read')}
                    disabled={!!t.locked}
                  >
                    <span className="bk-chapter__idx">{i + 1}</span>
                    <span className="bk-chapter__title">{t.title || `Глава ${i + 1}`}</span>
                    <span className="bk-chapter__dur">{t.locked ? '🔒' : t.durationLabel || ''}</span>
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
  // Главы статики — только если книга пришла оттуда (у книги из админки
  // content.book — ответ detail, его треки уже в apiTracks).
  const staticChapters = content && !content.book?.tracks ? content.chapters : null
  return (
    <BookAudio
      book={book}
      tracks={tracks}
      ch={ch}
      subtitles={subtitleTextFor(tracks[ch], ch, { apiTracks, staticChapters, trackCount: tracks.length })}
      onPick={(i) => openChapter(i, 'audio')}
      onBack={() => setMode('overview')}
    />
  )
}

// ── Режим чтения ────────────────────────────────────────────────────────────
function BookRead({ book, chapters, dict, token, ch, onPick, onNext, onBack, onWordSaved, onAudio }) {
  // Язык перевода следует за языком интерфейса: казахский — en→kk, иначе en→ru.
  const { lang, t } = useI18n()
  // Оглавление на телефоне — отдельный лист по кнопке в шапке (макет
  // 4302:17033), а не список над текстом: у длинной книги до первой строки
  // главы пришлось бы листать десятки пунктов. На десктопе это колонка сбоку.
  const [toc, setToc] = useState(false)
  const tl = lang === 'kk' ? 'kk' : 'ru'
  const chapter = chapters[ch] || {}
  // Главы без текста (книга не из библиотеки и текст не заведён в админке)
  // показываем честной заглушкой — раньше тут был общий демо-текст, из-за
  // которого переход между главами выглядел как «ничего не поменялось».
  const text = chapter.text || ''
  // {word, translation, alternates, loading, saving, saved, anchor}
  const [pop, setPop] = useState(null)
  // Координаты попапа в системе .bk-read; считаются после отрисовки — по
  // фактическому размеру карточки, поэтому до замера её не показываем.
  const [popPos, setPopPos] = useState(null)
  const hostRef = useRef(null)
  const popRef = useRef(null)
  // Начало главы и конец её текста — по ним полоса считает прогресс.
  const articleRef = useRef(null)
  const endRef = useRef(null)
  // Отсекает ответы перевода/сохранения от уже закрытого или сменённого попапа.
  const seqRef = useRef(0)

  const onWord = (e, raw) => {
    const w = cleanWord(raw)
    if (!w) return
    const seq = ++seqRef.current
    setPopPos(null)
    const base = {
      word: w,
      alternates: [],
      loading: false,
      saving: false,
      saved: false,
      anchor: e.currentTarget,
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

  // Раскладка попапа. Карточка лежит внутри .bk-read (position: absolute),
  // поэтому при прокрутке едет вместе со словом — раньше она была fixed и
  // после скролла оставалась висеть далеко от слова. Позицию пересчитываем на
  // каждый рендер: высота меняется, пока грузится перевод. Ставим под словом,
  // а если карточка туда не влезает — над ним.
  useLayoutEffect(() => {
    const anchor = pop?.anchor
    const el = popRef.current
    const host = hostRef.current
    if (!anchor || !el || !host) return
    const GAP = 8
    const EDGE = 8
    const a = anchor.getBoundingClientRect()
    const p = el.getBoundingClientRect()
    const h = host.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight
    const fitsBelow = a.bottom + GAP + p.height <= vh - EDGE
    const fitsAbove = a.top - GAP - p.height >= EDGE
    const top = fitsBelow || !fitsAbove ? a.bottom + GAP : a.top - GAP - p.height
    // По X держим карточку внутри зоны чтения: за левой границей .bk-read
    // начинается сайдбар, и попап уезжал бы под него.
    const left = clamp(
      a.left + a.width / 2 - p.width / 2,
      Math.max(EDGE, h.left),
      Math.min(vw - EDGE, h.right) - p.width,
    )
    const next = { left: left - h.left, top: top - h.top }
    setPopPos((prev) =>
      prev && Math.abs(prev.left - next.left) < 0.5 && Math.abs(prev.top - next.top) < 0.5
        ? prev
        : next,
    )
  })

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setPop(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
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
          {/* На телефоне «назад» — круглый значок без подписи, и глава
              переезжает в заголовок; на десктопе этой строки нет. */}
          <b className="bk-head__chapter">{chapter.title || `Глава ${ch + 1}`}</b>
          <span>{book.title}</span>
        </div>
        <button type="button" className="bk-head__toc" onClick={() => setToc(true)} aria-label="Главы книги" />
      </div>

      <div className="bk-read" ref={hostRef}>
        {/* key={ch} ремоунтит статью при смене главы — CSS-анимация входа
            проигрывается заново (и отключена при prefers-reduced-motion). */}
        <article key={ch} ref={articleRef} className="bk-read__text" onClick={() => setPop(null)}>
          {/* Название главы в кадре стоит над текстом крупной строкой — раньше
              его можно было увидеть только в шапке и в списке глав. */}
          <h1 className="bk-read__title">{chapter.title || `Глава ${ch + 1}`}</h1>
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
          {/* Метка конца текста: прогресс главы не должен включать кнопку
              «следующая глава» и поля под ней. Пустой блок места не занимает. */}
          {text && <div ref={endRef} aria-hidden="true" />}
          {ch < chapters.length - 1 && (
            <button className="bk-btn bk-btn--primary bk-read__next" onClick={onNext}>
              Перейти к следующей главе
            </button>
          )}
        </article>

        <aside className={`bk-read__side${toc ? ' is-open' : ''}`}>
          <h2 className="bk-read__sidetitle">Главы книги</h2>
          <button type="button" className="bk-read__close" onClick={() => setToc(false)} aria-label={t('common.close')} />
          <div className="bk-chapters">
            {chapters.map((t, i) => (
              <button
                key={t.id || i}
                className={`bk-chapter ${i === ch ? 'bk-chapter--on' : ''}`}
                onClick={() => {
                  setToc(false)
                  onPick(i)
                }}
              >
                <span className="bk-chapter__idx">{i + 1}</span>
                <span className="bk-chapter__title">{t.title || `Глава ${i + 1}`}</span>
                <span className="bk-chapter__dur">{t.durationLabel || ''}</span>
              </button>
            ))}
          </div>
        </aside>

        {pop && (
          <div
            ref={popRef}
            className="bk-pop"
            style={{
              left: popPos?.left ?? 0,
              top: popPos?.top ?? 0,
              visibility: popPos ? 'visible' : 'hidden',
            }}
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

      {text && <ReadProgress articleRef={articleRef} endRef={endRef} chKey={ch} label={t('books.readProgress')} />}
    </div>
  )
}

// ── Полоса прогресса главы (кадр 4302:16980) ────────────────────────────────
// Плавающая пилюля внизу экрана, только на телефоне: на десктопе её прячет
// src/mobile/practice.css, там рядом с текстом и так колонка глав.
//
// Отдельный компонент со своим состоянием: прокрутка обновляет только его, а
// не всю статью — в главе тысячи спанов-слов, и перерисовывать их на каждый
// кадр прокрутки значило бы дёргать скролл. Замер — раз в кадр (rAF), слушатель
// passive, а состояние — целый процент: пока он не сменился, React не
// перерисовывает и полосу.
//
// Через портал в body: у .bk есть анимация входа с transform, а transform
// предка делает position: fixed относительным ему — пилюля первые доли секунды
// стояла бы внизу всей главы, а не экрана (та же грабля у OnboardingTour).
function ReadProgress({ articleRef, endRef, chKey, label }) {
  const barRef = useRef(null)
  const [pct, setPct] = useState(0)
  // Режим чтения открывается только кликом, то есть уже в браузере; проверка —
  // на случай серверного рендера.
  const host = typeof document === 'undefined' ? null : document.body

  useEffect(() => {
    let raf = 0
    const measure = () => {
      raf = 0
      const art = articleRef.current
      const end = endRef.current
      const bar = barRef.current
      // display: none (десктоп) — мерить незачем.
      if (!art || !end || !bar || !bar.getClientRects().length) return
      const se = document.scrollingElement || document.documentElement
      const p = chapterProgress({
        top: art.getBoundingClientRect().top,
        bottom: end.getBoundingClientRect().top,
        viewTop: 0,
        // Текст под пилюлей не прочитан: видимая часть кончается над ней.
        viewBottom: bar.getBoundingClientRect().top,
        atPageEnd: se.scrollTop + se.clientHeight >= se.scrollHeight - 2,
      })
      setPct(Math.round(p * 100))
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    // Высота главы меняется и без прокрутки: догрузился шрифт, повернули экран.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    if (ro && articleRef.current) ro.observe(articleRef.current)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      ro?.disconnect()
    }
  }, [articleRef, endRef, chKey])

  if (!host) return null
  // Дочитал — пилюля уходит (кадр 4302:17015): в конце главы её место под
  // кнопкой «следующая глава», и она бы её закрыла. Прячем прозрачностью, а не
  // сдвигом: позиция пилюли — граница видимого текста в замере.
  return createPortal(
    <div
      ref={barRef}
      className={`bk-readbar${pct >= 100 ? ' is-done' : ''}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
    >
      <span className="bk-readbar__track">
        <span className="bk-readbar__fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="bk-readbar__pct">{pct}%</span>
    </div>,
    host,
  )
}

// ── Аудио-плеер ─────────────────────────────────────────────────────────────
function BookAudio({ book, tracks, ch, subtitles, onPick, onBack }) {
  const { t } = useI18n()
  const track = tracks[ch] || {}
  // Оглавление на телефоне — лист по кнопке в шапке, как в режиме чтения.
  const [toc, setToc] = useState(false)
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)
  const subs = useMemo(() => splitSubtitles(subtitles), [subtitles])
  // Место в субтитрах — пропорцией времени, без таймкодов (см. readAlong.js).
  const at = subtitleAt(subs, cur, dur)

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
          <b className="bk-head__chapter">{track.title || `Глава ${ch + 1}`}</b>
          <span>{book.title}</span>
        </div>
        <button type="button" className="bk-head__toc" onClick={() => setToc(true)} aria-label="Главы книги" />
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

          {subs.sentences.length > 0 && (
            <BookSubtitles key={ch} subs={subs} index={at.index} frac={at.frac} title={t('books.subtitles')} />
          )}
        </div>

        <aside className={`bk-read__side${toc ? ' is-open' : ''}`}>
          <h2 className="bk-read__sidetitle">Главы книги</h2>
          <button type="button" className="bk-read__close" onClick={() => setToc(false)} aria-label={t('common.close')} />
          <div className="bk-chapters">
            {tracks.map((t, i) => (
              <button
                key={t.id || i}
                className={`bk-chapter ${i === ch ? 'bk-chapter--on' : ''}`}
                onClick={() => {
                  setToc(false)
                  onPick(i)
                }}
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

// ── Субтитры аудиокниги (кадры 4295:16276, 4295:16324) ──────────────────────
// Карточка с текстом главы: прозвучавшее — жирным тёмным, впереди — серым, окно
// на шесть строк само едет за голосом. Место — ПРИБЛИЖЕНИЕ по пропорции
// времени, по целым предложениям (почему не по словам — в readAlong.js).
//
// Предложения рисуются заново только при смене текущего: время приходит
// четыре раза в секунду, а в главе сотни предложений.
function BookSubtitles({ subs, index, frac, title }) {
  const viewRef = useRef(null)
  const sentRefs = useRef([])

  const body = useMemo(
    () =>
      subs.paras.map((ids, pi) => (
        <p key={pi} className="bk-subs__p">
          {ids.map((i) => (
            <span
              key={i}
              ref={(el) => {
                sentRefs.current[i] = el
              }}
              className={i <= index ? 'is-said' : undefined}
            >
              {subs.sentences[i].text}{' '}
            </span>
          ))}
        </p>
      )),
    [subs, index],
  )

  // Текущее предложение держим третьей строкой окна — две строки над ним
  // оставляют контекст, как в кадре. Длинное, не влезающее в остаток окна,
  // докручиваем по доле внутри него, иначе хвост так и остался бы за краем.
  // Жирное начертание шире обычного и переносит строки — поэтому замер после
  // отрисовки (layout effect), а не по расчётной высоте.
  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return
    const el = index >= 0 ? sentRefs.current[index] : null
    let target = 0
    if (el) {
      const line = parseFloat(getComputedStyle(view).lineHeight) || 22
      const v = view.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      const top = r.top - v.top + view.scrollTop
      const lead = 2 * line
      const room = view.clientHeight - lead
      // По сетке строк: иначе доля внутри предложения срезала бы верхнюю
      // строку окна пополам.
      target = Math.round((top - lead + Math.max(0, r.height - room) * frac) / line) * line
    }
    target = Math.round(Math.min(Math.max(target, 0), view.scrollHeight - view.clientHeight))
    if (Math.abs(view.scrollTop - target) <= 1) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    view.scrollTo({ top: target, behavior: still ? 'auto' : 'smooth' })
  }, [index, frac, body])

  return (
    <section className="bk-subs" aria-label={title}>
      <h2 className="bk-subs__title">{title}</h2>
      {/* Окно не прокручивается пальцем: его ведёт голос, а весь текст главы
          открыт в режиме чтения. */}
      <div ref={viewRef} className="bk-subs__view">
        {body}
      </div>
    </section>
  )
}
