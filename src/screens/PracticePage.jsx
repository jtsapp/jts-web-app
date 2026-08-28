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
  TrashIcon,
} from '../components/icons.jsx'
import {
  getPracticeToken,
  getMediaClips,
  getSituativki,
  getSavedWords,
  getAudiobooks,
  deleteSavedWord,
} from '../api.js'
import { TALES } from '../data/practiceLibrary.js'
import { SITUATION_LEVELS } from '../practice/situations/levels.js'
import { readSituationsDone, markSituationLevelDone } from '../practice/situations/situationsProgress.js'
import { WORKBOOK_LEVELS } from '../practice/workbooks/levels.js'
import { readWorkbooksDone, markWorkbookLevelDone } from '../practice/workbooks/workbooksProgress.js'
import { WorkbookCard } from '../practice/workbooks/WorkbookCard.jsx'
import { NATIVE_WORKBOOK_LEVELS } from '../practice/workbook/nativeLevels.js'
import { LESSONS as SHADOWING_LESSONS } from '../practice/shadowing/lessons.js'
import { countLessonDone } from '../practice/shadowing/shadowingProgress.js'
import { getLessonScores } from '../practice/shadowing/recordings.js'
import { lessonMastery } from '../practice/shadowing/mastery.js'
import SituativkaOverlay from '../components/SituativkaOverlay.jsx'
import BookDetail, { normTitle } from './BookDetail.jsx'
import GrammarCatalog, { GrammarRail } from './GrammarCatalog.jsx'
import GrammarLesson from './GrammarLesson.jsx'
import { loadGrammarIndex, levelToCourse, GRAMMAR_LEVELS } from '../practice/grammar/grammarData.js'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'

// Фолбэк для сказок (открытие в новой вкладке по ctrl/cmd-клику); обычный клик
// открывает мир нативно внутри приложения (src/practice/fairytale/).
// Книжки полностью нативные: каталог из dev-admin + тексты и словари из
// public/practice/books/ (см. scripts/extract-books.js).
const TALES_URL = '/practice/fairytales.html'

// Просмотры: 1331 → «1 331», 12000 → «12 тыс», 3400000 → «3.4 млн»
function formatViews(n, t) {
  const v = Number(n) || 0
  if (v >= 1_000_000)
    return `${(v / 1_000_000).toFixed(v % 1_000_000 ? 1 : 0)} ${t('practice.views.mln')}`
  if (v >= 10_000) return `${Math.round(v / 1000)} ${t('practice.views.k')}`
  return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// CEFR-уровень → сложность (кол-во точек + ключ подписи)
function difficulty(level) {
  const l = String(level || '').toUpperCase()
  if (l.startsWith('C')) return { dots: 3, label: 'practice.diff.hard' }
  if (l.startsWith('B')) return { dots: 2, label: 'practice.diff.mid' }
  return { dots: 1, label: 'practice.diff.easy' }
}

function Dots({ level }) {
  const { t } = useI18n()
  const { dots, label } = difficulty(level)
  return (
    <span className="pp-dots">
      <span className="pp-dots__row">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < dots ? 'on' : ''} />
        ))}
      </span>
      {t(label)}
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
  const { t } = useI18n()
  return (
    <div className="pp-sec__head">
      <h2>{title}</h2>
      <div className="pp-sec__tools">
        {children}
        <button className="pp-all" onClick={onAll}>
          {t('practice.seeAll')} <ChevronRightCircleIcon size={18} />
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
  const { t } = useI18n()
  const level = String(userLevel || 'A1').toUpperCase()
  const noop = () => {}
  const [headTop, headRest] = t('practice.listening.heading').split('\n')
  return (
    <section id="sec-listening" className="pp-sec pp-listen">
      <SectionHead title={t('practice.listening.title')} onAll={onAll || noop} />
      <div className="pp-listen__card">
        <div className="pp-listen__body">
          <h3 className="pp-listen__title">
            {headTop}
            {headRest && (
              <>
                <br />
                {headRest}
              </>
            )}
          </h3>
          <p className="pp-listen__desc">{t('practice.listening.desc')}</p>
          <button type="button" className="pp-listen__cta" onClick={onStart || noop}>
            {t('practice.listening.cta')}
          </button>
        </div>
        <img
          className="pp-listen__art"
          src="/practice/listening-mascot.png"
          alt=""
          aria-hidden="true"
        />
        <div className="pp-listen__aside">
          <span className="pp-listen__hint">{t('practice.listening.hint')}</span>
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

// Баннер «Письмо»: вход в тренажёр Writing (180 жанров + Блокнот). Переиспользует
// каркас баннера аудирования (.pp-listen), а перекраска — модификатором .pp-write
// в writing.css. Своего арта у раздела пока нет, поэтому карточка текстовая.
function WritingBanner({ userLevel = 'A1', onAll, onStart }) {
  const { t } = useI18n()
  const level = String(userLevel || 'A1').toUpperCase()
  const noop = () => {}
  const [headTop, headRest] = t('practice.writing.heading').split('\n')
  return (
    <section id="sec-writing" className="pp-sec pp-listen pp-write">
      <SectionHead title={t('practice.writing.title')} onAll={onAll || noop} />
      <div className="pp-listen__card">
        <div className="pp-listen__body">
          <h3 className="pp-listen__title">
            {headTop}
            {headRest && (
              <>
                <br />
                {headRest}
              </>
            )}
          </h3>
          <p className="pp-listen__desc">{t('practice.writing.desc')}</p>
          <button type="button" className="pp-listen__cta" onClick={onStart || noop}>
            {t('practice.writing.cta')}
          </button>
        </div>
        <div className="pp-listen__aside">
          <span className="pp-listen__hint">{t('practice.writing.hint')}</span>
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

export default function PracticePage({ userLevel = 'A1', userName, token, onNav, onProfile, isDemoAccount }) {
  const { t } = useI18n()
  const [state, setState] = useState({ loading: true, error: '' })
  const [clips, setClips] = useState([])
  const [situations, setSituations] = useState([])
  // Все ситуативки (без фильтра по уровню студента) — только чтобы понять,
  // заблокирован ли админом статический уровень «Speaking A1–C1» целиком
  // (см. levelLocked ниже). Отдельно от `situations`, который остаётся
  // ограничен уровнем студента для инлайн-сетки бэкенд-карточек.
  const [situativkiAll, setSituativkiAll] = useState([])
  // Открытая ситуативка — смотрим внутри приложения, чтобы было где отметить
  // прохождение (внешняя вкладка такого события не давала, см. SituativkaOverlay).
  const [openSituation, setOpenSituation] = useState(null)
  // Студент упёрся в квоту статических уровней — показываем экран лимита.
  const [situationsBlocked, setSituationsBlocked] = useState(false)
  const [workbooksBlocked, setWorkbooksBlocked] = useState(false)
  const [books, setBooks] = useState([])
  const [words, setWords] = useState([])
  // Фактический Bearer для действий внутри Практики (у гостя — демо-токен).
  const [apiToken, setApiToken] = useState(token || '')
  // Открытие конкретного урока грамматики гейтится квотой (см. openUnit ниже) —
  // сам каталог/список юнитов остаётся доступным для просмотра.
  const grammarEntitlement = usePracticeEntitlement('grammar', token)
  // Квота на статические уровни «Speaking A1–C1» (см. ContentType.PRACTICE_SITUATIONS).
  // Ситуативки из бэкенда ограничиваются отдельно, флагом locked на карточке —
  // в этой же секции лежат оба источника, внешне неразличимые.
  const situationsEntitlement = usePracticeEntitlement('situations', token)
  const workbooksEntitlement = usePracticeEntitlement('workbooks', token)

  // Нативный оверлей «Speaking A1–C1» — статический бандл (iframe на HTML-
  // страницу), внутри него точечных locked-флагов нет: показываем/прячем
  // только карточку уровня целиком. Уровень считаем заблокированным, если
  // админ закрыл в нём ВСЕ ситуативки (см. Ситуативки → admin-restrictions) —
  // частичная блокировка внутри уровня статикой не поддерживается.
  const levelLocked = useMemo(() => {
    const byLevel = {}
    for (const s of situativkiAll) {
      const code = (s.level || '').toLowerCase()
      if (!code) continue
      const bucket = byLevel[code] || (byLevel[code] = { total: 0, locked: 0 })
      bucket.total++
      if (s.locked) bucket.locked++
    }
    const out = new Set()
    for (const code in byLevel) {
      if (byLevel[code].total > 0 && byLevel[code].locked === byLevel[code].total) out.add(code)
    }
    return out
  }, [situativkiAll])

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
          // Без фильтра по уровню: нужны locked-флаги по ВСЕМ уровням сразу,
          // чтобы погасить карточки «Speaking A1–C1» ниже (levelLocked), а не
          // только карточки уровня студента (для этого хватило бы `situations`).
          pull((onFresh) => getSituativki(tok, null, onFresh), setSituativkiAll),
          pull((onFresh) => getAudiobooks(tok, onFresh), setBooks, enrichCovers),
          pull((onFresh) => getSavedWords(tok, onFresh), setWords),
        ])
      })
      .then(() => alive && setState({ loading: false, error: '' }))
      .catch((e) =>
        alive && setState({ loading: false, error: e?.message || t('practice.loadError') })
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
      import('../practice/workbooks/workbooksOverlay.js').catch(() => {})
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(load, 2500) // Safari: requestIdleCallback нет
    return () => clearTimeout(id)
  }, [])

  const saved = words

  // Удаление сохранённого слова: убираем сразу (оптимистично), при ошибке —
  // возвращаем список с сервера. Нужен токен авторизации.
  const removeWord = async (w) => {
    if (!token) return
    setWords((ws) => ws.filter((x) => x.id !== w.id))
    try {
      await deleteSavedWord(token, w.id)
    } catch {
      getSavedWords(token).then(setWords).catch(() => {})
    }
  }

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
  // Ключи чипов стабильные (латиница) — подписи локализуются через t(),
  // а фильтр и id секций от языка не зависят.
  const chips = [
    { key: null, label: t('practice.chip.all') },
    { key: 'grammar', label: t('practice.chip.grammar') },
    { key: 'writing', label: t('practice.chip.writing') },
    { key: 'shadowing', label: t('practice.chip.shadowing') },
    { key: 'situations', label: t('practice.chip.situations') },
    { key: 'workbooks', label: t('practice.chip.workbooks') },
    { key: 'tales', label: t('practice.chip.tales') },
    { key: 'memes', label: t('practice.chip.memes') },
    { key: 'books', label: t('practice.chip.books') },
  ]
  // Активный фильтр: null = показываем все секции (лентами). Иначе — только
  // выбранный тип, сеткой. Меняется и чипами сверху, и «Посмотреть все».
  const [filter, setFilter] = useState(null)

  // Мастерство Shadowing на карточках — локально из IndexedDB (best-effort,
  // async, не блокирует рендер лент; см. fetchCoversIndex по духу). Возврат из
  // урока перемонтирует страницу, поэтому подгружаем при монтировании.
  const [shadowMastered, setShadowMastered] = useState({})
  useEffect(() => {
    let alive = true
    Promise.all(
      SHADOWING_LESSONS.map((l) =>
        getLessonScores(l.id).then((m) => [l.id, lessonMastery(m, l.segCount).mastered]),
      ),
    )
      .then((pairs) => alive && setShadowMastered(Object.fromEntries(pairs)))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])
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
    // Карточка заблокированного уровня скрыта (см. рендер ниже) — это доп.
    // защита на случай прямого вызова (deep link и т.п.).
    if (levelLocked.has(level)) return
    // Уровень, уже открывавшийся раньше, не упирается в лимит: квота считает
    // РАЗНЫЕ уровни, а не повторные заходы (иначе студент терял бы доступ к
    // тому, что ему уже разрешили).
    const seen = readSituationsDone()
    if (!seen.includes(level) && !situationsEntitlement.allowed) {
      setSituationsBlocked(true)
      return
    }
    taleLoadingRef.current = true
    try {
      const mod = await import('../practice/situations/situationsOverlay.js')
      mod.openSituations(level)
      if (!seen.includes(level)) markSituationLevelDone(level)
    } finally {
      taleLoadingRef.current = false
    }
  }

  // Воркбуки. A0 переведён на нативный экран (?screen=workbook) — у него свой
  // плеер, прогресс по заданиям и разбор ошибок. Остальные уровни пока живут
  // прежним оверлеем с iframe; их порт идёт следом, и тогда оверлей уйдёт.
  const openWorkbookLevel = async (level) => {
    if (taleLoadingRef.current) return
    const seen = readWorkbooksDone()
    if (!seen.includes(level) && !workbooksEntitlement.allowed) {
      setWorkbooksBlocked(true)
      return
    }
    if (NATIVE_WORKBOOK_LEVELS.includes(level)) {
      onNav?.('workbook', { level })
      return
    }
    taleLoadingRef.current = true
    try {
      const mod = await import('../practice/workbooks/workbooksOverlay.js')
      mod.openWorkbooks(level)
      if (!seen.includes(level)) markWorkbookLevelDone(level)
    } finally {
      taleLoadingRef.current = false
    }
  }

  // Лимит на разговорную практику — тот же takeover, что у грамматики.
  if (situationsBlocked) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
        <PracticeLimitScreen limit={situationsEntitlement.limit} onBack={() => setSituationsBlocked(false)} isDemoAccount={isDemoAccount} />
      </LearningLayout>
    )
  }

  if (workbooksBlocked) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
        <PracticeLimitScreen limit={workbooksEntitlement.limit} onBack={() => setWorkbooksBlocked(false)} isDemoAccount={isDemoAccount} />
      </LearningLayout>
    )
  }

  // Урок грамматики — полноэкранный takeover (как открытая книга/рилс).
  if (openUnit) {
    if (!grammarEntitlement.loading && !grammarEntitlement.allowed) {
      return (
        <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile}>
          <PracticeLimitScreen limit={grammarEntitlement.limit} onBack={() => setOpenUnit(null)} isDemoAccount={isDemoAccount} />
        </LearningLayout>
      )
    }
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
          <h1 className="pp__title">{t('practice.title')}</h1>

          <div className="pp-chips">
            {chips.map((c) => (
              <button
                key={c.key || 'all'}
                className={`pp-chip ${filter === c.key ? 'pp-chip--on' : ''}`}
                onClick={() => setFilter(c.key)}
              >
                {c.label}
              </button>
            ))}
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

          {/* Письмо — вход в тренажёр Writing. У чипа «Письмо» своей сетки нет:
              баннер и есть весь раздел, каталог уровней живёт на своём экране. */}
          {show('writing') && (
            <WritingBanner
              userLevel={userLevel}
              onAll={() => onNav?.('writing')}
              onStart={() => onNav?.('writing')}
            />
          )}

          {/* Грамматика — полный каталог (чип «Грамматика») */}
          {filter === 'grammar' &&
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
              <div className="gr-loading">{t('practice.loading')}</div>
            ))}

          {/* Грамматика — рейл в общем виде «Все» */}
          {filter === null && grammarIndex && (
            <GrammarRail
              index={grammarIndex}
              courseCode={grammarLevel}
              levelLabel={grammarLevelLabel}
              onOpen={(u) => setOpenUnit({ level: grammarLevel, unit: u })}
              onSeeAll={() => setFilter('grammar')}
            />
          )}

          {/* Shadowing — повторяй за спикером (рейл из 5 уроков-речей). Сразу после
              грамматики: оба раздела — «делай сам», в отличие от лент ниже. */}
          {show('shadowing') && (
          <section id="sec-shadowing" className="pp-sec">
            <SectionHead title={t('shadowing.title')} onAll={() => setFilter('shadowing')} />
            <Rail grid={grid}>
              {SHADOWING_LESSONS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className="sh-lcard"
                  onClick={() => onNav?.('shadowing', l.id)}
                >
                  <Thumb src={l.cover} alt={l.short} className="sh-lcard__thumb">
                    <span className="pp-play"><PlayIcon size={22} /></span>
                  </Thumb>
                  <div className="sh-lcard__title">{l.title}</div>
                  <div className="sh-lcard__meta">
                    <span className="sh-lcard__speaker">{l.short}</span>
                    {(shadowMastered[l.id] || 0) > 0 ? (
                      <span
                        className="sh-lcard__count sh-lcard__count--mastered"
                        title={t('shadowing.masteredHint')}
                      >
                        ★ {shadowMastered[l.id]} / {l.segCount}
                      </span>
                    ) : (
                      <span className="sh-lcard__count">
                        {t('shadowing.card.count', { done: countLessonDone(l.id), total: l.segCount })}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </Rail>
          </section>
          )}

          {/* Мемы и рилсы */}
          {show('memes') && (
          <section id="sec-memes" className="pp-sec">
            <SectionHead title={t('practice.chip.memes')} onAll={() => setFilter('memes')} />
            {clips.length === 0 ? (
              <Empty loading={state.loading} skeleton="portrait" />
            ) : (
              <Rail grid={grid}>
                {clips.map((c, i) => (
                  <button key={c.id} type="button" className="pp-mcard" onClick={() => setOpenReel(i)}>
                    <Thumb src={c.thumbnailUrl} alt={c.title} className="pp-thumb--portrait" />
                    <span className="pp-mcard__views"><EyeIcon size={12} /> {formatViews(c.views, t)}</span>
                  </button>
                ))}
              </Rail>
            )}
          </section>
          )}

          {/* Книжки — каталог аудиокниг из dev-admin (реальные обложки) */}
          {show('books') && (
          <section id="sec-books" className="pp-sec">
            <SectionHead title={t('practice.chip.books')} onAll={() => setFilter('books')}>
              <label className="pp-search">
                <SearchIcon size={15} />
                <input
                  type="search"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setBookQuery('')}
                  placeholder={t('practice.books.search')}
                  aria-label={t('practice.books.searchAria')}
                />
                {bookQuery && (
                  <button
                    type="button"
                    className="pp-search__clear"
                    onClick={() => setBookQuery('')}
                    aria-label={t('practice.books.clear')}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                  </button>
                )}
              </label>
            </SectionHead>
            {books.length === 0 ? (
              <Empty loading={state.loading} skeleton="book" />
            ) : visibleBooks.length === 0 ? (
              <Empty text={t('practice.books.nothing', { q: bookQuery.trim() })} />
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
          {show('tales') && (
          <section id="sec-tales" className="pp-sec">
            <SectionHead title={t('practice.chip.tales')} onAll={() => setFilter('tales')} />
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
                      {t('practice.tales.duration')} <b>{tl.len}</b>
                    </span>
                    <span className="pp-chip-meta">
                      {t('practice.tales.chars')} <b>{tl.chars}</b>
                    </span>
                  </div>
                </a>
              ))}
            </Rail>
          </section>
          )}

          {/* Ситуации: разговорная практика A1–C1 (нативный оверлей) + ситуативки из бэкенда */}
          {show('situations') && (
          <section id="sec-situations" className="pp-sec">
            <SectionHead title={t('practice.chip.situations')} onAll={() => setFilter('situations')} />
            {/* Уровни и ситуативки собираем в один список, чтобы отличить
                «ещё грузится» от «преподаватель всё закрыл»: раньше при пустой
                выдаче секция рисовала заголовок и пустоту под ним — соседние
                секции этого же экрана так не делают.

                Заблокированные сценарии не показываем вовсе (раньше висели
                замком): преподаватель закрывает контент, а не дразнит им. */}
            {(() => {
              const cards = [
                ...SITUATION_LEVELS.filter((l) => !levelLocked.has(l.code)).map((l) => (
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
                )),
                ...situations
                  .filter((s) => !s.locked && (s.level || '').toUpperCase() === (userLevel || '').toUpperCase())
                  .map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`pp-scard${s.completed ? ' pp-scard--done' : ''}`}
                      onClick={() => setOpenSituation(s)}
                    >
                      <Thumb src={s.coverUrl} alt={s.title} className="pp-thumb--situation">
                        {s.completed && <span className="pp-scard__check">✓</span>}
                      </Thumb>
                      <div className="pp-scard__title">{s.title}</div>
                    </button>
                  )),
              ]
              return cards.length === 0
                ? <Empty loading={state.loading} skeleton="portrait" />
                : <Rail grid={grid}>{cards}</Rail>
            })()}
          </section>
          )}

          {/* Воркбуки A0–B2 — карточки как у грамматики (gr-gcard) */}
          {show('workbooks') && (
          <section id="sec-workbooks" className="pp-sec">
            <SectionHead title={t('practice.chip.workbooks')} onAll={() => setFilter('workbooks')} />
            <div className="pp-rail">
              {WORKBOOK_LEVELS.map((l, i) => (
                <WorkbookCard
                  key={l.code}
                  level={l}
                  index={i}
                  onOpen={openWorkbookLevel}
                />
              ))}
            </div>
          </section>
          )}

        </div>

        {/* ───── Правая колонка: Словарь ───── */}
        <aside className="pp__side">
          <h2 className="pp-voc__title">{t('nav.vocab')}</h2>

          <div className="pp-voc__count">
            {t('practice.vocab.saved')} <b>{saved.length}</b>
          </div>

          <div className="pp-voc__list">
            {saved.length === 0 ? (
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
                <div className="pp-voc__empty">{t('practice.vocab.empty')}</div>
              )
            ) : (
              saved.map((w) => (
                <div key={w.id} className="pp-word">
                  <div className="pp-word__text">
                    <b>{w.word}</b>
                    <span>{w.translation}</span>
                  </div>
                  <button className="pp-word__say" onClick={() => speak(w.word)} aria-label={t('practice.vocab.say')}>
                    <VolumeIcon size={18} />
                  </button>
                  <button
                    className="pp-word__del"
                    onClick={() => removeWord(w)}
                    aria-label={t('practice.vocab.delete', { word: w.word })}
                  >
                    <TrashIcon size={17} />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>

      {openSituation && (
        <SituativkaOverlay
          situativka={openSituation}
          token={apiToken}
          onClose={() => setOpenSituation(null)}
          onCompleted={(id) =>
            setSituations((list) => list.map((x) => (x.id === id ? { ...x, completed: true } : x)))
          }
          isDemoAccount={isDemoAccount}
        />
      )}
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
  const { t } = useI18n()
  if (loading && skeleton) return <SkeletonRail variant={skeleton} />
  return (
    <div className="pp-empty">
      {loading ? t('practice.loading') : text || t('practice.empty')}
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

// Вертикальная лента мемов/рилсов как в TikTok. Ролики лежат в нативно
// скроллируемой ленте со scroll-snap: палец «везёт» видео за собой, отпустил —
// лента сама доводится до ближайшего ролика (никакого JS-переключения кадров).
// Активный ролик определяет IntersectionObserver (занял ≥60% кадра): он
// играет, остальные стоят. На десктопе остаются кнопки/колесо/стрелки —
// кнопки и клавиши мотают ленту плавным scrollTo; на мобиле кнопок нет
// (спрятаны в CSS), сама лента — полноэкранный оверлей.
function ReelsViewer({ clips, startIndex, onBack }) {
  const { t } = useI18n()
  const [i, setI] = useState(startIndex)
  const [hint, setHint] = useState(true)
  const [paused, setPaused] = useState(false)
  const feedRef = useRef(null)
  const iRef = useRef(startIndex)
  // Тач-экран → в подсказке свайп, а не колесо (matchMedia безопасен и в SSR-гарде)
  const coarse =
    typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches

  // Лента открывается сразу на выбранном ролике, без прокрутки к нему.
  useEffect(() => {
    const feed = feedRef.current
    if (feed) feed.scrollTop = startIndex * feed.clientHeight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Кто в кадре — тот и активен: индекс ведёт IntersectionObserver.
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return
          const k = Number(en.target.dataset.idx)
          iRef.current = k
          setI((cur) => {
            if (cur !== k) setHint(false)
            return k
          })
          setPaused(false)
        })
      },
      { root: feed, threshold: 0.6 },
    )
    feed.querySelectorAll('.rl__item').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [clips.length])

  // Играет только активный ролик. Автоплей со звуком браузер может не дать
  // без жеста — тогда показываем кнопку Play, как раньше.
  useEffect(() => {
    const feed = feedRef.current
    if (!feed) return
    feed.querySelectorAll('.rl__video').forEach((v, k) => {
      if (k === i) v.play().catch(() => setPaused(true))
      else if (!v.paused) v.pause()
    })
  }, [i])

  // Кнопки на десктопе и клавиши: плавно домотать ленту до соседнего ролика.
  const go = (dir) => {
    const feed = feedRef.current
    if (!feed) return
    const next = Math.min(clips.length - 1, Math.max(0, iRef.current + dir))
    feed.scrollTo({ top: next * feed.clientHeight, behavior: 'smooth' })
  }

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowDown') go(1)
      else if (e.key === 'ArrowUp') go(-1)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clips.length])

  const togglePlay = () => {
    const v = feedRef.current?.querySelectorAll('.rl__video')[iRef.current]
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
          <ChevronLeftIcon size={18} /> {t('common.back')}
        </button>
        <div className="vd__headtitle">
          <b>{t('practice.chip.memes')}</b>
        </div>
      </div>

      <div className="rl__stage">
        <div className="rl__frame">
          <div className="rl__feed" ref={feedRef}>
            {clips.map((clip, k) => (
              <div key={clip.id} className="rl__item" data-idx={k} data-active={k === i || undefined}>
                <video
                  className="rl__video"
                  src={clip.mediaUrl}
                  poster={clip.thumbnailUrl}
                  loop
                  playsInline
                  preload={Math.abs(k - i) <= 1 ? 'auto' : 'none'}
                  onClick={togglePlay}
                />
                {paused && k === i && (
                  <button className="rl__playbtn" onClick={togglePlay} aria-label={t('practice.reels.play')}>
                    <PlayIcon size={30} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {hint && (
            <div className="rl__hint">
              {coarse ? (
                <svg width="26" height="34" viewBox="0 0 26 34" fill="none">
                  <path d="M13 6v22M13 6l-5 5M13 6l5 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="26" height="34" viewBox="0 0 26 34" fill="none">
                  <rect x="1.5" y="1.5" width="23" height="31" rx="11.5" stroke="currentColor" strokeWidth="2" />
                  <rect x="12" y="7" width="2" height="7" rx="1" fill="currentColor" />
                </svg>
              )}
              <span>{t(coarse ? 'practice.reels.hintTouch' : 'practice.reels.hint')}</span>
            </div>
          )}
        </div>

        <div className="rl__nav">
          <button className="rl__navbtn" disabled={i === 0} onClick={() => go(-1)} aria-label={t('practice.reels.prev')}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="m6 15 6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button className="rl__navbtn" disabled={i === clips.length - 1} onClick={() => go(1)} aria-label={t('practice.reels.next')}>
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
