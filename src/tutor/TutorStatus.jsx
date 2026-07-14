import { useT } from '../i18n/LanguageContext.jsx'

// Шапка «статус-экранов» тьютора: аватар + имя/роль + крупный заголовок.
// Используется на экранах загрузки и подготовки обучения.
export default function TutorStatus({
  avatar = '/tutor/tutor-spark.png',
  name = 'Спарк',
  role,
  heading,
  headingColor = 'var(--t-purple)',
  flow = false,
  padTop = 88,
  pulse = false,
  dots = false,
  children,
}) {
  const t = useT()
  const roleLabel = role ?? t('role.tutor')
  // При dots=true отрезаем вшитый хвост «...»/«…» и рисуем анимированные точки.
  const headText = dots ? heading.replace(/[.…]+\s*$/, '') : heading
  return (
    <div
      className={'t-status' + (flow ? ' t-status--flow' : '')}
      style={flow ? { paddingTop: padTop } : undefined}
    >
      <div className="t-status__head">
        <img
          className={'t-status__avatar' + (pulse ? ' t-status__avatar--pulse' : '')}
          src={avatar}
          alt=""
        />
        <div className="t-status__meta">
          <span className="t-status__name">{name}</span>
          <span className="t-status__role">{roleLabel}</span>
        </div>
      </div>
      <h1 className="t-status__heading" style={{ color: headingColor }}>
        {headText}
        {dots && <span className="t-status__dots" aria-hidden="true" />}
      </h1>
      {children}
    </div>
  )
}
