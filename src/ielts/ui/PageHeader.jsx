// Заголовок страницы раздела по дизайну «IELTS new»: крупное название (40/800), под ним программа и чип формата
// обучения; справа — переключатель вида (у «Плана») или пусто.
export default function PageHeader({ title, sub, chip, right }) {
  return (
    <header className="ih-ph">
      <div className="ih-ph__text">
        <h1 className="ih-ph__title">{title}</h1>
        {(sub || chip) && (
          <div className="ih-ph__row">
            {sub && <span className="ih-ph__sub">{sub}</span>}
            {chip && <span className="ih-ph__chip">{chip}</span>}
          </div>
        )}
      </div>
      {right && <div className="ih-ph__right">{right}</div>}
    </header>
  )
}
