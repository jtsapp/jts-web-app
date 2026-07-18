import { useEffect, useState } from 'react'
import TutorShell from '../tutor/TutorShell.jsx'
import { useLang } from '../i18n/LanguageContext.jsx'
import { loadToken } from '../lib/session.js'
import { getDeviceId } from '../lib/identity.js'
import { getInkScenarios } from '../api.js'
import { SCENARIOS, LABEL_BY_ID } from '../tutor/scenarios.js'

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

// Локальная отмычка: NEXT_PUBLIC_SCENARIOS_NO_LOCK=1 открывает все сценарии,
// чтобы их можно было тестировать в любом порядке, не проходя цепочку. Как
// VOICE_NO_LIMIT у токен-роута. NEXT_PUBLIC_ вшивается в бандл на сборке —
// значения секретного тут нет, только флаг.
const NO_LOCK =
  process.env.NEXT_PUBLIC_SCENARIOS_NO_LOCK === '1' ||
  process.env.NEXT_PUBLIC_SCENARIOS_NO_LOCK === 'true'

/**
 * Слаги сценариев, сданных этим учеником. Источник — lesson_progress: голосовой
 * агент по концовке сцены зовёт report_task_complete, тот пишет строку через
 * /api/lesson/complete (lesson_key = scenarioId), а GET /api/profile её отдаёт.
 * Отдельного хранилища для этого не нужно.
 *
 * Возвращает null, пока прогресс не прочитан ИЛИ если прочитать не удалось (нет
 * БД, сеть, 401). Замок — подсказка по сюжету, а не защита, поэтому при
 * неизвестном прогрессе открываем всё: лучше пустить дальше, чем запереть
 * человека из-за неподнятой базы.
 */
function usePassedScenarios() {
  const [passed, setPassed] = useState(null)

  useEffect(() => {
    if (NO_LOCK) return
    let cancelled = false

    ;(async () => {
      try {
        const token = loadToken()
        const res = await fetch(`/api/profile?deviceId=${encodeURIComponent(getDeviceId())}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return // 503 без БД, 401 — оставляем null, всё открыто
        const data = await res.json().catch(() => null)
        if (cancelled || !data?.configured) return
        // Ответ получен — прогресс известен. profile === null означает «ученика в
        // базе ещё нет», то есть не сдано НИЧЕГО; это не то же самое, что
        // «прочитать не удалось», и запирать тут правильно.
        const lessons = Array.isArray(data.profile?.lessons) ? data.profile.lessons : []
        setPassed(
          new Set(lessons.filter((l) => l.status === 'passed').map((l) => l.lessonKey)),
        )
      } catch {
        // сеть отвалилась — тоже открываем всё
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return passed
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
