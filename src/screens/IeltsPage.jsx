import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import IeltsHeader from '../ielts/IeltsHeader.jsx'
import Tabs from '../ielts/ui/Tabs.jsx'
import TodayTab from '../ielts/today/TodayTab.jsx'
import MockTestsTab from '../ielts/tabs/MockTestsTab.jsx'
import ProgressPage from '../ielts/progress/ProgressPage.jsx'
import ExamGuide from '../ielts/info/ExamGuide.jsx'
import PlanTab from '../ielts/plan/PlanTab.jsx'
import { taskRoute } from '../ielts/plan/planModel.js'
import { LevelGroups, PracticeCatalog, SkillPage, TaskListPage } from '../ielts/practice/PracticeViews.jsx'
import { WritingSkillPage } from '../ielts/writing/WritingCatalog.jsx'
import { RunTopBar } from '../ielts/mock/MockRunHeader.jsx'
import { SKILL_TABS, skillRows, skillTabOfView, writingDrillList } from '../ielts/practice/practiceModel.js'
import ReadingTaskView from '../ielts/reading/ReadingTaskView.jsx'
import WritingTaskView from '../ielts/writing/WritingTaskView.jsx'
import WritingWorkView from '../ielts/writing/WritingWorkView.jsx'
import WritingWorksView from '../ielts/writing/WritingWorksView.jsx'
import WritingDrillView from '../ielts/writing/drills/WritingDrillView.jsx'
import WritingMockView from '../ielts/writing/WritingMockView.jsx'
import { listMockDrafts } from '../ielts/writing/writing.js'
import { drillCatalog } from '../ielts/writing/drills/drillModel.js'
import { useDrillProgress } from '../ielts/writing/drills/drillProgress.js'
import { SAMPLE_DRILLS } from '../ielts/writing/drills/sampleDrills.js'
import SpeakingTaskView from '../ielts/speaking/SpeakingTaskView.jsx'
import SpeakingWorkView from '../ielts/speaking/SpeakingWorkView.jsx'
import SpeakingGuideView from '../ielts/speaking/SpeakingGuideView.jsx'
import ShadowingView from '../ielts/speaking/ShadowingView.jsx'
import IeltsLockedView from '../ielts/tabs/IeltsLockedView.jsx'
import { useIeltsDashboard } from '../ielts/model/useIeltsDashboard.js'
import { getMyLessonOccurrences, getIeltsMe, markIeltsPlanTask } from '../api.js'
import { pickFeaturedOccurrence } from './schedule/liveNow.js'
import { loadToken } from '../lib/session.js'
import ExamDemoBanner from '../components/ExamDemoBanner.jsx'
import { useReadingCatalog, useListeningCatalog, useIeltsCatalog, useIeltsTrack } from '../ielts/reading/useReadingCatalog.js'
import { studentBandOf } from '../ielts/model/levels.js'

// Хаб раздела IELTS (?screen=ielts): шапка с серией и XP, вкладки и их содержимое. Макет — Figma «JTS-clone»
// (Screen MS, «Обучение», «Пробные тесты», «5 · Reading — задание»).
// Внутри «Обучения» свои экраны Reading: список (типы / дриллы / тексты) и задание; само прохождение и разбор —
// отдельные экраны App без меню (IeltsReadingRunPage, IeltsReadingReviewPage).
// ТЗ v4: пять вкладок в этом порядке; «Прогресс» — вложенный экран со «Сегодня» (вкладки нет, адрес есть), словарь —
// общий раздел приложения (ссылка из «Практики»), своей вкладки у IELTS больше нет.
export const IELTS_TABS = ['today', 'plan', 'learn', 'mocks', 'info']
const HUB_TABS = [...IELTS_TABS, 'progress']
// practice-list — выбор заданий одного набора по уровню (ключ набора — ?ieltsList=reading:drill:ng)
const READING_LISTS = ['types', 'drills', 'texts', 'reading-full', 'skill-listening', 'skill-reading', 'skill-writing', 'skill-speaking', 'practice-list']
// Списки Listening в адресе с префиксом: «types»/«drills» есть у обеих секций.
const LISTENING_LISTS = ['listening-full', 'listening-tasks', 'listening-types', 'listening-drills', 'listening-dictation', 'listening-spelling']
const isListeningView = (view) => LISTENING_LISTS.includes(view)
// Writing: списки Task 1 / Task 2, короткие тренировки (с ?ieltsTest= — сам дрилл), «Мои работы», «Как писать» и работа
// (её id — ?ieltsWork=), mock по типу: вкладка типов и описание mock одного типа (тип — ?ieltsList=task1:line)
const WRITING_VIEWS = ['writing-task1', 'writing-task2', 'writing-drills', 'writing-mocks', 'writing-mock', 'writing-works', 'writing-guide', 'writing-work']
const isWritingView = (view) => WRITING_VIEWS.includes(view)
// Speaking: списки Part 1–3 и Shadowing, стратегия, «Мои ответы» и оценка (её id — тот же ?ieltsWork=)
const SPEAKING_VIEWS = ['speaking-part1', 'speaking-part2', 'speaking-part3', 'speaking-shadowing', 'speaking-guide', 'speaking-works', 'speaking-work']
const isSpeakingView = (view) => SPEAKING_VIEWS.includes(view)
const GUIDE_VIEWS = ['writing-guide', 'speaking-guide']

// Вид → страница навыка: «skill-<навык>» — первая вкладка, старые виды списков — своя вкладка
function skillOfView(view) {
  if (typeof view === 'string' && view.startsWith('skill-')) {
    const skill = view.slice(6)
    return SKILL_TABS[skill] ? { skill, tab: SKILL_TABS[skill][0].key } : null
  }
  return skillTabOfView(view)
}

// Состояние хаба живёт в адресе, чтобы F5 и ссылка возвращали туда же: ?ieltsTab=learn&ieltsView=texts&ieltsTest=…
// Свои имена параметров, а не `tab`: ?screen= пишет App, и общий параметр путал бы другие экраны.
function readHubUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    const tab = q.get('ieltsTab')
    const view = q.get('ieltsView')
    return {
      tab: HUB_TABS.includes(tab) ? tab : null,
      view: READING_LISTS.includes(view) || isListeningView(view) || isWritingView(view) || isSpeakingView(view) ? view : null,
      testId: q.get('ieltsTest') || null,
      attemptId: q.get('ieltsWork') || null,
      list: q.get('ieltsList') || null,
      section: q.get('ieltsSection') || null,
      // тип задания (task1:line → line) для тренировки с фильтром по типу
      ty: q.get('ieltsType') || null,
    }
  } catch {
    return {}
  }
}

// mode: replace — то же место (вход из App, уход из раздела); push — новый шаг истории хаба: вид, вкладка, фильтр.
// Браузерная «Назад» возвращает на прошлый шаг (popstate → readHubUrl), прокрутка ушедшего шага — в его history.state
// (ihScroll), глубина хаба — ihDepth: по ней «← Назад» экрана знает, есть ли куда вернуться историей (разбор A7).
function writeHubUrl({ tab, view, testId, attemptId, list, section, ty }, mode = 'replace') {
  try {
    const url = new URL(window.location.href)
    const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
    set('ieltsTab', tab && tab !== 'today' ? tab : null)
    set('ieltsView', tab === 'learn' ? view : null)
    set('ieltsTest', tab === 'learn' ? testId : null)
    set('ieltsWork', tab === 'learn' && (view === 'writing-work' || view === 'speaking-work') ? attemptId : null)
    // ieltsList у тренировок Writing — часть (T1 | GT | T2) во вкладке «Короткие тренировки»
    set('ieltsList', tab === 'learn' && (view === 'practice-list' || view === 'writing-mock' || (view === 'writing-drills' && !testId)) ? list : null)
    // глава гида: «t1ac.line» у «Как писать», «p2» у стратегии Speaking — задача плана открывает её, а не оглавление
    set('ieltsSection', tab === 'learn' && GUIDE_VIEWS.includes(view) ? section : null)
    set('ieltsType', tab === 'learn' ? ty : null)
    const cur = window.history.state
    if (mode === 'push' && url.href !== window.location.href) {
      window.history.replaceState({ ...(cur || {}), ihScroll: window.scrollY || 0 }, '', window.location.href)
      window.history.pushState({ ih: true, ihDepth: (cur?.ihDepth || 0) + 1 }, '', url)
    } else window.history.replaceState(cur, '', url)
  } catch {
    /* без истории (тест, превью) состояние просто не запоминается */
  }
}

const hubDepth = () => {
  try {
    return Number(window.history.state?.ihDepth) || 0
  } catch {
    return 0
  }
}

function scrollPageTop() {
  try {
    window.scrollTo(0, 0)
  } catch {
    /* jsdom и старые браузеры — не критично */
  }
}

export default function IeltsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onGo, target }) {
  const { t } = useI18n()
  const [hub, setHub] = useState({ tab: 'today', view: null, testId: null, attemptId: null, section: null })
  const { data, reload } = useIeltsDashboard(token)
  const catalog = useReadingCatalog(token)
  const listeningCatalog = useListeningCatalog(token)
  const writingCatalog = useIeltsCatalog(token, 'writing')
  const speakingCatalog = useIeltsCatalog(token, 'speaking')
  const [storedTrack] = useIeltsTrack()
  // Трек в шапке — метка профиля (ТЗ v4), а не переключатель: берём из /mobile/ielts/plan/me, без ответа — выбор списков
  const [me, setMe] = useState(null)
  // Трек для списков, подписей плана и «куда ведёт задача» — профиля. Переключателя трека больше нет, и выбор на
  // устройстве у ученика General Training так и оставался «academic»: Task 1 вёл к графикам вместо писем.
  const track = me?.track || data?.profile?.track || storedTrack
  // Ближайший живой урок — только у live; источник — общее расписание JTS, IELTS его не копирует
  const [lesson, setLesson] = useState(null)
  useEffect(() => {
    const tk = token || loadToken()
    if (!tk) return
    let alive = true
    getIeltsMe(tk).then((m) => {
      if (!alive) return
      setMe(m)
      // расписание нужно только live: у Self Study уроков нет, а запрос шёл на каждом заходе в хаб
      if (m?.studyMode !== 'live') return
      getMyLessonOccurrences(tk)
        .then((occ) => alive && setLesson(pickFeaturedOccurrence(Array.isArray(occ) ? occ : [])))
        .catch(() => {})
    })
    return () => {
      alive = false
    }
  }, [token])

  // Состояние из адреса или из перехода App (выход из прохождения/разбора) — после гидратации, как ?screen=.
  useEffect(() => {
    const fromUrl = readHubUrl()
    const next = target?.tab ? target : fromUrl
    if (next.tab) {
      setHub({ tab: next.tab, view: next.view || null, testId: next.testId || null, attemptId: next.attemptId || null, list: next.list || null, section: next.section || null, ty: next.ty || null, autoGrade: !!next.autoGrade })
      // переход из App (сдали работу, вышли из теста) — в адрес, иначе F5 вернул бы на «Сегодня»
      if (target?.tab) {
        writeHubUrl(next)
        // переход из App в место хаба — тоже новый экран: с начала, а не с прокрутки прохождения. «Назад» App
        // (restoreScroll) докручивает по кадрам позже и свою позицию всё равно поставит.
        scrollPageTop()
      }
    }
    // Ушли из раздела — параметры раздела не должны висеть в адресе чужого экрана. Чистим, только когда ?screen
    // уже сменился (его пишет эффект App после коммита — отсюда setTimeout): в StrictMode эффект снимается и
    // ставится заново, и немедленная чистка стёрла бы вкладку раньше, чем её прочитали второй раз.
    return () =>
      setTimeout(() => {
        if (new URLSearchParams(window.location.search).get('screen') !== 'ielts') writeHubUrl({ tab: 'today' })
      }, 0)
  }, [target])

  // Первый показ раздела уже анимирует обёртка экранов App (.scr-in) — панель анимируем только при переходах внутри
  // хаба, иначе два появления складываются в одно затянутое.
  const [moved, setMoved] = useState(false)
  // opts.scroll: false — смена фильтра на том же экране (чип, часть тренировок, глава гида): прокрутка остаётся;
  // opts.replace — без нового шага истории
  const go = (next, opts = {}) => {
    const merged = { view: null, testId: null, attemptId: null, list: null, section: null, ty: null, autoGrade: false, ...next }
    setMoved(true)
    setHub(merged)
    writeHubUrl(merged, opts.replace ? 'replace' : 'push')
    setDepth(hubDepth())
    // Новый экран раздела — с начала. Панель меняется внутри той же страницы, а каталоги уже загружены, поэтому высота
    // не схлопывается и браузер оставлял прокрутку прежнего экрана: задача с «Сегодня» открывалась с середины.
    if (opts.scroll !== false) scrollPageTop()
  }
  // Глубина истории хаба: есть шаг назад — «← Назад» экрана идёт браузерной историей (тот же фильтр и прокрутка)
  const [depth, setDepth] = useState(hubDepth)
  // «← Назад» внутренних экранов: прошлый шаг хаба, если он есть, иначе — fallback (вход по ссылке, F5 на глубине)
  const back = (fallback) => () => {
    if (hubDepth() > 0) window.history.back()
    else go(fallback, { replace: true })
  }
  // Браузерная «Назад»/«Вперёд» внутри хаба: состояние — из адреса, прокрутка — из шага истории. Уход на чужой экран App
  // не трогаем: App своей истории не ведёт (только replaceState), и его экран сменится вместе с ?screen только у него.
  useEffect(() => {
    const onPop = (e) => {
      const q = new URLSearchParams(window.location.search)
      if (q.get('screen') !== 'ielts') return
      const h = readHubUrl()
      setMoved(false)
      setHub({ tab: h.tab || 'today', view: h.view || null, testId: h.testId || null, attemptId: h.attemptId || null, list: h.list || null, section: h.section || null, ty: h.ty || null, autoGrade: false })
      setDepth(Number(e.state?.ihDepth) || 0)
      const y = Number(e.state?.ihScroll) || 0
      // список дорисовывается после смены состояния (и превью догружаются) — ставим позицию на двух кадрах подряд
      requestAnimationFrame(() => {
        window.scrollTo(0, y)
        requestAnimationFrame(() => window.scrollTo(0, y))
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // задача программы → её место в разделе (planModel.taskRoute); словарь — общий раздел приложения
  const startPlanTask = (task) => {
    const r = taskRoute(task, track)
    if (r.screen) onNav?.(r.screen, r.payload)
    else go(r)
  }
  // «Тренировать навык» из «Зоны роста»: туда, где этот навык тренируется; без основания — в план
  const trainGrowth = (g) => {
    if (!g) return go({ tab: 'plan' })
    if (g.kind === 'criterion') return go({ tab: 'learn', view: g.skill === 'speaking' ? 'speaking-part2' : 'writing-task2' })
    go({ tab: 'learn', view: g.skill === 'listening' ? 'listening-tasks' : 'types' })
  }
  const markPlanTask = (task, done) => markIeltsPlanTask(token || loadToken(), task.id, done).catch(() => null).then(reload)

  // Экран прохождения — по секции теста: у Listening свой плеер и фазы экзамена, у диктовки — свой тренажёр.
  // extra — поля цели прохождения сверх задания: mockType (mock Writing по типу) и своё место возврата
  const startRun = (testId, mode, kind, extra = null) => {
    const listening = isListeningView(hub.view) || listeningCatalog.items?.some((x) => x.id === testId)
    const writing = isWritingView(hub.view) || writingCatalog.items?.some((x) => x.id === testId)
    const speaking = isSpeakingView(hub.view) || speakingCatalog.items?.some((x) => x.id === testId)
    const screen = speaking ? 'ielts-speaking-run' : writing ? 'ielts-writing-run' : kind === 'dictation' || kind === 'spelling' ? 'ielts-dictation' : listening ? 'ielts-listening-run' : 'ielts-reading-run'
    onNav?.(screen, { testId, mode, back: { tab: hub.tab, view: hub.view, testId: screen === 'ielts-dictation' ? null : testId }, ...extra })
  }
  const openReview = (attemptId) => onNav?.('ielts-reading-review', { attemptId, back: { tab: hub.tab, view: hub.view, testId: hub.testId } })
  const openTest = (testId) => go({ tab: 'learn', view: hub.tab === 'learn' ? hub.view : null, testId })
  // прогресс дриллов Writing — сервер (/mobile/ielts/drills/progress), без связи — устройство. Хаб монтируется уже
  // после гидратации (экран App выбирается эффектом), поэтому хранилище можно читать сразу
  const [drillProgress, setDrillProgress] = useDrillProgress(token)
  // строки «Практики»: задание открывается на своём экране, диктовка и правописание запускаются сразу
  const lists = useMemo(() => ({ reading: catalog.items, listening: listeningCatalog.items, writing: writingCatalog.items, speaking: speakingCatalog.items,
    writingDrills: drillCatalog(writingCatalog.items, SAMPLE_DRILLS, drillProgress),
    // начатые на устройстве mock по типу: тип — «Продолжить», и mock продолжается тем же заданием
    writingMockDrafts: listMockDrafts() }),
  [catalog.items, listeningCatalog.items, writingCatalog.items, speakingCatalog.items, drillProgress])
  // уровень ученика по навыкам — его кладёт в строки каталог (model/levels.js); списки делятся по нему на экране
  const levelInfo = useMemo(() => ({ band: Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, studentBandOf(v)])) }), [lists])
  const openRow = (open) => {
    if (!open) return
    if (open.run) startRun(open.run.testId, 'practice', open.run.kind)
    else go(open)
  }

  const tabs = IELTS_TABS.map((key) => ({ key, label: t(`ieltsHub.tab.${key}`) }))

  let panel
  // Материалы закрыты до двух стартовых шагов (анкета + диагностика, затем доступ открывается сам): любая вкладка — шаги старта.
  // Ждём ответ /plan/me: до него вкладка рисуется как обычно, иначе у ученика с доступом мигал бы замок.
  if (me && me.access === false) {
    return (
      <LearningLayout userName={userName} userLevel={userLevel} active="ielts" token={token} onNav={onNav} onProfile={onProfile}>
        <div className="ih">
          <IeltsHeader track={track} />
          {/* демо-версия IELTS (SAT-SYNC-PLAN E2): набор ограничен демо-квотой, полный — через тариф */}
          <ExamDemoBanner exam="ielts" token={token} onPricing={() => onNav?.('ielts-pricing')} />
          <IeltsLockedView onboarded={!!me.onboarded} diagnosticDone={!!me.diagnosticDone} onOpenOnboarding={() => onNav?.('ielts-onboarding')} onOpenDiagnostic={() => onNav?.('ielts-diagnostic')} onOpenResult={() => onNav?.('ielts-diagnostic-result')} />
        </div>
      </LearningLayout>
    )
  }
  if (hub.tab === 'today') {
    panel = (
      <TodayTab
        data={data}
        lesson={lesson}
        track={track}
        onStartPlanTask={startPlanTask}
        onMarkPlanTask={markPlanTask}
        onOpenPlan={() => go({ tab: 'plan' })}
        onOpenProgress={() => go({ tab: 'progress' })}
        onEditGoal={() => onNav?.('ielts-onboarding')}
        onTrain={trainGrowth}
        onOpenLessons={() => onNav?.('lessons')}
        onStartStep={(step) => onNav?.(step === 'onboarding' ? 'ielts-onboarding' : step === 'diagnostic' ? 'ielts-diagnostic' : 'ielts-route')}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'speaking-work' && hub.attemptId) {
    panel = (
      <SpeakingWorkView
        token={token}
        attemptId={hub.attemptId}
        onBackToLearn={() => go({ tab: 'learn' })}
        onWorks={() => go({ tab: 'learn', view: 'speaking-works' })}
        onRetry={(testId) => go({ tab: 'learn', view: 'speaking-works', testId })}
      />
    )
  } else if (hub.tab === 'learn' && hub.testId && hub.view === 'speaking-shadowing') {
    // shadowing — такой же экран задания, как Reading/Listening: на весь экран, только задание и шапка (правка в Figma)
    const back = () => go({ tab: 'learn', view: 'speaking-shadowing' })
    // шапку рисует сам экран: в ней «?» тура shadowing
    return (
      <ShadowingView
        token={token}
        testId={hub.testId}
        onBack={() => go({ tab: 'learn' })}
        onBackToList={back}
        bar={{ chip: 'Speaking · Shadowing', mode: t('ieltsReading.modeChip', { mode: t('ieltsReading.mode.practice').toLowerCase() }), onExit: back }}
      />
    )
  } else if (hub.tab === 'learn' && hub.testId && isSpeakingView(hub.view)) {
    panel = (
      <SpeakingTaskView
        token={token}
        testId={hub.testId}
        listLabel={hub.view === 'speaking-works' ? t('ieltsSpeaking.works') : t(`ieltsLearn.speaking.p${hub.view.slice(-1)}`)}
        onBackToLearn={() => go({ tab: 'learn' })}
        onBackToList={() => go({ tab: 'learn', view: hub.view })}
        onStart={(testId, mode) => startRun(testId, mode)}
        onOpenWork={(attemptId) => go({ tab: 'learn', view: 'speaking-work', attemptId })}
        onGuide={() => go({ tab: 'learn', view: 'speaking-guide' })}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'speaking-works') {
    panel = <WritingWorksView token={token} skill="speaking" onOpenWork={(attemptId) => go({ tab: 'learn', view: 'speaking-work', attemptId })} onBack={() => go({ tab: 'learn' })} />
  } else if (hub.tab === 'learn' && hub.view === 'speaking-guide') {
    panel = <SpeakingGuideView token={token} initialPart={Number(String(hub.section || '').replace(/^p/, '')) || 1} onBack={() => go({ tab: 'learn' })} />
  } else if (hub.tab === 'learn' && hub.view === 'writing-work' && hub.attemptId) {
    // «Закрепление» — упражнения из разбора этой работы в плеере тренировок (id «attempt:<id>», контракт §4);
    // тренировка под слабый критерий — с ty, типом задания для фильтра раундов (контракт §3)
    panel = (
      <WritingWorkView
        token={token}
        attemptId={hub.attemptId}
        autoGrade={hub.autoGrade}
        onBackToLearn={() => go({ tab: 'learn' })}
        onWorks={() => go({ tab: 'learn', view: 'writing-works' })}
        onRetry={(testId) => go({ tab: 'learn', view: 'writing-works', testId })}
        onGuide={(section) => go({ tab: 'learn', view: 'writing-guide', section: typeof section === 'string' ? section : null })}
        onPractice={(id) => go({ tab: 'learn', view: 'writing-drills', testId: `attempt:${id}` })}
        onDrill={(testId, ty) => go({ tab: 'learn', view: 'writing-drills', testId, ty: ty || null })}
        drills={writingCatalog.items}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'writing-drills' && hub.testId) {
    panel = (
      <WritingDrillView
        token={token}
        drillId={hub.testId}
        track={track}
        onBackToLearn={() => go({ tab: 'learn' })}
        onBack={back({ tab: 'learn', view: 'writing-drills' })}
        onRecorded={setDrillProgress}
        ty={hub.ty}
        catalog={writingCatalog.items}
        onGuide={(section) => go({ tab: 'learn', view: 'writing-guide', section })}
        onReview={() => go({ tab: 'learn', view: 'writing-drills', testId: 'review' })}
        onOpenTask={(testId) => go({ tab: 'learn', view: writingCatalog.items?.find((x) => x.id === testId)?.kind === 'task2' ? 'writing-task2' : 'writing-task1', testId })}
      />
    )
  } else if (hub.tab === 'learn' && hub.testId && isWritingView(hub.view)) {
    panel = (
      <WritingTaskView
        token={token}
        testId={hub.testId}
        listLabel={hub.view === 'writing-works' ? t('ieltsLearn.writing.works') : t(`ieltsLearn.writing.${hub.view === 'writing-task2' ? 'task2' : 'task1'}`)}
        onBackToLearn={() => go({ tab: 'learn' })}
        onBackToList={() => go({ tab: 'learn', view: hub.view, ty: hub.ty })}
        onBack={back({ tab: 'learn', view: hub.view, ty: hub.ty })}
        onStart={(testId, mode) => startRun(testId, mode)}
        onOpenWork={(attemptId) => go({ tab: 'learn', view: 'writing-work', attemptId })}
        onGuide={(section) => go({ tab: 'learn', view: 'writing-guide', section: typeof section === 'string' ? section : null })}
        drills={writingDrillList(lists, track)}
        onStartDrill={(d, ty) => go({ tab: 'learn', view: 'writing-drills', testId: d.id, ty: ty || null })}
        onTasksOfType={(part, ty) => go({ tab: 'learn', view: part === 'T2' ? 'writing-task2' : 'writing-task1', ty })}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'writing-works') {
    panel = (
      <WritingWorksView
        token={token}
        catalog={writingCatalog}
        onOpenWork={(attemptId) => go({ tab: 'learn', view: 'writing-work', attemptId })}
        onOpenTask={(testId) => go({ tab: 'learn', view: 'writing-works', testId })}
        onBack={() => go({ tab: 'learn' })}
      />
    )
  } else if (hub.tab === 'learn' && !hub.testId && (hub.view === 'writing-guide' || skillOfView(hub.view)?.skill === 'writing')) {
    // страница Writing (ТЗ §3.2): вкладки Task 1 · Task 2 · Короткие тренировки · Как писать · Mock, фильтр — ieltsType
    const tab = hub.view === 'writing-guide' ? 'guide' : skillOfView(hub.view).tab
    panel = (
      <WritingSkillPage
        tab={tab}
        type={hub.ty}
        list={hub.list}
        section={hub.section}
        lists={lists}
        track={track}
        token={token}
        levelInfo={levelInfo}
        catalog={writingCatalog}
        nav={go}
        onBack={depth > 0 ? back({ tab: 'learn' }) : null}
        onLearn={() => go({ tab: 'learn' })}
        mockBody={tab === 'mock' ? <LevelGroups rows={skillRows('writing', 'mock', lists, track).filter((r) => r.status !== 'soon' && r.open)} onOpen={openRow} /> : null}
      />
    )
  } else if (hub.tab === 'learn' && hub.testId) {
    const listening = isListeningView(hub.view) || listeningCatalog.items?.some((x) => x.id === hub.testId)
    const listLabel = !hub.view ? null : isListeningView(hub.view) ? t(`ieltsLearn.listening.${hub.view.slice(10)}`) : t(`ieltsLearn.reading.${hub.view}`)
    panel = (
      <ReadingTaskView
        skill={listening ? 'listening' : 'reading'}
        token={token}
        testId={hub.testId}
        listLabel={listLabel}
        onBackToLearn={() => go({ tab: 'learn' })}
        onBackToList={() => go({ tab: 'learn', view: hub.view })}
        onStart={startRun}
        onReview={openReview}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'writing-mock' && hub.list) {
    // описание mock Writing по типу: задание выбирается при старте, прохождение — обычный редактор в условиях экзамена
    const mockBack = { tab: 'learn', view: 'writing-mock', list: hub.list }
    panel = (
      <WritingMockView
        listKey={hub.list}
        catalog={writingCatalog}
        drafts={lists.writingMockDrafts}
        track={track}
        onStart={(testId, kind, mockType) => startRun(testId, 'exam', kind, { mockType, back: mockBack })}
        onBack={() => go({ tab: 'learn' })}
        onSkill={() => go({ tab: 'learn', view: 'writing-mocks' })}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'practice-list' && hub.list) {
    panel = (
      <TaskListPage
        listKey={hub.list}
        lists={lists}
        track={track}
        levelInfo={levelInfo}
        onOpen={openRow}
        onBack={() => go({ tab: 'learn' })}
        onSkill={(sk) => go({ tab: 'learn', view: `skill-${sk}` })}
      />
    )
  } else if (hub.tab === 'learn' && !hub.testId && skillOfView(hub.view)) {
    // страница навыка (дизайн «IELTS new», 3): вкладка — по виду списка, старые адреса ?ieltsView=types и т. п. ведут сюда же
    const st = skillOfView(hub.view)
    panel = (
      <SkillPage
        skill={st.skill}
        tab={st.tab}
        lists={lists}
        levelInfo={levelInfo}
        track={track}
        onOpen={openRow}
        onTab={(key) => go({ tab: 'learn', view: SKILL_TABS[st.skill].find((x) => x.key === key).view })}
        onBack={() => go({ tab: 'learn' })}
        onOtherSkill={(sk) => go({ tab: 'learn', view: `skill-${sk}` })}
      />
    )
  } else if (hub.tab === 'learn') {
    panel = (
      <PracticeCatalog
        lists={lists}
        track={track}
        token={token}
        onOpen={openRow}
        onOpenSkill={(sk) => go({ tab: 'learn', view: `skill-${sk}` })}
        onOpenVocab={() => onNav?.('vocab')}
      />
    )
  } else if (hub.tab === 'mocks') {
    panel = (
      <MockTestsTab
        token={token}
        track={track}
        onOpenMock={(mockId) => onNav?.('ielts-mock', { mockId })}
        onOpenSession={(sessionId, view) => onNav?.('ielts-mock', { sessionId: String(sessionId), view })}
      />
    )
  } else if (hub.tab === 'plan') {
    panel = <PlanTab token={token || loadToken()} track={track} onStartTask={startPlanTask} onOpenDiagnostic={() => onNav?.('ielts-diagnostic')} />
  } else if (hub.tab === 'progress') {
    panel = (
      <ProgressPage
        data={data}
        token={token || loadToken()}
        programmeName={me?.programmeName}
        onBack={() => go({ tab: 'today' })}
        onTrain={(e) => (e.kind === 'criterion' ? trainGrowth(e) : go({ tab: 'learn', view: e.skill === 'listening' ? 'listening-tasks' : 'types' }))}
        onOpenAttempt={(a) => {
          // разбор — там, где у навыка свой экран работы
          if (a.skill === 'writing') go({ tab: 'learn', view: 'writing-work', attemptId: String(a.id) })
          else if (a.skill === 'speaking') go({ tab: 'learn', view: 'speaking-work', attemptId: String(a.id) })
          else if (a.skill === 'diagnostic') onNav?.('ielts-diagnostic-result', { attemptId: String(a.id) })
          else onNav?.('ielts-reading-review', { attemptId: a.id, back: { tab: 'progress' } })
        }}
      />
    )
  } else panel = <ExamGuide track={track} onOpenSkill={(sk) => go({ tab: 'learn', view: `skill-${sk}` })} />

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ih">
        <IeltsHeader track={track} />
        <ExamDemoBanner exam="ielts" token={token} onPricing={() => onNav?.('ielts-pricing')} />
        <Tabs items={tabs} value={hub.tab === 'progress' ? 'today' : hub.tab} onChange={(tab) => go({ tab })} idBase="ih" label="IELTS" />
        {/* key — по вкладке и экрану внутри неё: новый экран монтируется заново и проигрывает короткое появление
            (.ih-enter, только opacity и transform). Внутри одного экрана обновления данных его не перезапускают. */}
        <div
          key={`${hub.tab}|${hub.view || ''}|${hub.testId || ''}|${hub.attemptId || ''}`}
          role="tabpanel"
          id={`ih-panel-${hub.tab}`}
          aria-labelledby={`ih-tab-${hub.tab}`}
          className={moved ? 'ih__panel ih-enter' : 'ih__panel'}
        >
          {panel}
        </div>
      </div>
    </LearningLayout>
  )
}
