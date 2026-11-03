import { useCallback, useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { fetchLatestAttempt, saveAttempt } from '../../placement/api.js'
import { homeReport, SKILL_ORDER } from '../../placement/reportModel.js'
import { usePlacementCollapsed } from './placementCollapse.js'
import SpeakingTask from '../../placement/SpeakingTask.jsx'
import { retakeArgs, speakingMissing, withSpeakingResult } from '../../placement/speakingRetake.js'

/**
 * Отчёт последнего теста уровня v16 на «Главной» (указание руководителя 14.10.2026: «после теста все данные — очень
 * детальные отчёты — в этом разделе»). С редизайна «Главной» (макет «Главная · редизайн», 21.10.2026) он в двух
 * местах: карточка «Результаты теста уровня» в колонке (общий уровень и четыре навыка) и блок «Что делать дальше»
 * во всю ширину внизу (цель, на что сделать упор, задания «Практики»). Данные одни — HomePage спрашивает их один раз
 * (usePlacementReport) и раздаёт обоим. Причины и пояснения пишет сам тест на языке прохождения — показываем как есть.
 *
 * version — счётчик сохранённых итогов из App: тест сохранил новый итог — отчёт перечитывается.
 */
export function usePlacementReport(token, version = 0) {
  const { lang } = useI18n()
  // undefined — запрос ещё в пути: отметку «не пройден» до ответа не рисуем, иначе она мигала бы у прошедших тест.
  const [env, setEnv] = useState(undefined)
  // Свой счётчик перечитывания — после пересдачи говорения с «Главной» (speakingRetake.js).
  const [own, setOwn] = useState(0)
  useEffect(() => {
    if (!token) return undefined
    let alive = true
    fetchLatestAttempt(token).then((e) => {
      if (alive) setEnv(e)
    })
    return () => {
      alive = false
    }
  }, [token, version, own])
  const view = useMemo(() => homeReport(env, lang), [env, lang])
  const reload = useCallback(() => setOwn((n) => n + 1), [])
  return { loaded: env !== undefined, view, env: env || null, reload }
}

// Есть ли что показать в «Что делать дальше». Нет — блока нет, и «Пройти тест заново» переезжает в карточку итогов:
// без него пересдать тест с «Главной» было бы нечем.
function hasNext(view) {
  return !!(view && (view.goal || view.target || view.priorities.length || view.activities.length))
}

const SKILL_ICON = {
  listening: '/assets/home-v2/ico/headphones.svg',
  reading: '/assets/home-v2/ico/auto_stories.svg',
  grammar: '/assets/home-v2/ico/edit_note.svg',
  speaking: '/assets/home-v2/ico/mic.svg',
}

/**
 * «Результаты теста уровня» (макет: общий уровень плашкой с кругом 88 и четыре плитки навыков). Теста ещё нет — та же
 * карточка пустой: «Не пройден», «?» вместо уровня, плитки с прочерком и кнопка теста (решение владельца 21.10.2026:
 * непройденный тест спрашивается в этом блоке). Так у всех, кто без теста, — и у нового ученика, и у учившегося до
 * теста v16 (решение 14.10: не заставлять, но тест должен числиться непройденным).
 */
// Кнопка «Скрыть / Показать» в шапке карточки: свёрнутой остаются заголовок и статус.
function CollapseToggle({ collapsed, onToggle, bodyId }) {
  const { t } = useI18n()
  return (
    <button type="button" className="pl-report__toggle" aria-expanded={!collapsed} aria-controls={bodyId} onClick={onToggle}>
      {t(collapsed ? 'placement.report.expand' : 'placement.report.collapse')}
    </button>
  )
}

export function PlacementResults({ report, onRetake, collapseKey, token }) {
  const { t, lang } = useI18n()
  const { loaded, view } = report
  const [collapsed, toggle] = usePlacementCollapsed(collapseKey)
  // Пересдача говорения без уровня — окно говорения поверх «Главной» (решение владельца 03.11.2026).
  const [retaking, setRetaking] = useState(false)
  const [retakeFailed, setRetakeFailed] = useState(false)
  const canRetake = !!(token && report.env && speakingMissing(report.env))
  const retakeDone = async (r) => {
    setRetaking(false)
    const next = withSpeakingResult(report.env, r)
    const ok = next ? await saveAttempt(token, next) : false
    setRetakeFailed(!ok)
    if (ok) report.reload?.()
  }
  // ответа ещё нет — пусто: «Не пройден» мигал бы у прошедших тест
  if (!loaded) return null
  if (!view) {
    return (
      <section
        className={`hm-card pl-report pl-report--missing${collapsed ? ' is-collapsed' : ''}`}
        aria-labelledby="pl-missing-title"
      >
        <div className="pl-report__head">
          <h2 id="pl-missing-title" className="hm-card__title">
            {t('placement.report.title')}
          </h2>
          <span className="pl-report__status">{t('placement.report.missingStatus')}</span>
          <CollapseToggle collapsed={collapsed} onToggle={toggle} bodyId="pl-missing-body" />
        </div>

        {!collapsed && (
        <div id="pl-missing-body" className="pl-report__body">
        <div className="pl-report__overall is-empty">
          <b className="pl-report__level" aria-hidden="true">
            ?
          </b>
          <span className="pl-report__overallText">
            <span className="pl-report__label">{t('placement.report.overall')}</span>
            <span className="pl-report__name">{t('placement.report.missingLevel')}</span>
            <span className="pl-report__muted">{t('placement.report.missingSub')}</span>
          </span>
          {onRetake && (
            <button type="button" className="pl-report__cta" onClick={() => onRetake()}>
              {t('geStart.test.cta')}
            </button>
          )}
        </div>

        <ul className="pl-report__skills">
          {SKILL_ORDER.map((id) => (
            <li className="pl-report__skill is-empty" key={id}>
              <span className="pl-report__skillName">{t(`placement.skill.${id}`)}</span>
              <b className="pl-report__chip">—</b>
              <span className="pl-report__note">{t('placement.report.notAssessed')}</span>
            </li>
          ))}
        </ul>
        </div>
        )}
      </section>
    )
  }

  const date = view.completedAt ? new Date(view.completedAt) : null
  const when =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleDateString(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' })
      : null

  return (
    <section className={`hm-card pl-report${collapsed ? ' is-collapsed' : ''}`} aria-labelledby="pl-report-title">
      <div className="pl-report__head">
        <h2 id="pl-report-title" className="hm-card__title">
          {t('placement.report.title')}
        </h2>
        {when && <span className="pl-report__date">{when}</span>}
        <CollapseToggle collapsed={collapsed} onToggle={toggle} bodyId="pl-report-body" />
      </div>

      {!collapsed && (
      <div id="pl-report-body" className="pl-report__body">
      <div className={`pl-report__overall${view.foundation ? ' is-foundation' : ''}`}>
        <b className="pl-report__level">{view.foundation ? 'Foundation' : view.overall}</b>
        <span className="pl-report__overallText">
          <span className="pl-report__label">{t('placement.report.overall')}</span>
          <span className="pl-report__name">{view.foundation ? t('placement.report.foundation') : t(`cefr.${view.overall}`)}</span>
          {view.foundation && <span className="pl-report__muted">{t('placement.report.foundationSub')}</span>}
          {view.partial && <span className="pl-report__tag">{t('placement.report.partial')}</span>}
        </span>
      </div>

      <ul className="pl-report__skills">
        {view.skills.map((s) => (
          <li className={`pl-report__skill${s.assessed ? '' : ' is-empty'}`} key={s.id}>
            <span className="pl-report__skillName">{t(`placement.skill.${s.id}`)}</span>
            <b className="pl-report__chip">{s.level || '—'}</b>
            {s.id === 'S' && !s.assessed && canRetake && (
              <button type="button" className="pl-report__retakeS" onClick={() => setRetaking(true)} data-testid="speaking-retake">
                {t('placement.report.speakingRetake')}
              </button>
            )}
            <span className="pl-report__note">
              {/* Отвечал, но уровень не подтвердился — это не «не пройдено»: показываем ответы (пометка «нужно подтвердить» ниже). */}
              {s.total
                ? t('placement.report.correct', { correct: String(s.correct ?? 0), total: String(s.total) })
                : !s.assessed
                  ? t(s.id === 'S' ? 'placement.report.notAssessedS' : 'placement.report.notAssessed')
                  : ''}
              {s.confirmed === false && <em> · {t('placement.report.unconfirmed')}</em>}
            </span>
          </li>
        ))}
      </ul>
      {retakeFailed && (
        <p className="pl-report__retakeErr" role="alert">
          {t('placement.report.retakeFailed')}
        </p>
      )}

      {/* Отзыв о говорении — в отчёте рядом с уровнями (жалоба 16.10.2026: раньше он выходил посреди теста). В макете
          его нет, но без него ученик не узнал бы, что сказал грейдер. */}
      {view.speaking && (
        <div className="pl-report__block">
          <h3 className="pl-report__h">{t('placement.report.speaking')}</h3>
          {view.speaking.summary && <p className="pl-report__speakSummary">{view.speaking.summary}</p>}
          {view.speaking.strengths.length > 0 && (
            <>
              <p className="pl-report__label">{t('placement.report.speakingGood')}</p>
              <ul className="pl-report__list">
                {view.speaking.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
          {view.speaking.improvements.length > 0 && (
            <>
              <p className="pl-report__label">{t('placement.report.speakingWork')}</p>
              <ul className="pl-report__list">
                {view.speaking.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {onRetake && !hasNext(view) && (
        <button type="button" className="pl-report__retake" onClick={onRetake}>
          {t('placement.report.retake')}
        </button>
      )}
      </div>
      )}
      {retaking && (
        <SpeakingTask token={token} args={retakeArgs(report.env)} onDone={retakeDone} onSkip={() => setRetaking(false)} />
      )}
    </section>
  )
}

// Раздел задания — по пути выбора в каталоге v16 («Аудирование → …»): значок карточки и метка раздела.
function activityArea(a) {
  const head = String(a.path?.[0] || '').toLowerCase()
  if (/аудир|тыңда|listen/.test(head)) return 'listening'
  if (/чтен|оқу|read/.test(head)) return 'reading'
  if (/говор|сөйле|speak/.test(head)) return 'speaking'
  return 'grammar'
}

/**
 * «Что делать дальше» (макет: шапка с «Пройти тест заново», цель плашкой с целевым уровнем справа, слева «На что
 * сделать упор» нумерованным списком, справа «Задания для вас» карточками 2×2).
 */
export function PlacementNext({ report, onNav, onRetake }) {
  const { t } = useI18n()
  const { view } = report
  if (!hasNext(view)) return null
  return (
    <section className="hm-card pl-next" aria-labelledby="pl-next-title">
      <div className="pl-next__head">
        <div>
          <h2 id="pl-next-title" className="hm-card__title">
            {t('placement.next.title')}
          </h2>
          <p className="pl-next__sub">{t('placement.next.sub')}</p>
        </div>
        {onRetake && (
          <button type="button" className="pl-next__retake" onClick={onRetake}>
            {t('placement.report.retake')}
          </button>
        )}
      </div>

      {(view.goal || view.target) && (
        <div className="pl-next__goal">
          <span className="pl-next__plate" aria-hidden="true" />
          <div className="pl-next__goalText">
            <span className="pl-next__label">{t('placement.next.goal')}</span>
            <b>{view.goal || t('placement.next.noGoal')}</b>
            {view.targetExplanation && <span className="pl-next__why">{view.targetExplanation}</span>}
          </div>
          {view.target && (
            <div className="pl-next__target">
              <span className="pl-next__label">{t('placement.next.target')}</span>
              <b>{view.target}</b>
              {view.targetAlreadyMet && <span className="pl-next__met">{t('placement.report.targetMet')}</span>}
            </div>
          )}
        </div>
      )}

      <div className="pl-next__cols">
        {view.priorities.length > 0 && (
          <div className="pl-next__prios">
            <h3 className="pl-next__h">{t('placement.report.priorities')}</h3>
            {view.goal && <p className="pl-next__hint">{t('placement.next.forGoal', { goal: view.goal })}</p>}
            <ol className="pl-next__prioList">
              {view.priorities.map((p, i) => (
                <li className="pl-next__prio" key={p.id || p.title}>
                  <span className="pl-next__num">{i + 1}</span>
                  <span className="pl-next__prioText">
                    <b>{p.title}</b>
                    {p.reason && <span>{p.reason}</span>}
                    {p.note && <small>{p.note}</small>}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {view.activities.length > 0 && (
          <div className="pl-next__recs">
            <h3 className="pl-next__h">{t('placement.report.activities')}</h3>
            {view.goal && <p className="pl-next__hint">{t('placement.next.recsFor', { goal: view.goal })}</p>}
            <div className="pl-next__recGrid">
              {view.activities.map((a) => {
                const area = activityArea(a)
                return (
                  <button
                    type="button"
                    className="pl-report__act pl-next__rec"
                    key={a.id || a.title}
                    onClick={() => onNav?.(a.nav.key, a.nav.payload)}
                  >
                    <span className="pl-next__recHead">
                      <img src={SKILL_ICON[area]} alt="" width="24" height="24" />
                      <span className="pl-report__actTitle">{a.title}</span>
                      <span className="pl-next__go" aria-hidden="true" />
                    </span>
                    <span className="pl-next__chips">
                      {a.level && <span className="pl-next__chip is-level">{a.level}</span>}
                      {a.minutes ? <span className="pl-next__chip">{t('placement.report.minutes', { n: String(a.minutes) })}</span> : null}
                      <span className="pl-next__chip">{t(`placement.next.area.${area}`)}</span>
                    </span>
                    {a.reason && <span className="pl-report__actWhy">{a.reason}</span>}
                    {a.path.length > 0 && <span className="pl-report__actPath">{a.path.join(' → ')}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
