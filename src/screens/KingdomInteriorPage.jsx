import { useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'

// Оболочка интерьера королевства. Пока статичная: сайдбар + шапка + заглушка.
// Лента уроков («печеньки» + HTML-контент) появится, когда данные пойдут из dev-admin.
export default function KingdomInteriorPage({ kingdom, userName, userLevel, onBack }) {
  const { t } = useI18n()
  const [active, setActive] = useState('learning')
  const k = kingdom || { id: 'sunhaven', name: 'Sunhaven', level: 'A1' }

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active={active}
      onNav={setActive}
      onProfile={onBack}
    >
      <div className="li-top">
        <button className="li-back" onClick={onBack}>
          <ChevronLeftIcon size={18} />
          {t('common.back')}
        </button>
        <div className="li-crumb">
          <b>{t('kingdom.title', { name: k.name })}</b>
          <span>{t('kingdom.levelBadge', { label: k.level })}</span>
        </div>
      </div>

      <div className="li-empty">
        <img className="li-empty__art" src={`/assets/world/kings/${k.id}.jpg`} alt={k.name} />
        <div className="li-empty__title">{t('kingdom.empty')}</div>
        <div className="li-empty__sub">
          {t('kingdom.king', { name: k.king || '—' })}
        </div>
      </div>
    </LearningLayout>
  )
}
