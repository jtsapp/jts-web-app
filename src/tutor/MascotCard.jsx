// Карточка с 3D-маскотом: белый скруглённый блок, слева фиолетовая панель
// с выступающим маскотом, справа — контент (заголовок, кнопки и т.п.).
// Маскот живёт внутри панели: и на десктопе, и на мобиле он позиционируется
// от её угла, а мобильная вёрстка ещё и клипает его её границами.
export default function MascotCard({ children }) {
  return (
    <div className="t-card">
      <div className="t-card__panel">
        <img className="t-card__mascot" src="/tutor/mascot.png" alt="" />
      </div>
      <div className="t-card__content">{children}</div>
    </div>
  )
}
