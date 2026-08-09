// Баннер-вставка в ленте шагов: текст + маскот на плоской заливке.
//
// Заливка задаётся инлайном, чтобы экстрактор (№2) мог подставить свой цвет
// без правки CSS. Раньше здесь был градиент — спека классрума запрещает их
// отдельным правилом («все заливки плоские, одним цветом»), поэтому осталась
// одна краска; дефолт совпадает с акцентом --lw-primary.
const DEFAULT_COLOR = '#9047ff'

export default function BannerBlock({ block }) {
  const title = block?.title || ''
  return (
    <div className="lw-banner" style={{ background: block?.color || DEFAULT_COLOR }}>
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
