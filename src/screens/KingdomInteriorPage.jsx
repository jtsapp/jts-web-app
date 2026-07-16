import LearningLayout from '../components/LearningLayout.jsx'
import { ChevronLeftIcon } from '../components/icons.jsx'
import { useI18n } from '../i18n.jsx'

// Иконка башни/замка для «хлебной крошки» королевства (currentColor).
function CastleIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 21V8l2 1.2V5l2.3 1.4V3l1.7 1V3h4v1l1.7-1v2.4L20 5v4.2L22 8v13H4z"
        fill="currentColor"
      />
      <path d="M10 21v-3.5a2 2 0 1 1 4 0V21" fill="#fff" opacity=".85" />
    </svg>
  )
}

// Интерьер королевства. Оболочка и «шапка-герой» повторяют дизайн из Figma
// (node 1458:161). Лента юнитов (Lead-In / Unit / Final) и HTML-блоки
// («Печеньки») приходят из ВЕБ-Админа — здесь оставлены нативные места:
// `units` по умолчанию пуст, разметка/стили готовы принять данные.
export default function KingdomInteriorPage({
  kingdom,
  userName,
  userLevel,
  onBack,
  onNav,
  progress, // { done, total } — из ВЕБ-Админа
  units = [], // лента юнитов — из ВЕБ-Админа (пока пусто)
}) {
  const { t } = useI18n()
  const k = kingdom || { id: 'sunhaven', name: 'Sunhaven', king: 'Майкл Флот', level: 'A1' }

  const done = progress?.done
  const total = progress?.total
  const hasProgress = done != null && total != null

  return (
    <LearningLayout
      userName={userName}
      userLevel={userLevel}
      active="learning"
      onNav={onNav}
      onProfile={() => {}}
    >
      {/* Верхняя полоса: назад + королевство/уровень */}
      <div className="ki-top">
        <button className="ki-back" type="button" onClick={onBack}>
          <ChevronLeftIcon size={18} />
          {t('common.back')}
        </button>
        <span className="ki-top__castle">
          <CastleIcon size={22} />
        </span>
        <div className="ki-crumb">
          <b>{t('kingdom.title', { name: k.name })}</b>
          <span>{t('kingdom.levelBadge', { label: k.level })}</span>
        </div>
      </div>

      <div className="ki">
        {/* Герой королевства */}
        <div className="ki-hero">
          <img
            className="ki-hero__img"
            src={`/assets/world/kings/${k.id}.jpg`}
            alt={k.name}
          />
          <span className="ki-hero__scrim" />
          <div className="ki-hero__meta">
            <div className="ki-hero__king">
              <img
                className="ki-hero__av"
                src={`/assets/world/kings/${k.id}.jpg`}
                alt=""
              />
              <span>{t('kingdom.king', { name: k.king || '—' })}</span>
            </div>
            <div className="ki-hero__level">{t('kingdom.levelBadge', { label: k.level })}</div>
          </div>
          {hasProgress && (
            <span className="ki-hero__ring">
              <b>{done}/{total}</b>
            </span>
          )}
        </div>

        {/* Лента юнитов + HTML-контент из ВЕБ-Админа.
            Нативное место: разметка готова, данные подставит админка. */}
        <div className="ki-feed">
          {units.map((u) => (
            <div className="ki-group" key={u.id}>
              <div className="ki-unit" style={{ '--row': u.color || '#5b6efa' }}>
                <span className="ki-unit__ic">{u.emoji}</span>
                <span className="ki-unit__meta">
                  <b>{u.title}</b>
                  <span>{u.subtitle}</span>
                </span>
                <span className="ki-unit__count">
                  {u.done ?? 0}/{u.total ?? 1}
                </span>
              </div>
              {/* Блок «Печеньки» — HTML из админки (пока нативное пустое место) */}
              <div className="ki-slot" />
            </div>
          ))}
        </div>
      </div>
    </LearningLayout>
  )
}
