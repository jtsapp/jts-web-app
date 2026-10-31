import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { VolumeIcon } from '../../components/icons.jsx'
import { plural } from '../../lib/plural.js'
import { PRACTICE_LEVELS } from '../../practice/practiceLevel.js'
import { PkChevron, PkArrowCircle, PkEye, PkClock, PkIco } from './PracticeIcons.jsx'

// Карточки и блоки экрана «Практика» по макету Figma «Макеты» (5316:1548).
// Размеры и цвета сняты с узлов макета; стили — .pk-* в styles.css. Шрифт в
// макете местами PT Root UI — в приложении он везде Manrope (осознанное
// общее решение, см. tutor.css), кегли и начертания те же.

// Просмотры: 1331 → «1 331», 12000 → «12 тыс», 3400000 → «3.4 млн»
export function formatViews(n, t) {
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

// Точки сложности: у книг — точки и подпись, у караоке — ещё и сам уровень.
// Экспорт — для плашки на обложке в обзоре книги (BookDetail).
export function Dots({ level, cefr }) {
  const { t } = useI18n()
  const { dots, label } = difficulty(level)
  return (
    <span className="pk-dots">
      <span className="pk-dots__row" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <i key={i} className={i < dots ? 'on' : ''} />
        ))}
      </span>
      <b>{t(label)}</b>
      {cefr && level && <em>{level}</em>}
    </span>
  )
}

// Картинка карточки с фолбэком-плашкой, если адреса нет или файл не загрузился.
function Pic({ src, alt, className }) {
  const [ok, setOk] = useState(true)
  return (
    <span className={`pk-pic ${className || ''}`}>
      {ok && src ? <img src={src} alt={alt || ''} loading="lazy" onError={() => setOk(false)} /> : null}
    </span>
  )
}

// Переключатель уровня (LevelSegmented): шесть пилюль 56×36 в серой капсуле.
export function LevelSwitch({ value, onChange }) {
  const { t } = useI18n()
  return (
    <div className="pk-levels" role="radiogroup" aria-label={t('practice.levels')}>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'all'}
        className={`pk-levels__btn${value === 'all' ? ' is-on' : ''}`}
        onClick={() => onChange('all')}
      >
        {t('practice.levelAll')}
      </button>
      {PRACTICE_LEVELS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={value === l}
          className={`pk-levels__btn${value === l ? ' is-on' : ''}`}
          onClick={() => onChange(l)}
        >
          {l}
        </button>
      ))}
    </div>
  )
}

const SKILL_ICON = {
  listening: 'headphones',
  reading: 'menu-book',
  writing: 'edit-note',
  speaking: 'mic',
  grammarGames: 'text-fields',
}

// Вкладка раздела (макет «Практика · редизайн», 7393:14225): плитка значка в цвете своего раздела, название и
// «N тренажёров». Выбранная залита градиентом раздела. Цвета — переменные `--pk-*` класса `pk-c--<раздел>`.
// sub — подпись вместо «N тренажёров» («Грамматика»: темы и игры).
export function SkillCard({ skill, count, sub, active, onClick }) {
  const { t, lang } = useI18n()
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`pk-skill pk-skill--${skill} pk-c--${skill}${active ? ' is-on' : ''}`}
      onClick={onClick}
    >
      <span className="pk-skill__ico">
        <PkIco name={SKILL_ICON[skill]} />
      </span>
      <span className="pk-skill__text">
        <span className="pk-skill__title">{t(`practice.skill.${skill}`)}</span>
        <span className="pk-skill__count">{sub ? t(sub) : plural(t, lang, 'practice.trainers', count)}</span>
      </span>
    </button>
  )
}

// Якорь карточки — прежний id секции: на них стоят шаги тура, e2e и переходы к разделу. Где карточка заменила
// не одноимённую секцию, id прежний (Just to Listen был `sec-listen`), у двух игр «Аркады» — свой на каждую.
const ANCHOR = { justListen: 'listen', speedReading: 'speed-reading', speak: 'arcade-speak', runner: 'arcade-runner' }

// Карточка тренажёра — один шаблон на всё (система макета, 7405:4469): обложка → название → одна фраза → чип →
// переход. Вся карточка — кнопка. Обложки: `tile` (градиент раздела, значок и он же крупно прозрачным), `collage`
// и `photo` (картинка экспорта макета). Бейдж «Новое» / «Бета» — в правом верхнем углу обложки.
// Чип — токены за прохождение (только если правило есть на сервере) или своя подпись карточки («125 тем»).
export function PracticeTile({ card, tokens = 0, onOpen }) {
  const { t, lang } = useI18n()
  const chip = card.chip ? t(card.chip) : null
  return (
    <button
      type="button"
      id={`sec-${ANCHOR[card.id] || card.id}`}
      className={`pk-card pk-card--${card.cover}`}
      data-card={card.id}
      onClick={onOpen}
    >
      <span className="pk-card__cover">
        {card.cover === 'tile' ? (
          <>
            <PkIco name={card.icon} className="pk-card__glyph" />
            <span className="pk-card__mark">
              <PkIco name={card.icon} />
            </span>
          </>
        ) : (
          <img className="pk-card__img" src={card.image} alt="" loading="lazy" />
        )}
        {card.badge && <span className="pk-card__badge">{t(`practice.badge.${card.badge}`)}</span>}
      </span>
      <span className="pk-card__body">
        <span className="pk-card__text">
          <span className="pk-card__title">{t(card.title)}</span>
          <span className="pk-card__desc">{t(card.desc)}</span>
        </span>
        <span className="pk-card__foot">
          {chip ? (
            <span className="pk-card__chip">{chip}</span>
          ) : tokens > 0 ? (
            <span className="pk-card__chip" data-testid="practice-token-badge">
              {plural(t, lang, 'practice.tokenBadge', tokens)}
            </span>
          ) : (
            <span />
          )}
          <span className="pk-card__go">
            <PkIco name="arrow-forward" />
          </span>
        </span>
      </span>
    </button>
  )
}

// «+5 токенов» за прохождение: бейдж на плитке практики (ТЗ кабинетов, раздел 6).
export function TokenBadge({ points }) {
  const { t, lang } = useI18n()
  return (
    <span className="pk-tokens" data-testid="practice-token-badge">
      {plural(t, lang, 'practice.tokenBadge', points)}
    </span>
  )
}

// Шапка секции. «Посмотреть все» в макете двух видов: рамка-пилюля со
// стрелкой в кружке (`pill`) и простая ссылка с шевроном (`link`). В полном
// списке та же кнопка сворачивает его обратно.
export function SectionHead({ title, all, small, expanded, onAll, tokens = 0, children }) {
  const { t } = useI18n()
  const label = expanded ? t('practice.collapse') : t('practice.seeAll')
  return (
    <div className="pk-sec__head">
      <h2 className={`pk-sec__title${small ? ' pk-sec__title--sm' : ''}`}>
        {title}
        {tokens > 0 && <TokenBadge points={tokens} />}
      </h2>
      <div className="pk-sec__tools">
        {children}
        {all === 'link' && (
          <button type="button" className={`pk-all pk-all--link${expanded ? ' is-back' : ''}`} onClick={onAll}>
            {label}
            <PkChevron size={16} />
          </button>
        )}
        {all === 'pill' && (
          <button type="button" className={`pk-all${expanded ? ' is-back' : ''}`} onClick={onAll}>
            {label}
            <PkArrowCircle />
          </button>
        )}
      </div>
    </div>
  )
}

// Лента карточек; в полном списке — сетка с переносом.
export function Rail({ grid, className, children }) {
  return <div className={`pk-rail${grid ? ' pk-rail--grid' : ''} ${className || ''}`}>{children}</div>
}

// Обложка сказки: настоящий арт из библиотеки; при отсутствии — градиент + мотив.
function TaleCover({ tale }) {
  const [ok, setOk] = useState(true)
  const src = tale.cover || `/practice/covers/tales/${tale.id}.webp`
  if (ok) {
    return (
      <span className="pk-pic pk-tale__cover">
        <img src={src} alt={tale.title} loading="lazy" onError={() => setOk(false)} />
      </span>
    )
  }
  return (
    <span
      className="pk-pic pk-tale__cover pk-tale__cover--ph"
      style={{ background: `linear-gradient(140deg, ${tale.grad[0]}, ${tale.grad[1]})` }}
    >
      <span aria-hidden="true">{tale.motif}</span>
    </span>
  )
}

export function TaleCard({ tale, href, onOpen }) {
  const { t } = useI18n()
  return (
    <a
      className="pk-tale"
      href={href}
      onClick={(e) => {
        // модифицированные клики оставляем браузеру (новая вкладка)
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        onOpen(tale)
      }}
    >
      <TaleCover tale={tale} />
      <span className="pk-tale__body">
        <span className="pk-tale__title">{tale.title}</span>
        <span className="pk-tale__desc">{tale.desc}</span>
        <span className="pk-tale__meta">
          <span className="pk-chip">
            {t('practice.tales.duration')} <b>{tale.len}</b>
          </span>
          <span className="pk-chip">
            {t('practice.tales.chars')} <b>{tale.chars}</b>
          </span>
        </span>
      </span>
    </a>
  )
}

export function ShadowCard({ lesson, done, mastered, onOpen }) {
  const { t } = useI18n()
  return (
    <button type="button" className="pk-video" onClick={() => onOpen(lesson)}>
      <Pic src={lesson.cover} alt={lesson.short} className="pk-video__cover" />
      <span className="pk-video__body">
        <span className="pk-video__title">{lesson.title}</span>
        {mastered > 0 ? (
          <span className="pk-video__count pk-video__count--mastered" title={t('shadowing.masteredHint')}>
            ★ {mastered} / {lesson.segCount}
          </span>
        ) : (
          <span className="pk-video__count">
            {t('shadowing.card.count', { done, total: lesson.segCount })}
          </span>
        )}
      </span>
    </button>
  )
}

export function KaraokeCard({ track, best, onOpen }) {
  const { t } = useI18n()
  return (
    <button type="button" className="pk-song" onClick={() => onOpen(track)}>
      <Pic src={track.coverUrl} alt={track.title} className="pk-song__cover" />
      <span className="pk-song__body">
        <span className="pk-song__title">{track.title}</span>
        {track.artist && <span className="pk-song__sub">{track.artist}</span>}
        <Dots level={track.level} cefr />
        <span className="pk-song__lines">
          {best ? t('karaoke.best', { n: best }) : t('karaoke.lines', { n: track.lineCount || 0 })}
        </span>
      </span>
    </button>
  )
}

export function MemeCard({ clip, onOpen }) {
  const { t } = useI18n()
  return (
    <button type="button" className="pk-meme" onClick={onOpen}>
      <Pic src={clip.thumbnailUrl} alt={clip.title} className="pk-meme__cover" />
      <span className="pk-meme__views">
        <PkEye /> {formatViews(clip.views, t)}
      </span>
    </button>
  )
}

// Детерминированный градиент из строки (фолбэк-обложка книги без coverImageUrl).
function gradFor(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffff
  const a = h % 360
  return `linear-gradient(150deg, hsl(${a} 45% 42%), hsl(${(a + 40) % 360} 55% 18%))`
}

function BookCover({ book }) {
  const [ok, setOk] = useState(true)
  const src = book.coverImageUrl || book.coverUrl || ''
  if (src && ok) {
    return (
      <span className="pk-pic pk-book__cover">
        <img src={src} alt={book.title} loading="lazy" onError={() => setOk(false)} />
      </span>
    )
  }
  return (
    <span className="pk-pic pk-book__cover pk-book__cover--ph" style={{ background: gradFor(book.title || String(book.id)) }}>
      <span>{book.title}</span>
    </span>
  )
}

export function BookCard({ book, audio, onOpen }) {
  const { t } = useI18n()
  return (
    <button type="button" className="pk-book" onClick={() => onOpen(book)}>
      <BookCover book={book} />
      {/* Значок озвучки на обложке: в макете его нет, но без него книги с
          аудио не отличить от текстовых — фильтр озвучки есть в полном списке. */}
      {audio && (
        <span className="pk-book__audio" role="img" aria-label={t('practice.books.hasAudio')} title={t('practice.books.hasAudio')}>
          <VolumeIcon size={13} />
        </span>
      )}
      <span className="pk-book__body">
        <span className="pk-book__title">{book.title}</span>
        <Dots level={book.level} />
      </span>
    </button>
  )
}

export function ComicCard({ comic, status, onOpen }) {
  const { t } = useI18n()
  return (
    <button type="button" className="pk-book pk-comic" onClick={() => onOpen(comic)}>
      <Pic src={comic.coverUrl} alt={comic.title} className="pk-book__cover" />
      <span className="pk-comic__body">
        <span className="pk-comic__head">
          <span className="pk-comic__title">{comic.title}</span>
          {(comic.author || comic.subtitle) && <span className="pk-comic__sub">{comic.author || comic.subtitle}</span>}
        </span>
        <span className="pk-comic__pages">
          {status.started
            ? t('comics.continue', { n: status.page, total: status.total })
            : t('comics.pages', { total: status.total })}
        </span>
      </span>
    </button>
  )
}

// Палитра обложек воркбуков — четыре пары макета по порядку карточек: в
// макете это просто первые четыре карточки ряда (C1, A1, A2, C2 — данные-
// заглушки), своего цвета у уровня там нет. Пятый уровень берёт первую пару.
const WORKBOOK_THEMES = [
  { bg: '#fff2e5', ink: '#e57305' },
  { bg: '#f8ffe5', ink: '#65743b' },
  { bg: '#e5f6ff', ink: '#0e9ecc' },
  { bg: '#ffe5ef', ink: '#941c5e' },
]

export function WorkbookTile({ level, index, onOpen }) {
  const { t, lang } = useI18n()
  const th = WORKBOOK_THEMES[index % WORKBOOK_THEMES.length]
  return (
    <button
      type="button"
      className="pk-wb"
      style={{ '--wb-bg': th.bg, '--wb-ink': th.ink }}
      onClick={() => onOpen(level.code)}
      aria-label={`Workbook ${level.label}: ${level.title}`}
    >
      <span className="pk-wb__cover">
        <span className="pk-wb__label">{level.label}</span>
      </span>
      <span className="pk-wb__body">
        <span className="pk-wb__head">
          <span className="pk-wb__desc">{level.desc}</span>
          <span className="pk-wb__sum">
            {plural(t, lang, 'practice.units', level.units)}, {plural(t, lang, 'practice.lessons', level.lessons)}
          </span>
        </span>
        <span className="pk-meta">
          <PkClock />
          {t('practice.min', { n: level.min })}
        </span>
      </span>
    </button>
  )
}

export function SituationCard({ title, poster, done, onOpen }) {
  return (
    <button type="button" className="pk-situ" onClick={onOpen}>
      <span className="pk-situ__pic">
        <Pic src={poster} alt={title} className="pk-situ__cover" />
        {done && <span className="pk-situ__check" aria-hidden="true">✓</span>}
      </span>
      <span className="pk-situ__title">{title}</span>
    </button>
  )
}
