// Белая карточка раздела IELTS (рамка #ededf2, радиус 20). Заголовок и правый
// угол (чип, кнопка) — по желанию; `title` level задаёт размер: 'lg' — 20px
// («План на день», «Путь до экзамена»), 'md' — 16px («Текущий балл»).
export default function Card({ title, titleSize = 'md', aside, className = '', children, ...rest }) {
  return (
    <section className={`ih-card ${className}`.trim()} {...rest}>
      {(title || aside) && (
        <header className="ih-card__head">
          {title && <h2 className={`ih-card__title ih-card__title--${titleSize}`}>{title}</h2>}
          {aside && <div className="ih-card__aside">{aside}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
