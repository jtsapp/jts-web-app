// Карточка с 3D-маскотом: белый скруглённый блок, слева фиолетовая панель
// с выступающим маскотом, справа — контент (заголовок, кнопки и т.п.).
export default function MascotCard({ children }) {
  return (
    <div className="t-card">
      <div className="t-card__panel" />
      <img className="t-card__mascot" src="/tutor/mascot.png" alt="" />
      <div className="t-card__content">{children}</div>
    </div>
  )
}
