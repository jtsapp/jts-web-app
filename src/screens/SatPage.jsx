import { useEffect, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import Tabs from '../ielts/ui/Tabs.jsx'
import EmptyState from '../ielts/ui/EmptyState.jsx'
import PillButton from '../ielts/ui/PillButton.jsx'
import GuideTab from '../sat/tabs/GuideTab.jsx'
import PlanTab from '../sat/tabs/PlanTab.jsx'
import TodayTab from '../sat/tabs/TodayTab.jsx'
import PracticeTab from '../sat/tabs/PracticeTab.jsx'
import ErrorsTab from '../sat/tabs/ErrorsTab.jsx'
import MocksTab from '../sat/tabs/MocksTab.jsx'
import MaterialsTab from '../sat/tabs/MaterialsTab.jsx'
import VocabTab from '../sat/tabs/VocabTab.jsx'
import { getSatDiagnostic, getSatMe, getSatPlan, getSatProfile, getSatToday, startSatSession, updateSatLesson } from '../api.js'
import SatStartView from '../sat/tabs/SatStartView.jsx'
import { loadToken } from '../lib/session.js'
import { plural } from '../lib/plural.js'
import { daysUntil } from '../sat/model/profile.js'
import { useI18n } from '../i18n.jsx'
import { EventIcon, MenuBookIcon, QuizIcon } from '../ielts/icons.jsx'
import { FireIcon, TargetIcon } from '../sat/icons.jsx'
import { fmtDate } from '../sat/model/dates.js'
import ExamDemoBanner from '../components/ExamDemoBanner.jsx'
import { errorText } from '../lib/examQuota.js'

// Вкладки хаба: из Figma (решение 1 доски) + «Материалы» и «Ошибки» (решение C плана). «Прогресс» убран (B4): его меры —
// на дашборде «Сегодня»; старый адрес ?satTab=progress открывает «Сегодня». Past papers — свой экран, вход — из «Пробников».
export const SAT_TABS = ['today', 'plan', 'practice', 'mocks', 'vocab', 'guide', 'materials', 'errors']
const SOON_ICON = {}

function readTab() {
  try {
    const v = new URLSearchParams(window.location.search).get('satTab')
    return SAT_TABS.includes(v) ? v : 'today'
  } catch {
    return 'today'
  }
}

function writeTab(tab) {
  try {
    const url = new URL(window.location.href)
    if (tab && tab !== 'today') url.searchParams.set('satTab', tab)
    else url.searchParams.delete('satTab')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории — просто не пишем */
  }
}

/**
 * Хаб SAT (Figma SAT 11–20): шапка «SAT · Digital · Bluebook» с целью и датой, вкладки раздела. Работают «Сегодня»,
 * «План», «Практика», «Пробники» (фаза 7), «Прогресс», «Словарь» (фаза 9), «Гайд» (с гидом по Desmos), «Материалы»
 * (фаза 8) и «Ошибки» (docs/sat/PLAN.md).
 */
export default function SatPage({ token, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [tab, setTab] = useState('today')
  const [moved, setMoved] = useState(false)
  const [profile, setProfile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [diagnostic, setDiagnostic] = useState(null)
  const [busy, setBusy] = useState(false)
  const [today, setToday] = useState(null)
  const [error, setError] = useState(null)
  // шаги старта и доступ (V341): пока что-то не пройдено, вместо вкладок — экран старта
  const [me, setMe] = useState(null)

  // вкладку из адреса читаем после монтирования: иначе сервер и клиент нарисуют разное (как у IELTS)
  useEffect(() => {
    setTab(readTab())
    // из онбординга приходим с его прокруткой — хаб начинается сверху
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    let alive = true
    // без ответа «me» считаем, что старт пройден: экран просто покажет ошибки вкладок, а не запрёт ученика с доступом
    getSatMe(authToken)
      .then((m) => alive && setMe(m))
      .catch(() => alive && setMe({ access: true, onboarded: true, diagnosticDone: true }))
    getSatProfile(authToken)
      .then((p) => alive && setProfile(p))
      .catch(() => alive && setProfile({ exists: false }))
    getSatPlan(authToken)
      .then((p) => alive && setPlan(p))
      .catch(() => alive && setPlan({ exists: false }))
    getSatDiagnostic(authToken)
      .then((d) => alive && setDiagnostic(d))
      .catch(() => alive && setDiagnostic({ status: 'none' }))
    return () => {
      alive = false
    }
  }, [authToken])

  // «Сегодня» закрыто замком — спрашиваем, только когда доступ есть (иначе 403 на каждый заход)
  useEffect(() => {
    if (!me?.access) return
    let alive = true
    getSatToday(authToken)
      .then((d) => alive && setToday(d))
      .catch(() => alive && setToday({}))
    return () => {
      alive = false
    }
  }, [authToken, me?.access])

  const go = (next) => {
    // Past papers — свой экран во всё окно, без сайдбара (B6)
    if (next === 'papers') {
      onNav?.('sat-papers')
      return
    }
    setMoved(true)
    setTab(next)
    writeTab(next)
  }

  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const dateChip = profile?.examDate
    ? `${fmtDate(loc, new Date(`${profile.examDate}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${plural(t, lang, 'sat.daysLeft', Math.max(0, daysUntil(profile.examDate)))}`
    : profile?.dateUndecided
      ? t('sat.dateUndecided')
      : null

  // в диагностику — на нужный шаг (?satDiag=time — время на занятия после сданной диагностики)
  const toDiagnostic = (step) => {
    try {
      const url = new URL(window.location.href)
      if (step) url.searchParams.set('satDiag', step)
      else url.searchParams.delete('satDiag')
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* шаг выберет сам экран */
    }
    onNav?.('sat-diagnostic')
  }

  // занятие плана → учебная сессия (фаза 5); сервер продолжит начатую, если она есть
  const startLesson = (lessonId) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satLesson', lessonId)
      url.searchParams.delete('satSession')
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* без адреса занятие не откроется — кнопка ничего не сделает */
    }
    onNav?.('sat-study')
  }

  // любая сессия по адресу (?satSession=) — продолжить или открыть только что собранную
  const openSession = (id) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satSession', id)
      url.searchParams.delete('satLesson')
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* без адреса сессия не откроется */
    }
    onNav?.('sat-study')
  }

  // прохождение пробника и его разбор — свои экраны без меню, прохождение держится в ?satMock=
  const openMock = (id, screen = 'sat-mock') => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satMock', id)
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* без адреса прохождение не откроется */
    }
    onNav?.(screen)
  }

  // юнит курса — свой экран во всё окно, код в ?satUnit=
  const openUnit = (code) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satUnit', code)
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* без адреса юнит не откроется */
    }
    onNav?.('sat-unit')
  }

  // практика из конструктора, карты навыков или повтор ошибок: сервер собирает набор, экран сессии его открывает
  const startPractice = async (body) => {
    const s = await startSatSession(authToken, body)
    openSession(s.id)
  }

  const review = async () => {
    setError(null)
    try {
      await startPractice({ mode: 'review', count: 20 })
    } catch (e) {
      setError(errorText(e, t))
    }
  }

  const onLesson = async (id, body) => {
    setBusy(true)
    try {
      setPlan(await updateSatLesson(authToken, id, body))
    } finally {
      setBusy(false)
    }
  }

  let panel
  if (tab === 'guide') panel = <GuideTab />
  else if (tab === 'plan') {
    panel = !plan || !diagnostic ? null : (
      <PlanTab plan={plan} diagnostic={diagnostic} busy={busy} onLesson={onLesson} onStart={startLesson} onRebuild={() => toDiagnostic('time')} onDiagnostic={toDiagnostic} onUnit={openUnit} />
    )
  } else if (tab === 'today') {
    panel = !profile || !plan || !diagnostic || !today ? null : todayPanel()
  } else if (tab === 'practice') {
    panel = <PracticeTab onStart={startPractice} />
  } else if (tab === 'mocks') {
    panel = (
      <MocksTab
        target={profile?.targetTotal ?? null}
        onOpenRun={(id) => openMock(id)}
        onReview={(id) => openMock(id, 'sat-mock-review')}
        onPapers={() => onNav?.('sat-papers')}
        onPricing={() => onNav?.('sat-pricing')}
      />
    )
  } else if (tab === 'vocab') {
    panel = <VocabTab />
  } else if (tab === 'materials') {
    panel = <MaterialsTab onOpen={(code) => openUnit(code)} />
  } else if (tab === 'errors') {
    panel = <ErrorsTab onReview={review} />
  } else {
    const Icon = SOON_ICON[tab] || QuizIcon
    panel = <EmptyState icon={<Icon size={28} />} title={t('sat.soon.title')} text={t(`sat.soon.${tab}`)} />
  }

  // «Сегодня» до фазы 6: один следующий шаг старта. Нет в Figma — макет 11 рисует день с готовым планом.
  function todayPanel() {
    if (!profile.onboardingStepsDone) {
      return (
        <EmptyState
          icon={<MenuBookIcon size={28} />}
          title={t('sat.start.title')}
          text={t('sat.start.text')}
          action={<PillButton variant="primary" onClick={() => onNav?.('sat-onboarding')}>{t(profile.exists ? 'sat.start.continue' : 'sat.start.cta')}</PillButton>}
        />
      )
    }
    if (diagnostic.status !== 'finished') {
      const active = diagnostic.status === 'active'
      return (
        <EmptyState
          icon={<QuizIcon size={28} />}
          title={t('sat.diag.title')}
          text={t('sat.diag.text')}
          action={
            <div className="st-today__acts">
              <PillButton variant="primary" onClick={() => toDiagnostic(null)}>{t(active ? 'sat.dx.continue' : 'sat.dx.start')}</PillButton>
              <PillButton variant="outline" onClick={() => go('guide')}>{t('sat.diag.reread')}</PillButton>
            </div>
          }
        />
      )
    }
    if (!plan.exists) {
      return (
        <EmptyState
          icon={<EventIcon size={28} />}
          title={t('sat.plan.noPlanTime')}
          text={t('sat.plan.noPlanTimeText')}
          action={
            <div className="st-today__acts">
              <PillButton variant="primary" onClick={() => toDiagnostic('time')}>{t('sat.plan.toTime')}</PillButton>
              <PillButton variant="outline" onClick={() => toDiagnostic('report')}>{t('sat.today.report')}</PillButton>
            </div>
          }
        />
      )
    }
    return (
      <TodayTab
        today={today}
        plan={plan}
        diagnostic={diagnostic}
        onStart={startLesson}
        onResume={openSession}
        onReview={review}
        onWeekly={() => onNav?.('sat-weekly')}
        onPlan={() => go('plan')}
        onVocab={() => go('vocab')}
        onErrors={() => go('errors')}
        onMocks={() => go('mocks')}
      />
    )
  }

  // Старт обязателен: без глав об экзамене и диагностики (после них доступ открывается сам) вкладок нет вовсе (просьба владельца
  // 13.10.2026). Пока «me» не пришёл — рисуем шапку без вкладок, а не мигаем вкладками перед замком.
  const started = me && me.access && me.onboarded && me.diagnosticDone
  if (!started) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="sat" token={token} onNav={onNav} onProfile={onProfile}>
        <div className="ih st">
          <header className="st-header">
            <h1>SAT</h1>
            <span className="st-header__kind">{t('sat.digital')}</span>
          </header>
          <ExamDemoBanner exam="sat" token={authToken} demo={me?.demo} onPricing={() => onNav?.('sat-pricing')} />
          {me && (
            <SatStartView
              me={me}
              onOnboarding={() => onNav?.('sat-onboarding')}
              onDiagnostic={() => toDiagnostic(null)}
              onResults={() => toDiagnostic('report')}
              onPricing={() => onNav?.('sat-pricing')}
            />
          )}
        </div>
      </LearningLayout>
    )
  }

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="sat" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ih st">
        <header className="st-header">
          <h1>SAT</h1>
          <span className="st-header__kind">{t('sat.digital')}</span>
          <span className="st-spacer" />
          {profile?.targetTotal != null && (
            <span className="ih-chip ih-chip--violet ih-chip--md"><span><TargetIcon size={16} />{t('sat.goalChip', { n: String(profile.targetTotal) })}</span></span>
          )}
          {dateChip && <span className="st-header__date"><EventIcon size={16} />{dateChip}</span>}
          {today?.streak?.current > 0 && (
            <span className="st-header__streak"><FireIcon size={16} />{plural(t, lang, 'sat.streakChip', today.streak.current)}</span>
          )}
        </header>
        <ExamDemoBanner exam="sat" token={authToken} demo={me?.demo} onPricing={() => onNav?.('sat-pricing')} />
        <Tabs items={SAT_TABS.map((k) => ({ key: k, label: t(`sat.tab.${k}`) }))} value={tab} onChange={go} idBase="st" label="SAT" />
        {error && <p className="st-error" role="alert">{error}</p>}
        <div key={tab} role="tabpanel" id={`st-panel-${tab}`} aria-labelledby={`st-tab-${tab}`} className={moved ? 'st__panel ih-enter' : 'st__panel'}>
          {panel}
        </div>
      </div>
    </LearningLayout>
  )
}
