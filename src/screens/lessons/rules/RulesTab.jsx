import { useRef } from 'react'
import { useI18n } from '../../../i18n.jsx'
import { legalDocumentUrl } from '../../../lib/legalDocuments.js'
import { rulesFor, splitBold } from './rulesContent.js'

// Вкладка «Правила» в «Уроках» — правила обучения школы целиком (назначение
// преподавателя, бонусы, возврат, перенос и отмена, опоздание, заморозка, когда
// сгорают уроки). Текст — rulesContent.js, на языке интерфейса.

function Rich({ text }) {
  return splitBold(text).map((part, i) => (part.bold ? <b key={i}>{part.text}</b> : <span key={i}>{part.text}</span>))
}

// Заголовок карточки-факта с `{offer}` — ссылкой на оферту. Та же PDF, что в
// подвале сайта (LegalDocumentsLinks), чтобы «Публичная оферта» была одна.
function FactTitle({ text, offer, lang }) {
  const [before, after] = text.split('{offer}')
  if (after === undefined) return <p className="lr-card__sub">{text}</p>
  return (
    <p className="lr-card__sub">
      {before}
      <a href={legalDocumentUrl('offer', lang)} target="_blank" rel="noopener noreferrer">{offer}</a>
      {after}
    </p>
  )
}

function Block({ block, rules, lang }) {
  if (block.type === 'sub') {
    return <h4 className="lr-card__sub">{block.text}</h4>
  }
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
  if (block.type === 'facts') {
    return (
      <div className="lr-facts">
        {block.items.map((fact, i) => (
          <div key={i} className="lr-fact">
            {fact.k && <div className="lr-fact__k">{fact.k}</div>}
            {fact.v && <div className="lr-fact__v">{fact.v}</div>}
            {fact.sub && <FactTitle text={fact.sub} offer={rules.offer} lang={lang} />}
            {fact.d && <p className="lr-fact__d"><Rich text={fact.d} /></p>}
          </div>
        ))}
      </div>
    )
  }
  if (block.type === 'tariffs') {
    return (
      <div className="lr-tariffs">
        {block.items.map((tariff) => (
          <div key={tariff.id} className={`lr-tariff${tariff.none ? ' lr-tariff--none' : ''}`} data-tariff={tariff.id}>
            <span className="lr-tariff__k">{tariff.k}</span>
            <span className="lr-tariff__plans">{tariff.plans}</span>
            <span className="lr-tariff__v">{tariff.v}</span>
            <span className="lr-tariff__d">{tariff.d}</span>
          </div>
        ))}
      </div>
    )
  }
  if (block.type === 'split') {
    return (
      <div className="lr-split">
        {block.cols.map((col) => (
          <div key={col.h} className="lr-split__col">
            <h4 className="lr-split__h">{col.h}</h4>
            <ul className="lr-card__list">
              {col.items.map((item, i) => <li key={i}><Rich text={item} /></li>)}
            </ul>
          </div>
        ))}
      </div>
    )
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
  return <p className="lr-card__p"><Rich text={block.text} /></p>
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
          {section.blocks.map((block, j) => <Block key={j} block={block} rules={rules} lang={lang} />)}
        </section>
      ))}

      <section className="lr__closing">
        <h3 className="lr__closing-title">{rules.closing.title}</h3>
        <ul className="lr__closing-list">
          {rules.closing.items.map((item) => <li key={item}>{item}</li>)}
        </ul>
        <p className="lr__sign">{rules.closing.sign}</p>
      </section>

      <p className="lr__foot">{rules.footer}</p>
    </article>
  )
}
