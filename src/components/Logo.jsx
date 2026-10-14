// Текстовый логотип "just to study"

// «to» — отдельным span: в знаке бренда это облачко диалога своим цветом
// (на тёмном фоне — жёлтое, src/theme-dark.css). В светлой теме span
// наследует цвет и знак выглядит как раньше.
export default function Logo({ variant = 'dark' }) {
  const color = variant === 'light' ? '#ffffff' : '#9047ff'
  return (
    <span className="logo" style={{ color }}>
      just <span className="logo__to">to</span> study
    </span>
  )
}
