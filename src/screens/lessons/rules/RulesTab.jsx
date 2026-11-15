import { useRef } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { rulesFor, splitBold } from './rulesContent.js'

// Вкладка «Правила» в «Уроках» — правила обучения школы целиком (перенос, отмена,
// заморозка, когда сгорают уроки). Текст — rulesContent.js, на языке интерфейса.

function Rich({ text }) {
  return splitBold(text).map((part, i) => (part.bold ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))
}

function Block({ block }) {
  if (block.type === 'list') {
    return (
      <ul className="lr-card__list">
        {block.items.map((item, i) => <li key={i}><Rich text={item} /></li>)}
      </ul>
    )
  }
  if (block.type === 'note') {
    return <div className={`lr-note lr-note--${block.tone}`}><Rich text={block.text} /></div>
  }
  if (block.type === 'table') {
    return (
      <div className="lr-table-wrap">
        <table className="lr-table">
          <thead>
            <tr>{block.head.map((cell) => <th key={cell}>{cell}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.text}>
                <td>{row.text}</td>
                <td><span className={`lr-pill lr-pill--${row.tone}`}>{row.result}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  return <p className={`lr-card__p${block.italic ? ' lr-card__p--aside' : ''}`}><Rich text={block.text} /></p>
}

export default function RulesTab() {
  const { lang } = useI18n()
  const rules = rulesFor(lang)
  const cards = useRef({})

  // Оглавление прокручивает к разделу сам, а не якорем `#id`: адрес приложения —
  // его состояние (?screen=…), и хэш в нём лишний (так же устроены Cartoon World и
  // Prepositions World).
  const jump = (id) => {
    cards.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <article className="lr" lang={lang}>
      <header className="lr__hero">
        <span className="lr__tag">{rules.tag}</span>
        <h2 className="lr__title">{rules.title}</h2>
        <p className="lr__lead">{rules.lead}</p>
      </header>

      <div className="lr__stats">
        {rules.stats.map((stat) => (
          <div key={stat.num} className="lr-stat">
            <div className="lr-stat__num">{stat.num}</div>
            <div className="lr-stat__label">{stat.label}</div>
          </div>
        ))}
      </div>

      <nav className="lr__toc" aria-label={rules.toc}>
        <h3 className="lr__toc-title">{rules.toc}</h3>
        <ol className="lr__toc-list">
          {rules.sections.map((section) => (
            <li key={section.id}>
              <button type="button" className="lr__toc-link" onClick={() => jump(section.id)}>
                {section.title}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      {rules.sections.map((section, i) => (
        <section
          key={section.id}
          ref={(node) => { cards.current[section.id] = node }}
          className="lr-card"
          data-rules-section={section.id}
        >
          <h3 className="lr-card__title">
            <span className="lr-card__n">{i + 1}</span>
            {section.title}
          </h3>
          {section.blocks.map((block, j) => <Block key={j} block={block} />)}
        </section>
      ))}

      <section className="lr__closing">
        <h3 className="lr__closing-title">{rules.closing.title}</h3>
        <p>{rules.closing.text}</p>
        <ul className="lr__closing-list">
          {rules.closing.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p>{rules.closing.outro}</p>
        <p className="lr__sign">{rules.closing.sign}</p>
      </section>

      <p className="lr__foot">{rules.footer}</p>
    </article>
  )
}
