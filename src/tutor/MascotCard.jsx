import { TUTORS } from './tutors.js'
import { useT } from '../i18n/LanguageContext.jsx'

// Карточка с 3D-маскотом: белый скруглённый блок, слева фиолетовая панель
// с выступающим маскотом, справа — контент (заголовок, кнопки и т.п.).
// На десктопе в панели статичная композиция маскотов; на мобиле вместо неё —
// свайп-карусель тьюторов со снапом (какой из них видим — решает CSS).
export default function MascotCard({ children }) {
  const t = useT()
  return (
    <div className="t-card">
      <div className="t-card__panel">
        <img className="t-card__mascot" src="/tutor/mascot.png" alt="" />
        <div className="t-card__carousel">
          {TUTORS.map((tt) => (
            <div className="t-card__slide" key={tt.key}>
              <img src={tt.avatar} alt="" />
              <b>{tt.name}</b>
              <span>{t('role.tutor')}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="t-card__content">{children}</div>
    </div>
  )
}
