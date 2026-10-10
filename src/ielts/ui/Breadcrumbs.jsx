import { ChevronRightIcon } from '../icons.jsx'

// «Обучение › Reading › Задания»: все звенья, кроме последнего, — кнопки назад по пути.
export default function Breadcrumbs({ items }) {
  return (
    <nav className="ih-crumbs" aria-label="breadcrumbs">
      {items.map((it, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} className="ih-crumbs__item">
            {last || !it.onClick ? (
              <span className={last ? 'ih-crumbs__current' : undefined} aria-current={last ? 'page' : undefined}>
                {it.label}
              </span>
            ) : (
              <button type="button" onClick={it.onClick}>
                {it.label}
              </button>
            )}
            {!last && <ChevronRightIcon size={16} />}
          </span>
        )
      })}
    </nav>
  )
}
