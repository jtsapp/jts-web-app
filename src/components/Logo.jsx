// Текстовый логотип "just to study"

export default function Logo({ variant = 'dark' }) {
  const color = variant === 'light' ? '#ffffff' : '#9047ff'
  return (
    <span className="logo" style={{ color }}>
      just to study
    </span>
  )
}
