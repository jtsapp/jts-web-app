// Фиолетовый баннер шага — рецепт формы/тени/скругления как у `.kh-hero`
// (см. src/styles.css), но собственный класс `.lw-banner`: без шапки-пилюли
// навигации, только текст + маскот. Градиент — инлайном (см. дизайн-документ),
// чтобы будущий экстрактор (№2) мог подставлять свой цвет без правки CSS.

const GRADIENT = 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.10)), #9047ff'

export default function BannerBlock({ block }) {
  const title = block?.title || ''
  return (
    <div className="lw-banner" style={{ background: GRADIENT }}>
      <div className="lw-banner__text">{title}</div>
      <img
        className="lw-banner__mascot"
        src={block?.mascot || '/assets/dexter.png'}
        alt=""
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    </div>
  )
}
