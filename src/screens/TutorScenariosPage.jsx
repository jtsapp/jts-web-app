import { useEffect, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { getInkScenarios } from '../api.js'
import { SCENARIOS, LABEL_BY_ID } from '../tutor/scenarios.js'
import { NO_LOCK, usePassedScenarios } from '../tutor/scenarioProgress.js'

// Сценарии, полностью управляемые из админки (INK AI tutor → «Сценарии»):
// в отличие от карточек SCENARIOS выше (7 built-in сцен с фото и цепочкой
// разблокировки), эти всегда открыты и берут "роль агента" из поля setup —
// свободный текст уходит голосовому агенту напрямую (ROLEPLAY MODE), без
// структурированного markdown-файла и без правки кода агента.
function useInkScenarios() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false
    getInkScenarios()
      .then((data) => {
        if (!cancelled) setItems(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setItems([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return items
}

function inkScenarioTitle(item, lang) {
  const i18n = item.titleI18n || {}
  return i18n[lang] || i18n.en || i18n.ru || item.slug
}

export default function TutorScenariosPage({
  user,
  onNavigate,
  onProfile,
  onBack,
  onStart,
}) {
  const { t, lang } = useLang()
  const passed = usePassedScenarios()
  const inkScenarios = useInkScenarios()

  // Заперт только если точно знаем, что предыдущий не сдан.
  const lockedBy = (s) => {
    if (NO_LOCK || !s.requires || !passed) return null
    return passed.has(s.requires) ? null : s.requires
  }

  return (
    <TutorShell
      active="tutor"
      user={user}
      onNavigate={onNavigate}
      onProfile={onProfile}
      onBack={onBack}
      title={t('scen.title')}
      layout="flow"
    >
      <div className="t-scen">
        <h1 className="t-scen__title">{t('scen.heading')}</h1>

        <div className="t-scen__grid">
          {SCENARIOS.map((s) => {
            const locked = lockedBy(s)
            return (
              <div
                className={`t-scen__card${locked ? ' t-scen__card--locked' : ''}`}
                key={s.id}
              >
                <span
                  className="t-scen__img"
                  style={{ backgroundImage: `url(${s.img})` }}
                >
                  <span className="t-scenario__badge">{locked ? '🔒' : s.badge}</span>
                </span>
                <div className="t-scen__label">{s.label}</div>
                <p className="t-scen__desc">
                  {locked
                    ? t('scen.locked', { label: LABEL_BY_ID[locked] || locked })
                    : t(`scen.desc.${s.id}`)}
                </p>
                <button
                  className="t-pill t-pill--primary t-scen__btn"
                  type="button"
                  disabled={Boolean(locked)}
                  onClick={() => !locked && onStart && onStart(s.id)}
                >
                  {locked ? t('scen.lockedBtn') : t('scen.start')}
                </button>
              </div>
            )
          })}
        </div>

        {inkScenarios.length > 0 && (
          <>
            <h1 className="t-scen__title t-scen__title--admin">{t('scen.adminHeading')}</h1>
            <div className="t-scen__grid">
              {inkScenarios.map((s) => {
                const title = inkScenarioTitle(s, lang)
                return (
                  <div className="t-scen__card" key={`ink-${s.id}`}>
                    <span className="t-scen__img t-scen__img--plain">
                      <span className="t-scenario__badge">{s.emoji || '💬'}</span>
                    </span>
                    <div className="t-scen__label">{title}</div>
                    <p className="t-scen__desc">{s.level ? `CEFR ${s.level}` : ''}</p>
                    <button
                      className="t-pill t-pill--primary t-scen__btn"
                      type="button"
                      onClick={() => onStart && onStart({ prompt: s.setup, label: title })}
                    >
                      {t('scen.start')}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </TutorShell>
  )
}
