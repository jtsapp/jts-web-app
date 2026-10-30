// Значок экспортом из Figma («Mobile» → «Профиль», public/assets/m/profile/ico/) маской, а не картинкой: цвет задаёт
// CSS (currentColor плашки), поэтому тёмная тема перекрашивает его токенами, как значки сайдбара (.sb__ico).
export function MaskIcon({ name, className = '' }) {
  return (
    <i
      className={`pf-mi ${className}`}
      style={{ '--pf-mi': `url(/assets/m/profile/ico/${name}.svg)` }}
      aria-hidden="true"
    />
  )
}
