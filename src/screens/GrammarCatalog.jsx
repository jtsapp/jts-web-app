import { useMemo } from 'react'
import { SearchIcon, ChevronRightCircleIcon } from '../components/icons.jsx'
import {
  GRAMMAR_LEVELS,
  groupBySection,
  sectionRange,
  themeGradient,
  stripTags,
} from '../practice/grammar/grammarData.js'

// Карточка юнита: обложка-градиент по теме секции + тема грамматики оверлеем
// (в стиле обложек сказок/книг сайта) → «Unit N» + описание.
export function GrammarCard({ level, unit, onOpen }) {
  return (
    <button type="button" className="gr-card" onClick={() => onOpen(unit)}>
      <span className="gr-card__cover" style={{ background: themeGradient(level.themes, unit.theme) }}>
        <span className="gr-card__topic" dangerouslySetInnerHTML={{ __html: unit.title }} />
      </span>
      <span className="gr-card__title">Unit {unit.id}</span>
      <span className="gr-card__desc">{stripTags(unit.desc)}</span>
    </button>
  )
}

// Горизонтальный рейл «Грамматика» для вида «Все» Практики: заголовок + пилюля
// уровня + «Посмотреть все» + карточки юнитов курса пользователя.
export function GrammarRail({ index, courseCode, levelLabel, onOpen, onSeeAll }) {
  const level = index && index[courseCode]
  const units = level ? level.units.slice(0, 12) : []
  if (!units.length) return null
  return (
    <section className="pp-sec">
      <div className="pp-sec__head">
        <h2>Грамматика</h2>
        <div className="pp-sec__tools">
          <span className="gr-levelpill">Уровень {levelLabel}</span>
          <button className="pp-all" onClick={onSeeAll}>
            Посмотреть все <ChevronRightCircleIcon size={18} />
          </button>
        </div>
      </div>
      <div className="pp-rail">
        {units.map((u) => (
          <GrammarCard key={u.id} level={level} unit={u} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}

// Полный каталог грамматики: чипы уровней A1–C2, поиск, секции с пилюлей
// «Unit X-Y» и рейлами карточек.
export default function GrammarCatalog({ index, activeLevel, onLevel, search, onSearch, onOpen }) {
  const level = index && index[activeLevel]

  const groups = useMemo(() => {
    if (!level) return []
    const q = search.trim().toLowerCase()
    const all = groupBySection(level)
    if (!q) return all
    return all
      .map((g) => ({
        ...g,
        units: g.units.filter((u) =>
          `${stripTags(u.title)} ${stripTags(u.desc)} ${g.name}`.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.units.length)
  }, [level, search])

  return (
    <div className="gr-catalog">
      <label className="gr-search">
        <SearchIcon size={16} />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onSearch('')}
          placeholder="Поиск по грамматике"
          aria-label="Поиск по грамматике"
        />
      </label>

      <div className="gr-levels">
        {GRAMMAR_LEVELS.map((l) => (
          <button
            key={l.code}
            className={`gr-levelchip ${l.code === activeLevel ? 'on' : ''}`}
            onClick={() => onLevel(l.code)}
          >
            Уровень {l.label}
          </button>
        ))}
      </div>

      {!level ? (
        <div className="gr-empty">
          Уровень {GRAMMAR_LEVELS.find((l) => l.code === activeLevel)?.label} скоро появится.
        </div>
      ) : groups.length === 0 ? (
        <div className="gr-empty">Ничего не нашлось по запросу «{search.trim()}».</div>
      ) : (
        groups.map((g) => (
          <section key={g.key} className="pp-sec">
            <div className="pp-sec__head">
              <h2>
                {g.name} <span className="gr-unitpill">{sectionRange(g.units)}</span>
              </h2>
            </div>
            <div className="pp-rail">
              {g.units.map((u) => (
                <GrammarCard key={u.id} level={level} unit={u} onOpen={onOpen} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
