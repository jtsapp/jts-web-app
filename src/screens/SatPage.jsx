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
import ProgressTab from '../sat/tabs/ProgressTab.jsx'
import { getSatBluebook, getSatDiagnostic, getSatMe, getSatProfile, getSatRoadmap, getSatSchedule, getSatToday, startSatSession } from '../api.js'
import SatStartView from '../sat/tabs/SatStartView.jsx'
import { satStarted } from '../sat/model/start.js'
import { loadToken } from '../lib/session.js'
import { plural } from '../lib/plural.js'
import { daysUntil } from '../sat/model/profile.js'
import { TODAY_SIZE, moduleSize } from '../sat/model/practice.js'
import { skillSection } from '../sat/names.js'
import { useI18n } from '../i18n.jsx'
import { EventIcon, MenuBookIcon, QuizIcon } from '../ielts/icons.jsx'
import { FireIcon, TargetIcon } from '../sat/icons.jsx'
import { fmtDate } from '../sat/model/dates.js'
import ExamDemoBanner from '../components/ExamDemoBanner.jsx'
import { errorText } from '../lib/examQuota.js'

// Вкладки хаба: из Figma (решение 1 доски) + «Материалы» и «Ошибки» (решение C плана). «Прогресс» вернулся по Figma 16
// (15.10.2026), «Словаря» во вкладках больше нет — в макете его нет. Past papers — свой экран, вход — из «Пробников».
// «Материалы» скрыты (вкладка и экран остаются в коде): адрес с satTab=materials открывает «Сегодня». «Ошибки» вернулись
// в меню страницей «Работа над ошибками» (ТЗ 21.10, задача 9); «Пробники» перед ними — порядок макета «NEW 2» (30.10)
export const SAT_TABS = ['today', 'plan', 'practice', 'mocks', 'errors', 'progress', 'guide']
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
 * «План», «Практика», «Пробники» (фаза 7), «Прогресс», «Гайд» (с гидом по Desmos), «Материалы»
 * (фаза 8) и «Ошибки» (docs/sat/PLAN.md).
 */
export default function SatPage({ token, userName, userLevel, onNav, onProfile }) {
  const { t, lang } = useI18n()
  const authToken = token || loadToken()
  const [tab, setTab] = useState('today')
  const [moved, setMoved] = useState(false)
  const [profile, setProfile] = useState(null)
  const [diagnostic, setDiagnostic] = useState(null)
  const [today, setToday] = useState(null)
  // фазы плана, расписание группы и Bluebook-тесты (ТЗ 21.10, задачи 1 и 15) — один источник для «Сегодня» и «Плана»
  const [roadmap, setRoadmap] = useState(null)
  const [schedule, setSchedule] = useState(null)
  const [bluebook, setBluebook] = useState(null)
  // «N ошибок в очереди» у навыка ведёт на страницу ошибок с фильтром по этому навыку (задача 9)
  const [errorSkill, setErrorSkill] = useState(null)
  // режим, в котором открыть «Практику» (фаза 7 «Сегодня»: банк — «Все вопросы», слабые домены — «Слабые»)
  const [practiceMode, setPracticeMode] = useState(null)
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
    getSatDiagnostic(authToken)
      .then((d) => alive && setDiagnostic(d))
      .catch(() => alive && setDiagnostic({ status: 'none' }))
    return () => {
      alive = false
    }
  }, [authToken])

  useEffect(() => {
    let alive = true
    getSatRoadmap(authToken)
      .then((r) => alive && setRoadmap(r))
      .catch(() => alive && setRoadmap(null))
    getSatSchedule(authToken)
      .then((s) => alive && setSchedule(s))
      .catch(() => alive && setSchedule({ inGroup: false, lessons: [] }))
    getSatBluebook(authToken)
      .then((b) => alive && setBluebook(b))
      .catch(() => alive && setBluebook(null))
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
    // обычный переход на «Практику» (вкладкой) — в её режим по умолчанию, а не в оставшийся от «Сегодня»
    setPracticeMode(null)
  }

  const openPractice = (mode) => {
    go('practice')
    setPracticeMode(mode)
  }

  const loc = lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU'
  const dateChip = profile?.examDate
    ? `${fmtDate(loc, new Date(`${profile.examDate}T00:00:00Z`), { day: 'numeric', month: 'short', timeZone: 'UTC' })} · ${plural(t, lang, 'sat.daysLeft', Math.max(0, daysUntil(profile.examDate)))}`
    : profile?.dateUndecided
      ? t('sat.dateUndecided')
      : null

  // в диагностику — на нужный шаг (?satDiag=intro|report)
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

  // занятие группы → практика по его теме (навыки занятия из программы, размер — модуль секции, задача 7)
  const practiceLesson = (lesson) => {
    const skillIds = lesson?.skillIds || []
    if (!skillIds.length) {
      go('practice')
      return
    }
    startPractice({ mode: 'skills', skillIds, count: moduleSize(skillSection(skillIds[0])) }).catch((e) => setError(errorText(e, t)))
  }

  // любая сессия по адресу (?satSession=) — продолжить или открыть только что собранную
  const openSession = (id) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satSession', id)
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

  // форма Bluebook-теста и сравнение 6 → 8 → 10 — свои экраны во всё окно (Figma «NEW 2», 17:8284, 17:8528). Вкладка
  // остаётся в ?satTab=, а фаза карточки — в ?satPhase=: выйдя с экрана, студент вернётся туда же, откуда пришёл
  const openBluebook = (test, phase) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satBluebook', String(test))
      if (phase) url.searchParams.set('satPhase', String(phase))
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* без адреса экран не узнает тест */
    }
    onNav?.('sat-bluebook')
  }
  const openCompare = (test) => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('satCompare', String(test))
      window.history.replaceState(window.history.state, '', url)
    } catch {
      /* без адреса экран не узнает тест */
    }
    onNav?.('sat-compare')
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

  // список дел фазы 7: каждая строка ведёт туда, где это делается
  const selfPrepActions = {
    onErrors: () => review(),
    onPractice: () => go('practice'),
    onMocks: () => go('mocks'),
    onCurator: () => onNav?.('sat-pricing'),
  }

  let panel
  if (tab === 'guide') panel = <GuideTab explainLang={profile?.explainLang} />
  else if (tab === 'plan') {
    panel = !roadmap || !schedule ? null : (
      <PlanTab
        roadmap={roadmap}
        bluebook={bluebook}
        schedule={schedule}
        onLesson={practiceLesson}
        onToday={() => go('today')}
        onBluebook={openBluebook}
        onCompare={openCompare}
        selfPrepActions={selfPrepActions}
      />
    )
  } else if (tab === 'today') {
    panel = !profile || !diagnostic || !today || !roadmap || !schedule ? null : todayPanel()
  } else if (tab === 'practice') {
    panel = (
      <PracticeTab
        key={practiceMode || 'default'}
        initialMode={practiceMode || undefined}
        onStart={startPractice}
        explainLang={profile?.explainLang}
        onErrors={(skillId) => { setErrorSkill(skillId); go('errors') }}
      />
    )
  } else if (tab === 'mocks') {
    panel = (
      <MocksTab
        target={profile?.targetTotal ?? null}
        onOpenRun={(id) => openMock(id)}
        onReview={(id) => openMock(id, 'sat-mock-review')}
        onPapers={() => onNav?.('sat-papers')}
        onPricing={() => onNav?.('sat-pricing')}
        onCompare={openCompare}
      />
    )
  } else if (tab === 'progress') {
    panel = <ProgressTab roadmap={roadmap} onPractice={(skillIds) => startPractice({ mode: 'skills', skillIds, count: moduleSize(skillSection(skillIds[0])) }).catch((e) => setError(errorText(e, t)))} />
  } else if (tab === 'materials') {
    panel = <MaterialsTab onOpen={(code) => openUnit(code)} />
  } else if (tab === 'errors') {
    panel = (
      <ErrorsTab
        key={errorSkill || 'all'}
        initialSkill={errorSkill}
        explainLang={profile?.explainLang}
        onPractice={(skillIds) => startPractice({ mode: 'skills', skillIds, count: moduleSize(skillSection(skillIds[0])) }).catch((e) => setError(errorText(e, t)))}
        onOpenPractice={() => go('practice')}
      />
    )
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
    // плана «по своим дням» больше не ждём: даты занятий ставит школа (расписание группы, ТЗ 21.10, задача 15)
    return (
      <TodayTab
        today={today}
        roadmap={roadmap}
        schedule={schedule}
        bluebook={bluebook}
        onWords={() => onNav?.('vocab', { back: true })}
        onPracticeSkills={(skillIds) => startPractice({ mode: 'skills', skillIds, count: TODAY_SIZE }).catch((e) => setError(errorText(e, t)))}
        onMocks={() => go('mocks')}
        onErrors={() => go('errors')}
        onResume={openSession}
        onReview={review}
        onPlan={() => go('plan')}
        onPracticeMode={openPractice}
        // контакта менеджера и куратора на сервере пока нет — обе кнопки ведут на тарифы SAT («уточнит менеджер»)
        onManager={() => onNav?.('sat-pricing')}
        onCurator={() => onNav?.('sat-pricing')}
      />
    )
  }

  // Старт обязателен: без глав об экзамене и диагностики (после них доступ открывается сам) вкладок нет вовсе (просьба владельца
  // 13.10.2026), кроме клоузера (satStarted). Пока «me» не пришёл — рисуем шапку без вкладок, а не мигаем вкладками перед замком.
  const started = satStarted(me)
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
