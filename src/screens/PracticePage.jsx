import { useState, useEffect, useMemo, useRef } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import { PlayIcon, ChevronLeftIcon, SearchIcon } from '../components/icons.jsx'
import { getPracticeToken, getMediaClips, getSituativki, getAudiobooks } from '../api.js'
import { TALES } from '../data/practiceLibrary.js'
import { SITUATION_LEVELS } from '../practice/situations/levels.js'
import { readSituationsDone } from '../practice/situations/situationsProgress.js'
import { loadLevel as loadSituationsLevel } from '../practice/situations/situationsData.js'
import { readDoneItems } from '../practice/situations/itemsProgress.js'
import { pickLang } from './situations/SituationsCatalog.jsx'
import { WORKBOOK_LEVELS } from '../practice/workbooks/levels.js'
import { readWorkbooksDone } from '../practice/workbooks/workbooksProgress.js'
import {
  countByAudio,
  effectiveBooksAudioMode,
  filterByAudio,
  hasAudio,
  readBooksAudioMode,
  writeBooksAudioMode,
} from '../practice/books/audioFilter.js'
import { LESSONS as SHADOWING_LESSONS } from '../practice/shadowing/lessons.js'
import { countLessonDone } from '../practice/shadowing/shadowingProgress.js'
import { getLessonScores } from '../practice/shadowing/recordings.js'
import { lessonMastery } from '../practice/shadowing/mastery.js'
import SituativkaOverlay from '../components/SituativkaOverlay.jsx'
import BookDetail, { normTitle } from './BookDetail.jsx'
import ComicReader from './ComicReader.jsx'
import KaraokeTrack from './KaraokeTrack.jsx'
import GrammarCatalog from './GrammarCatalog.jsx'
import AssignPracticeBar from './practice/AssignPracticeBar.jsx'
import BooksAudioFilter from './practice/BooksAudioFilter.jsx'
import { unitToPayload } from './practice/assignPractice.js'
import { SKILLS, SKILL_KEYS, skillModules, skillOfModule, EXPANDABLE } from './practice/practiceTabs.js'
import {
  LevelSwitch,
  SkillCard,
  SectionHead,
  Rail,
  Banner,
  TaleCard,
  ShadowCard,
  KaraokeCard,
  MemeCard,
  BookCard,
  ComicCard,
  GrammarTile,
  WorkbookTile,
  SituationCard,
} from './practice/PracticeCards.jsx'
import { isTeacher } from '../lib/jwt.js'
import GrammarLesson from './GrammarLesson.jsx'
import { loadGrammarIndex, levelToCourse } from '../practice/grammar/grammarData.js'
import {
  loadComicsIndex,
  searchComicsCatalog,
  comicStatus,
  visibleComics,
} from '../practice/comics/comicsData.js'
import { loadKaraokeIndex, trackProgress as karaokeProgress } from '../practice/karaoke/karaokeData.js'
import { PRACTICE_LEVELS, practiceLevelFor, matchesLevel, nearestLevelCode, cefrOf } from '../practice/practiceLevel.js'
import { usePracticeEntitlement } from '../practice/usePracticeEntitlement.js'
import { canOpenSeen, markSeen } from '../practice/overlaySeen.js'
import PracticeLimitScreen from '../components/PracticeLimitScreen.jsx'
import OnboardingTour, { useScreenTour } from '../tutor/OnboardingTour.jsx'
import { loadModule } from '../lib/lazyModule.js'

// Фолбэк для сказок (открытие в новой вкладке по ctrl/cmd-клику); обычный клик
// открывает мир нативно внутри приложения (src/practice/fairytale/).
// Книжки полностью нативные: каталог из dev-admin + тексты и словари из
// public/practice/books/ (см. scripts/extract-books.js).
const TALES_URL = '/practice/fairytales.html'

// Выбранные вкладка и уровень переживают уход в раздел и возврат: «Практика»
// монтируется заново при каждом переходе, и ученик, открывший ситуацию из
// «Говорения», возвращался бы на «Аудирование». sessionStorage, а не
// localStorage — это удобство на одну сессию, а не настройка: следующий заход
// снова начинается с уровня ученика.
const TAB_KEY = 'jts_practice_tab'
const LEVEL_KEY = 'jts_practice_level'
function readSession(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}
function writeSession(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* хранилище недоступно — выбор просто не запомнится */
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
    // Каталог уехал из public за роут /api/books вместе с текстами книг:
    // обложки берутся из того же индекса, что и раньше, но новым адресом.
    _coversIndexPromise = fetch('/api/books')
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

const SITUATION_CODES = SITUATION_LEVELS.map((l) => l.code)

// Строка поиска в шапке полного списка (книжки, комиксы, караоке).
function SearchBox({ value, onChange, placeholder, ariaLabel, clearLabel }) {
  return (
    <label className="pp-search">
      <SearchIcon size={15} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onChange('')}
        placeholder={placeholder}
        aria-label={ariaLabel}
      />
      {value && (
        <button type="button" className="pp-search__clear" onClick={() => onChange('')} aria-label={clearLabel}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
        </button>
      )}
    </label>
  )
}

export default function PracticePage({
  userLevel = 'A1',
  userName,
  token,
  openTarget,
  onNav,
  onProfile,
  isDemoAccount,
  // Ключ отметки «тур показан» приходит из App: в нём id профиля, поэтому
  // «один раз» считается на аккаунт, а не на браузер (см. tourKeyFor).
  tourKey,
}) {
  const { t, lang } = useI18n()
  const [state, setState] = useState({ loading: true, error: '' })
  const [clips, setClips] = useState([])
  // Все ситуативки (без фильтра по уровню). По ним и гасятся статические
  // уровни «Speaking A1–C1», которые админ закрыл целиком (levelLocked), и
  // рисуются бэкенд-карточки выбранного уровня — фильтр по уровню теперь
  // клиентский, потому что уровень переключается прямо на экране.
  const [situativkiAll, setSituativkiAll] = useState([])
  // Открытая ситуативка — смотрим внутри приложения, чтобы было где отметить
  // прохождение (внешняя вкладка такого события не давала, см. SituativkaOverlay).
  const [openSituation, setOpenSituation] = useState(null)
  // Каталог комиксов приходит из API (/mobile/comics): материал заводит
  // контентщик через админку. Пустой массив = раздел просто не показываем,
  // поэтому до первой заливки его на экране нет.
  const [comics, setComics] = useState([])
  const [comicQuery, setComicQuery] = useState('')
  // Есть ли комиксы в каталоге вообще. Отдельно от `comics`, потому что тот
  // пустеет и от поиска: иначе неудачный запрос прятал бы раздел вместе с
  // собственной строкой поиска, и стереть её было бы негде.
  const [hasComics, setHasComics] = useState(false)
  // Караоке — тот же принцип, что у комиксов: каталог только из API, пустой
  // список = раздела на экране нет вовсе. Поиск здесь клиентский (серверного
  // эндпоинта в контракте нет — библиотека штучная, десятки треков, а не сотни).
  const [karaoke, setKaraoke] = useState([])
  const [karaokeQuery, setKaraokeQuery] = useState('')
  // Профиль читателя для гейта 18+. Пока null: бэкенд не отдаёт birthDate
  // (обещали добавить). Когда начнёт — сюда придёт объект с этим полем, и
  // взрослые увидят помеченные комиксы без других правок.
  const profile = null
  // Студент упёрся в квоту статических уровней — показываем экран лимита.
  const [situationsBlocked, setSituationsBlocked] = useState(false)
  const [workbooksBlocked, setWorkbooksBlocked] = useState(false)
  const [memesBlocked, setMemesBlocked] = useState(false)
  const [talesBlocked, setTalesBlocked] = useState(false)
  const [books, setBooks] = useState([])
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
  const memesEntitlement = usePracticeEntitlement('memes', token)
  const talesEntitlement = usePracticeEntitlement('tales', token)

  // ── Навык и уровень ──────────────────────────────────────────────────────
  // Переход может нести раздел (плитка «Книги» на «Главной», выдача из
  // домашней работы) — тогда экран открывается сразу на его навыке, а у
  // раздела-списка ещё и развёрнутым. Незнакомый ключ игнорируем: вкладка по
  // умолчанию лучше пустого экрана.
  const [tab, setTab] = useState(() => {
    // `skill` — возврат из раздела, который помнит свою вкладку («Ситуации»).
    const fromTarget =
      skillOfModule(openTarget?.filter) ||
      (SKILL_KEYS.includes(openTarget?.skill) ? openTarget.skill : null) ||
      (openTarget?.area === 'situations' ? 'speaking' : null) ||
      (openTarget?.unitId != null ? 'writing' : null)
    if (fromTarget) return fromTarget
    const saved = readSession(TAB_KEY)
    return SKILL_KEYS.includes(saved) ? saved : 'listening'
  })
  // Развёрнутый раздел («Посмотреть все»): вместо ленты — только он, сеткой,
  // с поиском и фильтрами. null — обзор навыка.
  const [expanded, setExpanded] = useState(() =>
    EXPANDABLE.has(openTarget?.filter) ? openTarget.filter : null,
  )
  // Уровень, выбранный переключателем. Пока ученик его не трогал, стоит его
  // собственный уровень — и следует за ним: профиль доезжает позже первого
  // рендера, и запомнить стартовое «A1» значило бы застрять на нём.
  const [pickedLevel, setPickedLevel] = useState(() => {
    const saved = readSession(LEVEL_KEY)
    return PRACTICE_LEVELS.includes(saved) ? saved : null
  })
  const level = pickedLevel || practiceLevelFor(userLevel)

  const pickTab = (key) => {
    setTab(key)
    setExpanded(null)
    writeSession(TAB_KEY, key)
  }
  const pickLevel = (l) => {
    setPickedLevel(l)
    writeSession(LEVEL_KEY, l)
  }

  // Нативный оверлей «Speaking A1–C1» — статический бандл, внутри него
  // точечных locked-флагов нет: показываем/прячем уровень целиком. Уровень
  // считаем заблокированным, если админ закрыл в нём ВСЕ ситуативки (см.
  // Ситуативки → admin-restrictions) — частичная блокировка статикой не
  // поддерживается.
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
          pull((onFresh) => getSituativki(tok, null, onFresh), setSituativkiAll),
          pull((onFresh) => getAudiobooks(tok, onFresh), setBooks, enrichCovers),
          pull((onFresh) => loadKaraokeIndex(tok, onFresh), setKaraoke),
        ])
      })
      .then(() => alive && setState({ loading: false, error: '' }))
      .catch((e) =>
        alive && setState({ loading: false, error: e?.message || t('practice.loadError') })
      )
    return () => {
      alive = false
    }
  }, [token])   // eslint-disable-line react-hooks/exhaustive-deps

  // Тяжёлый оверлей мира сказок (~3 МБ) подгружаем на простое после первого
  // рендера: первый клик открывает его мгновенно и загрузка не конкурирует с
  // каталогами выше.
  useEffect(() => {
    const load = () => {
      import('../practice/fairytale/taleWorld.js').catch(() => {})
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(load, { timeout: 4000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(load, 2500) // Safari: requestIdleCallback нет
    return () => clearTimeout(id)
  }, [])

  // Каталог комиксов и поиск по нему. Ждём токен: эндпоинты под авторизацией,
  // как остальные /mobile-каталоги. Комиксы 18+ отсекает гейт (comicsData.js).
  //
  // Поиск серверный, поэтому набор ждёт паузы в 300 мс: иначе запрос уходит на
  // каждую букву, а ответы возвращаются вперемешку.
  useEffect(() => {
    if (!apiToken) return
    let alive = true
    const q = comicQuery.trim()
    const run = () =>
      (q
        ? searchComicsCatalog(apiToken, q)
        : loadComicsIndex(apiToken, (fresh) => {
            if (!alive) return
            setHasComics(fresh.length > 0)
            setComics(visibleComics(fresh, profile))
          })
      )
        .then((list) => {
          if (!alive) return
          if (!q) setHasComics(list.length > 0)
          setComics(visibleComics(list, profile))
        })
        .catch(() => {})
    if (!q) {
      run()
      return () => {
        alive = false
      }
    }
    const id = setTimeout(run, 300)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [apiToken, comicQuery, profile])

  // Книжки: сначала уровень (переключатель в шапке), потом озвучка, потом
  // поиск. Каталог загружен целиком, поэтому без запросов к бэкенду; normTitle
  // для поиска не подходит — вырезает кириллицу, а названия бывают русскими.
  const [bookQuery, setBookQuery] = useState('')
  // Режим озвучки: «все», «только текст», «только с аудио». Читается лениво из
  // localStorage — экран практики монтируется уже на клиенте (в App.jsx стартовый
  // screen = 'welcome'), поэтому гидратации это не задевает.
  const [storedBookAudioMode, setStoredBookAudioMode] = useState(() => readBooksAudioMode())
  // Трогал ли ученик сегмент в этой сессии: до первого касания пустой
  // запомненный режим уступает «Все», после — уважаем выбор (см.
  // effectiveBooksAudioMode).
  const [bookAudioTouched, setBookAudioTouched] = useState(false)
  const levelBooks = useMemo(() => books.filter((b) => matchesLevel(b.level, level)), [books, level])
  const bookAudioMode = effectiveBooksAudioMode(storedBookAudioMode, levelBooks, bookAudioTouched)
  const pickBookAudioMode = (mode) => {
    setBookAudioTouched(true)
    setStoredBookAudioMode(mode)
    writeBooksAudioMode(mode)
  }
  // Счётчики зависят только от каталога, а компонент сегмента перерисовывается
  // на каждый символ в поиске по книжкам — считаем один раз на загрузку.
  const bookAudioCounts = useMemo(() => countByAudio(levelBooks), [levelBooks])
  const visibleBooks = useMemo(() => {
    // Фильтр озвучки и поиск живут только в полном списке: в обзоре навыка их
    // нет (макет), и невидимый фильтр не должен прятать книги из ленты.
    if (expanded !== 'books') return levelBooks
    const byAudio = filterByAudio(levelBooks, bookAudioMode)
    const q = bookQuery.trim().toLowerCase()
    if (!q) return byAudio
    return byAudio.filter((b) => `${b.title || ''} ${b.author || ''}`.toLowerCase().includes(q))
  }, [levelBooks, bookQuery, bookAudioMode, expanded])

  // Караоке ищем на клиенте: каталог приходит целиком и он маленький (треки
  // штучные, размечает их методист руками), серверного поиска в контракте нет.
  const levelKaraoke = useMemo(() => karaoke.filter((k) => matchesLevel(k.level, level)), [karaoke, level])
  const visibleKaraoke = useMemo(() => {
    const q = expanded === 'karaoke' ? karaokeQuery.trim().toLowerCase() : ''
    if (!q) return levelKaraoke
    return levelKaraoke.filter((k) =>
      `${k.title} ${k.artist} ${k.tags.join(' ')}`.toLowerCase().includes(q),
    )
  }, [levelKaraoke, karaokeQuery, expanded])

  // Грамматика: нативный каталог уроков (данные — public/practice/grammar/,
  // см. scripts/extract-grammar.js). Лёгкий index грузим один раз при монтировании
  // — он нужен и ленте юнитов, и полному каталогу.
  const [grammarIndex, setGrammarIndex] = useState(null)
  const [grammarLevel, setGrammarLevel] = useState(() => levelToCourse(level))

  // Выдача заданий на дом — только преподавателю. Раздел «Практика» до этого был
  // от него скрыт вовсе (Sidebar, TEACHER_SECTIONS), хотя заданий в нём больше,
  // чем в самих уроках, — с этого и началась просьба.
  const teacher = isTeacher(token)

  // Отмеченное хранится ВМЕСТЕ с уровнем, а не рядом с ним. Уровень входит в
  // адрес юнита, а не только в его показ: «Unit 3» уровня A2 и «Unit 3» уровня
  // B1 — разные задания, и при смене уровня выбор обязан обнулиться. Сброс
  // эффектом дал бы кадр, в котором панель ещё показывает чужой выбор, а
  // нажатие в этот кадр отправило бы номера с прошлого уровня.
  const [picked, setPicked] = useState({ level: grammarLevel, units: [] })
  // Через useMemo, а не выражением: иначе список пересоздаётся каждый рендер и
  // тянет за собой пересчёт множества ниже, а с ним и перерисовку каталога.
  const pickedUnits = useMemo(
    () => (picked.level === grammarLevel ? picked.units : []),
    [picked, grammarLevel],
  )
  const pickedIds = useMemo(() => new Set(pickedUnits.map((u) => u.id)), [pickedUnits])

  const togglePickedUnit = (unit) => {
    setPicked((prev) => {
      const units = prev.level === grammarLevel ? prev.units : []
      return {
        level: grammarLevel,
        units: units.some((u) => u.id === unit.id)
          ? units.filter((u) => u.id !== unit.id)
          : [...units, unit],
      }
    })
  }

  const clearPickedUnits = () => setPicked({ level: grammarLevel, units: [] })
  const [grammarSearch, setGrammarSearch] = useState('')
  const [openUnit, setOpenUnit] = useState(null) // { level, unit }

  useEffect(() => {
    let alive = true
    loadGrammarIndex().then((idx) => alive && idx && setGrammarIndex(idx))
    return () => {
      alive = false
    }
  }, [])

  // Уровень грамматики следует за переключателем в шапке. Свои чипы уровней у
  // полного каталога остаются: там есть A0, которого в переключателе нет.
  useEffect(() => {
    setGrammarLevel(levelToCourse(level))
  }, [level])

  /**
   * Пришли из домашней работы за конкретным юнитом — открываем сразу его.
   *
   * Ждём каталог: до него юнита по номеру не найти. Цель отрабатываем один раз
   * (по её же ключу): иначе выход из юнита кнопкой «Назад» тут же возвращал бы
   * ученика обратно в него.
   */
  const openedTargetRef = useRef(null)
  useEffect(() => {
    if (!openTarget?.level || openTarget.unitId == null || !grammarIndex) return
    const key = `${openTarget.level}:${openTarget.unitId}`
    if (openedTargetRef.current === key) return
    const unit = (grammarIndex[openTarget.level]?.units || [])
      .find((u) => String(u.id) === String(openTarget.unitId))
    if (!unit) return
    openedTargetRef.current = key
    setGrammarLevel(openTarget.level)
    setOpenUnit({ level: openTarget.level, unit })
  }, [openTarget, grammarIndex])

  // Разговорная практика A1–C1 живёт на своём экране (?screen=situations):
  // каталог уровня и сценарий с записью ответа. Вход в неё — только отсюда,
  // потому что здесь живёт проверка квоты.
  //
  // Уровень в квоте отмечает уже сам экран, когда он открылся: так
  // сорвавшийся переход не списывает уровень впустую.
  const openSituationsLevel = (code, id) => {
    // Карточек закрытого уровня на экране нет — это доп. защита на случай
    // прямого вызова (deep link и т.п.).
    if (levelLocked.has(code)) return
    // Уровень, уже открывавшийся раньше, не упирается в лимит: квота считает
    // РАЗНЫЕ уровни, а не повторные заходы (иначе студент терял бы доступ к
    // тому, что ему уже разрешили).
    const seen = readSituationsDone()
    if (!seen.includes(code) && !situationsEntitlement.allowed) {
      setSituationsBlocked(true)
      return
    }
    onNav?.('situations', id ? { level: code, id } : { level: code })
  }

  /**
   * Пришли из домашней работы за уровнем разговорной практики.
   *
   * Ждём загрузки страницы — до неё не известны заблокированные уровни, и
   * переход сорвался бы молча. Цель отрабатывается один раз по своему ключу,
   * как и у грамматики: вернулся из раздела — не должен тут же уехать в него
   * снова.
   */
  const openedSituationsRef = useRef(null)
  useEffect(() => {
    if (openTarget?.area !== 'situations' || !openTarget?.level) return
    const key = `situations:${openTarget.level}`
    // Ждём и каталог ситуативок (state.loading): из него levelLocked узнаёт, что
    // админ закрыл уровень. Квота отвечала раньше каталога, levelLocked был
    // ещё пуст — и переход из домашки открывал закрытый уровень, а ключ уже
    // стоял в ref, так что второй проверки не было.
    if (openedSituationsRef.current === key || situationsEntitlement.loading || state.loading) return
    openedSituationsRef.current = key
    setTab('speaking')
    setExpanded('situations')
    openSituationsLevel(String(openTarget.level).toLowerCase())
  }, [openTarget, situationsEntitlement.loading, state.loading])   // eslint-disable-line react-hooks/exhaustive-deps

  // Сценарии «Ситуаций» выбранного уровня — карточками, как в макете, а не
  // одной карточкой уровня. Данные — тот же JSON уровня, что читает экран
  // раздела, и тот же кэш вкладки (situationsData.js): после Практики он
  // открывается уже без загрузки. Тянем, только когда секция на экране.
  // У C2 своей программы нет — берём ближайший уровень, как грамматика.
  const situLevel = nearestLevelCode(level, SITUATION_CODES)
  const [situ, setSitu] = useState({ level: null, items: [] })
  const wantSitu = tab === 'speaking' || expanded === 'situations'
  useEffect(() => {
    if (!wantSitu || !situLevel) return undefined
    let alive = true
    loadSituationsLevel(situLevel)
      .then((items) => alive && setSitu({ level: situLevel, items }))
      .catch(() => alive && setSitu({ level: situLevel, items: [] }))
    return () => {
      alive = false
    }
  }, [wantSitu, situLevel])
  const situLoading = wantSitu && situ.level !== situLevel
  const situItems = situ.level === situLevel && !levelLocked.has(situLevel) ? situ.items : []
  // Пройденное меняется только на экране раздела, а возврат оттуда
  // перемонтирует Практику — перечитывать по уровню достаточно.
  const situDone = useMemo(() => new Set(situLevel ? readDoneItems(situLevel) : []), [situLevel])
  const levelSituativki = situativkiAll.filter((s) => !s.locked && cefrOf(s.level) === level)

  // Онбординг-тур: сам выходит при первом заходе, дальше — по кнопке «?» в
  // мобильной шапке (в углу десктопа её на этом экране нет — там по макету
  // переключатель уровня). Шаги идут сверху вниз по вкладке «Аудирование»;
  // секций других навыков на экране нет, их тур пропускает сам.
  // Тур — ученический: преподаватель пользуется экраном как витриной заданий
  // для выдачи на дом (AssignPracticeBar), и объяснения ему не про него.
  const tour = useScreenTour(teacher ? null : tourKey)
  const tourSteps = [
    { selector: '.pk-skills', title: t('tour.practice.skills.title'), text: t('tour.practice.skills.text') },
    { selector: '.pk-levels', title: t('tour.practice.levels.title'), text: t('tour.practice.levels.text') },
    { selector: '#sec-tales', title: t('tour.practice.library.title'), text: t('tour.practice.library.text') },
    { selector: '#sec-listening', title: t('tour.practice.listening.title'), text: t('tour.practice.listening.text') },
    { selector: '#sec-listenchoose', title: t('tour.practice.listenchoose.title'), text: t('tour.practice.listenchoose.text') },
    { selector: '#sec-words', title: t('tour.practice.words.title'), text: t('tour.practice.words.text') },
    { selector: '#sec-shadowing', title: t('tour.practice.shadowing.title'), text: t('tour.practice.shadowing.text') },
  ]
  // Перед стартом возвращаем обзор «Аудирования»: под развёрнутым разделом или
  // другой вкладкой шагов в DOM нет, и тур свёлся бы к двум.
  const startTour = () => {
    pickTab('listening')
    tour.start()
  }

  // Мастерство Shadowing на карточках — локально из IndexedDB (best-effort,
  // async, не блокирует рендер лент). Возврат из урока перемонтирует
  // страницу, поэтому подгружаем при монтировании.
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

  // Открытый рилс (индекс в clips) — вертикальный плеер с прокруткой.
  const [openReel, setOpenReel] = useState(null)
  const [openBook, setOpenBook] = useState(null)
  const [openComic, setOpenComic] = useState(null)
  const [openKaraoke, setOpenKaraoke] = useState(null)

  // Мир сказок: движок Fairytale's World открывается полноэкранным оверлеем
  // поверх Практики (deep-link на конкретную сказку). Модуль ~3 МБ (base64-
  // музыка и арт), поэтому грузим его лениво при первом клике.
  const taleLoadingRef = useRef(false)
  //
  // Сказки и мемы открываются оверлеем, не уходя со страницы, поэтому ответ
  // квоты, снятый при её открытии, дальше не обновлялся: демо-ученик после
  // первой сказки листал сколько угодно. Перед стартом спрашиваем заново
  // (check), как Listening и Shadowing, и решаем по свежему ответу. Сервер
  // открытых сказок и мемов не считает (completed у них всегда 0), поэтому
  // сам счёт — по своему списку открытого (overlaySeen.js).
  const tryOpenTale = async (tale) => {
    if (taleLoadingRef.current) return
    taleLoadingRef.current = true
    try {
      const fresh = await talesEntitlement.check()
      if (!fresh.allowed || !canOpenSeen('tales', tale.id, fresh.limit)) {
        setTalesBlocked(true)
        return
      }
      markSeen('tales', tale.id)
      // loadModule, а не голый import: без catch отказ загрузки уходил в
      // никуда — нажатие на карточку не делало ровно ничего, ни экрана, ни
      // ошибки. Чаще всего так ломается вкладка, открытая до выката; она сама
      // перезагрузится (см. lib/lazyModule.js).
      const mod = await loadModule(() => import('../practice/fairytale/taleWorld.js'))
      mod?.openTaleWorld(tale.id)
    } finally {
      taleLoadingRef.current = false
    }
  }

  // Ref-страж, как у сказок: два быстрых клика по разным мемам иначе
  // открывали тот, чей ответ квоты пришёл позже.
  const reelLoadingRef = useRef(false)
  const tryOpenReel = async (index) => {
    if (reelLoadingRef.current) return
    reelLoadingRef.current = true
    try {
      const id = clips[index]?.id ?? index
      const fresh = await memesEntitlement.check()
      if (!fresh.allowed || !canOpenSeen('memes', id, fresh.limit)) {
        setMemesBlocked(true)
        return
      }
      markSeen('memes', id)
      setOpenReel(index)
    } finally {
      reelLoadingRef.current = false
    }
  }

  // Книги ограничивает сервер, а не этот экран: квота PRACTICE_BOOKS означает
  // «сколько глав открыто к чтению», и превью выдаёт бэкенд (BookPreviewService
  // и роут /api/books). Клиентский счётчик пройденных книг здесь стоял бы
  // вторым, невидимым смыслом у того же числа — и обходился бы, как и любая
  // проверка на клиенте.
  const tryOpenBook = (book) => setOpenBook(book)

  // Воркбуки. Все уровни A0–B2 живут на нативном экране (?screen=workbook):
  // свой плеер, прогресс по заданиям и разбор ошибок.
  const openWorkbookLevel = (code) => {
    const seen = readWorkbooksDone()
    if (!seen.includes(code) && !workbooksEntitlement.allowed) {
      setWorkbooksBlocked(true)
      return
    }
    onNav?.('workbook', { level: code })
  }

  const layout = (children, extra = {}) => (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile} {...extra}>
      {children}
    </LearningLayout>
  )

  // Лимиты — тот же takeover, что у грамматики.
  const blocked = [
    [situationsBlocked, situationsEntitlement, () => setSituationsBlocked(false)],
    [workbooksBlocked, workbooksEntitlement, () => setWorkbooksBlocked(false)],
    [memesBlocked, memesEntitlement, () => setMemesBlocked(false)],
    [talesBlocked, talesEntitlement, () => setTalesBlocked(false)],
  ].find(([on]) => on)
  if (blocked) {
    const [, ent, back] = blocked
    return layout(
      <PracticeLimitScreen onBuy={() => onNav?.('pricing')} limit={ent.limit} onBack={back} isDemoAccount={isDemoAccount} source={ent.source} sourceName={ent.sourceName} />,
    )
  }

  // Урок грамматики — полноэкранный takeover (как открытая книга/рилс).
  if (openUnit) {
    if (!grammarEntitlement.loading && !grammarEntitlement.allowed) {
      return layout(
        <PracticeLimitScreen onBuy={() => onNav?.('pricing')} limit={grammarEntitlement.limit} onBack={() => setOpenUnit(null)} isDemoAccount={isDemoAccount} source={grammarEntitlement.source} sourceName={grammarEntitlement.sourceName} />,
      )
    }
    const lvl = grammarIndex && grammarIndex[openUnit.level]
    return layout(
      <GrammarLesson
        level={openUnit.level}
        units={lvl ? lvl.units : null}
        unit={openUnit.unit}
        token={token}
        onExit={() => setOpenUnit(null)}
        onOpenUnit={(u) => setOpenUnit({ level: openUnit.level, unit: u })}
      />,
    )
  }

  if (openReel !== null) {
    return layout(<ReelsViewer clips={clips} startIndex={openReel} onBack={() => setOpenReel(null)} />)
  }

  if (openKaraoke) {
    return layout(<KaraokeTrack track={openKaraoke} token={apiToken} onBack={() => setOpenKaraoke(null)} />)
  }

  if (openComic) {
    return layout(<ComicReader comic={openComic} token={apiToken} onBack={() => setOpenComic(null)} />)
  }

  if (openBook) {
    return layout(<BookDetail book={openBook} token={apiToken} onBack={() => setOpenBook(null)} />)
  }

  // ── Секции навыка ────────────────────────────────────────────────────────
  const grid = expanded !== null
  const toggle = (id) => () => setExpanded((cur) => (cur === id ? null : id))
  const head = (sec, title, children) => (
    <SectionHead
      title={title}
      all={sec.all}
      small={sec.small}
      expanded={expanded === sec.id}
      onAll={toggle(sec.id)}
    >
      {expanded === sec.id ? children : null}
    </SectionHead>
  )
  const levelEmpty = <Empty text={t('practice.levelEmpty', { level })} />

  const renderSection = (sec) => {
    switch (sec.id) {
      case 'tales':
        return (
          <section key={sec.id} id="sec-tales" className="pk-sec">
            {head(sec, t('practice.chip.tales'))}
            <Rail grid={grid}>
              {TALES.map((tl) => (
                <TaleCard key={tl.id} tale={tl} href={TALES_URL} onOpen={tryOpenTale} />
              ))}
            </Rail>
          </section>
        )

      case 'listenPair':
        return (
          <div key={sec.id} className="pk-pair">
            <Banner
              id="sec-listening"
              variant="listening"
              title={t('practice.listening.heading')}
              desc={t('practice.listening.desc')}
              cta={t('practice.listening.cta')}
              onStart={() => onNav?.('listening')}
            />
            <Banner
              id="sec-listenchoose"
              variant="lc"
              title={t('practice.listenchoose.heading')}
              desc={t('practice.listenchoose.desc')}
              cta={t('practice.listenchoose.cta')}
              onStart={() => onNav?.('listenchoose')}
            />
          </div>
        )

      case 'words':
        return (
          <Banner
            key={sec.id}
            id="sec-words"
            variant="words"
            wide
            title={t('practice.words.heading')}
            desc={t('practice.words.desc')}
            cta={t('practice.words.cta')}
            onStart={() => onNav?.('words')}
          />
        )

      case 'reading':
        return (
          <Banner
            key={sec.id}
            id="sec-reading"
            variant="reading"
            wide
            title={t('practice.reading.heading')}
            desc={t('practice.reading.desc')}
            cta={t('practice.reading.cta')}
            onStart={() => onNav?.('reading')}
          />
        )

      case 'writePair':
        return (
          <div key={sec.id} className="pk-pair">
            <Banner
              id="sec-writing"
              variant="writing"
              title={t('practice.writing.heading')}
              desc={t('practice.writing.desc')}
              cta={t('practice.writing.cta')}
              onStart={() => onNav?.('writing')}
            />
            <Banner
              id="sec-verbs"
              variant="verbs"
              title={t('practice.verbs.heading')}
              desc={t('practice.verbs.desc')}
              cta={t('practice.verbs.cta')}
              onStart={() => onNav?.('verbs')}
            />
          </div>
        )

      case 'shadowing':
        return (
          <section key={sec.id} id="sec-shadowing" className="pk-sec">
            {head(sec, t('shadowing.title'))}
            <Rail grid={grid}>
              {SHADOWING_LESSONS.map((l) => (
                <ShadowCard
                  key={l.id}
                  lesson={l}
                  done={countLessonDone(l.id)}
                  mastered={shadowMastered[l.id] || 0}
                  onOpen={() => onNav?.('shadowing', l.id)}
                />
              ))}
            </Rail>
          </section>
        )

      case 'karaoke':
        // Раздела нет вовсе, пока в каталоге пусто: собственных треков
        // штучное количество, и пустая лента выглядела бы поломкой.
        if (karaoke.length === 0) return null
        return (
          <section key={sec.id} id="sec-karaoke" className="pk-sec">
            {head(
              sec,
              t('practice.chip.karaoke'),
              <SearchBox value={karaokeQuery} onChange={setKaraokeQuery} placeholder={t('karaoke.search')} ariaLabel={t('karaoke.searchAria')} clearLabel={t('karaoke.clear')} />,
            )}
            {levelKaraoke.length === 0 ? (
              levelEmpty
            ) : visibleKaraoke.length === 0 ? (
              <Empty text={t('karaoke.nothing', { q: karaokeQuery.trim() })} />
            ) : (
              <Rail grid={grid} className="pk-rail--songs">
                {visibleKaraoke.map((k) => (
                  <KaraokeCard key={k.slug || k.id} track={k} best={karaokeProgress(k.slug).best.full} onOpen={setOpenKaraoke} />
                ))}
              </Rail>
            )}
          </section>
        )

      case 'memes':
        return (
          <section key={sec.id} id="sec-memes" className="pk-sec">
            {head(sec, t('practice.chip.memes'))}
            {clips.length === 0 ? (
              <Empty loading={state.loading} skeleton="meme" />
            ) : (
              <Rail grid={grid} className="pk-rail--memes">
                {clips.map((c, i) => (
                  <MemeCard key={c.id} clip={c} onOpen={() => tryOpenReel(i)} />
                ))}
              </Rail>
            )}
          </section>
        )

      case 'books':
        return (
          <section key={sec.id} id="sec-books" className="pk-sec">
            {head(
              sec,
              t('practice.chip.books'),
              <>
                {/* Пока каталог не доехал, сегмент не рисуем: иначе висит
                    «Все 0 · Текст 0 · Аудио 0» — подпись, утверждающая, что
                    книг нет. */}
                {levelBooks.length > 0 && (
                  <BooksAudioFilter value={bookAudioMode} onChange={pickBookAudioMode} counts={bookAudioCounts} />
                )}
                <SearchBox value={bookQuery} onChange={setBookQuery} placeholder={t('practice.books.search')} ariaLabel={t('practice.books.searchAria')} clearLabel={t('practice.books.clear')} />
              </>,
            )}
            {books.length === 0 ? (
              <Empty loading={state.loading} skeleton="book" />
            ) : levelBooks.length === 0 ? (
              levelEmpty
            ) : visibleBooks.length === 0 ? (
              /* Пусто по двум разным причинам, и подсказка у них разная: под
                 запрос ничего не подошло — или в выбранном режиме озвучки
                 книг нет вовсе (так бывает у «Аудио», пока методисты не
                 залили дорожки). */
              <Empty
                text={
                  bookQuery.trim()
                    ? t('practice.books.nothing', { q: bookQuery.trim() })
                    : t('practice.books.emptyFilter')
                }
              />
            ) : (
              <Rail grid={grid} className="pk-rail--books">
                {visibleBooks.map((b) => (
                  <BookCard key={b.id} book={b} audio={hasAudio(b)} onOpen={tryOpenBook} />
                ))}
              </Rail>
            )}
          </section>
        )

      case 'comics':
        // Раздела нет вовсе, пока каталог пуст: пустая лента выглядит
        // поломкой, а комикс — контент штучный.
        if (!hasComics) return null
        return (
          <section key={sec.id} id="sec-comics" className="pk-sec">
            {head(
              sec,
              t('practice.chip.comics'),
              <SearchBox value={comicQuery} onChange={setComicQuery} placeholder={t('comics.search')} ariaLabel={t('comics.searchAria')} clearLabel={t('comics.clear')} />,
            )}
            {comics.length === 0 ? (
              <Empty text={t('comics.nothing', { q: comicQuery.trim() })} />
            ) : (
              <Rail grid={grid} className="pk-rail--books">
                {comics.map((c) => (
                  <ComicCard key={c.slug || c.id} comic={c} status={comicStatus(c)} onOpen={setOpenComic} />
                ))}
              </Rail>
            )}
          </section>
        )

      case 'grammar': {
        if (expanded === 'grammar') {
          return (
            <section key={sec.id} id="sec-grammar" className="pk-sec">
              {head(sec, t('practice.chip.grammar'))}
              {grammarIndex ? (
                <GrammarCatalog
                  index={grammarIndex}
                  activeLevel={grammarLevel}
                  onLevel={setGrammarLevel}
                  search={grammarSearch}
                  onSearch={setGrammarSearch}
                  onOpen={(u) => setOpenUnit({ level: grammarLevel, unit: u })}
                  pickMode={teacher}
                  pickedIds={pickedIds}
                  onTogglePick={togglePickedUnit}
                />
              ) : (
                <div className="gr-loading">{t('practice.loading')}</div>
              )}
            </section>
          )
        }
        const units = grammarIndex?.[grammarLevel]?.units.slice(0, 12) || []
        return (
          <section key={sec.id} id="sec-grammar" className="pk-sec">
            {head(sec, t('practice.chip.grammar'))}
            {units.length === 0 ? (
              <Empty loading={!grammarIndex} />
            ) : (
              <Rail className="pk-rail--tiles">
                {units.map((u) => (
                  <GrammarTile key={u.id} unit={u} onOpen={(unit) => setOpenUnit({ level: grammarLevel, unit })} />
                ))}
              </Rail>
            )}
          </section>
        )
      }

      case 'workbooks':
        return (
          <section key={sec.id} id="sec-workbooks" className="pk-sec">
            {head(sec, t('practice.chip.workbooks'))}
            <Rail grid={grid} className="pk-rail--tiles">
              {WORKBOOK_LEVELS.map((l, i) => (
                <WorkbookTile key={l.code} level={l} index={i} onOpen={openWorkbookLevel} />
              ))}
            </Rail>
          </section>
        )

      case 'situations': {
        // Статические сценарии уровня + ситуативки из бэкенда того же уровня.
        // Заблокированные не показываем вовсе (раньше висели замком):
        // преподаватель закрывает контент, а не дразнит им.
        const cards = [
          ...situItems.map((s) => (
            <SituationCard
              key={`s-${s.id}`}
              title={pickLang(s.title, lang)}
              poster={s.poster}
              done={situDone.has(s.id)}
              onOpen={() => openSituationsLevel(situLevel, s.id)}
            />
          )),
          ...levelSituativki.map((s) => (
            <SituationCard
              key={`b-${s.id}`}
              title={s.title}
              poster={s.coverUrl}
              done={!!s.completed}
              onOpen={() => setOpenSituation(s)}
            />
          )),
        ]
        return (
          <section key={sec.id} id="sec-situations" className="pk-sec">
            {head(sec, t('practice.chip.situations'))}
            {cards.length === 0 ? (
              situLoading || state.loading ? <Empty loading skeleton="situation" /> : levelEmpty
            ) : (
              <Rail grid={grid} className="pk-rail--situ">{cards}</Rail>
            )}
          </section>
        )
      }

      default:
        return null
    }
  }

  const skill = SKILLS.find((s) => s.key === tab) || SKILLS[0]
  const sections = expanded
    ? skill.sections.filter((sec) => sec.id === expanded)
    : skill.sections

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="practice" token={token} onNav={onNav} onProfile={onProfile} onHelp={teacher ? undefined : startTour}>
      <div className="pk pp--enter">
        <header className="pk-head">
          <h1 className="pk-head__title">{t('practice.title')}</h1>
          <LevelSwitch value={level} onChange={pickLevel} />
        </header>

        <div className="pk-skills" role="tablist">
          {SKILLS.map((s) => (
            <SkillCard
              key={s.key}
              skill={s.key}
              count={skillModules(s.key).length}
              active={tab === s.key}
              onClick={() => pickTab(s.key)}
            />
          ))}
        </div>

        {state.error && <div className="pp-note pp-note--err">{state.error}</div>}

        {sections.map(renderSection)}
      </div>

      {openSituation && (
        <SituativkaOverlay
          situativka={openSituation}
          token={apiToken}
          onClose={() => setOpenSituation(null)}
          onCompleted={(id) =>
            setSituativkiAll((list) => list.map((x) => (x.id === id ? { ...x, completed: true } : x)))
          }
          isDemoAccount={isDemoAccount}
        />
      )}

      {/* Панель выдачи стоит поверх страницы, а не в потоке каталога: пока
          преподаватель листает уровни и разделы, отмеченное и кнопка должны
          оставаться на месте. */}
      {teacher && (
        <AssignPracticeBar
          token={apiToken}
          area="grammar"
          level={grammarLevel}
          units={pickedUnits.map((u) => unitToPayload(grammarLevel, u))}
          onClear={clearPickedUnits}
        />
      )}

      {tour.open && (
        <OnboardingTour steps={tourSteps} storageKey={tourKey} onFinish={tour.finish} />
      )}
    </LearningLayout>
  )
}

// Пока секция грузится — скелетон в форме будущих карточек вместо текста:
// нет прыжка раскладки и ощущения «пустой» страницы. variant повторяет
// габариты реальных карточек макета.
function SkeletonRail({ variant }) {
  return (
    <div className={`pk-rail pk-skel pk-skel--${variant}`} aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="pk-skel__item">
          <span className="pk-skel__thumb" />
          {variant === 'book' && (
            <>
              <span className="pk-skel__line" />
              <span className="pk-skel__line pk-skel__line--short" />
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
