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
import { PracticeCatalog, SkillPage, TaskListPage } from '../ielts/practice/PracticeViews.jsx'
import { RunTopBar } from '../ielts/mock/MockRunHeader.jsx'
import { SKILL_TABS, skillTabOfView } from '../ielts/practice/practiceModel.js'
import ReadingTaskView from '../ielts/reading/ReadingTaskView.jsx'
import WritingTaskView from '../ielts/writing/WritingTaskView.jsx'
import WritingWorkView from '../ielts/writing/WritingWorkView.jsx'
import WritingWorksView from '../ielts/writing/WritingWorksView.jsx'
import WritingGuideView from '../ielts/writing/WritingGuideView.jsx'
import SpeakingTaskView from '../ielts/speaking/SpeakingTaskView.jsx'
import SpeakingWorkView from '../ielts/speaking/SpeakingWorkView.jsx'
import SpeakingGuideView from '../ielts/speaking/SpeakingGuideView.jsx'
import ShadowingView from '../ielts/speaking/ShadowingView.jsx'
import { useIeltsDashboard } from '../ielts/model/useIeltsDashboard.js'
import { getMyLessonOccurrences, getIeltsMe, markIeltsPlanTask } from '../api.js'
import { pickFeaturedOccurrence } from './schedule/liveNow.js'
import { loadToken } from '../lib/session.js'
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
const LISTENING_LISTS = ['listening-tasks', 'listening-types', 'listening-drills', 'listening-dictation', 'listening-spelling']
const isListeningView = (view) => LISTENING_LISTS.includes(view)
// Writing: списки Task 1 / Task 2, «Мои работы», «Как писать» и работа (её id — ?ieltsWork=)
const WRITING_VIEWS = ['writing-task1', 'writing-task2', 'writing-works', 'writing-guide', 'writing-work']
const isWritingView = (view) => WRITING_VIEWS.includes(view)
// Speaking: списки Part 1–3 и Shadowing, стратегия, «Мои ответы» и оценка (её id — тот же ?ieltsWork=)
const SPEAKING_VIEWS = ['speaking-part1', 'speaking-part2', 'speaking-part3', 'speaking-shadowing', 'speaking-guide', 'speaking-works', 'speaking-work']
const isSpeakingView = (view) => SPEAKING_VIEWS.includes(view)

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
    }
  } catch {
    return {}
  }
}

function writeHubUrl({ tab, view, testId, attemptId, list }) {
  try {
    const url = new URL(window.location.href)
    const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
    set('ieltsTab', tab && tab !== 'today' ? tab : null)
    set('ieltsView', tab === 'learn' ? view : null)
    set('ieltsTest', tab === 'learn' ? testId : null)
    set('ieltsWork', tab === 'learn' && (view === 'writing-work' || view === 'speaking-work') ? attemptId : null)
    set('ieltsList', tab === 'learn' && view === 'practice-list' ? list : null)
    window.history.replaceState(window.history.state, '', url)
  } catch {
    /* без истории (тест, превью) состояние просто не запоминается */
  }
}

export default function IeltsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onGo, target }) {
  const { t } = useI18n()
  const [hub, setHub] = useState({ tab: 'today', view: null, testId: null, attemptId: null })
  const { data, reload } = useIeltsDashboard(token)
  const catalog = useReadingCatalog(token)
  const listeningCatalog = useListeningCatalog(token)
  const writingCatalog = useIeltsCatalog(token, 'writing')
  const speakingCatalog = useIeltsCatalog(token, 'speaking')
  const [track, setTrack] = useIeltsTrack()
  // Трек в шапке — метка профиля (ТЗ v4), а не переключатель: берём из /mobile/ielts/plan/me, без ответа — выбор списков
  const [me, setMe] = useState(null)
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
      setHub({ tab: next.tab, view: next.view || null, testId: next.testId || null, attemptId: next.attemptId || null, list: next.list || null, autoGrade: !!next.autoGrade })
      // переход из App (сдали работу, вышли из теста) — в адрес, иначе F5 вернул бы на «Сегодня»
      if (target?.tab) writeHubUrl(next)
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
  const go = (next) => {
    const merged = { view: null, testId: null, attemptId: null, list: null, autoGrade: false, ...next }
    setMoved(true)
    setHub(merged)
    writeHubUrl(merged)
  }

  // задача программы → её место в разделе (planModel.taskRoute); словарь — общий раздел приложения
  const startPlanTask = (task) => {
    const r = taskRoute(task)
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
  const startRun = (testId, mode, kind) => {
    const listening = isListeningView(hub.view) || listeningCatalog.items?.some((x) => x.id === testId)
    const writing = isWritingView(hub.view) || writingCatalog.items?.some((x) => x.id === testId)
    const speaking = isSpeakingView(hub.view) || speakingCatalog.items?.some((x) => x.id === testId)
    const screen = speaking ? 'ielts-speaking-run' : writing ? 'ielts-writing-run' : kind === 'dictation' || kind === 'spelling' ? 'ielts-dictation' : listening ? 'ielts-listening-run' : 'ielts-reading-run'
    onNav?.(screen, { testId, mode, back: { tab: hub.tab, view: hub.view, testId: screen === 'ielts-dictation' ? null : testId } })
  }
  const openReview = (attemptId) => onNav?.('ielts-reading-review', { attemptId, back: { tab: hub.tab, view: hub.view, testId: hub.testId } })
  const openTest = (testId) => go({ tab: 'learn', view: hub.tab === 'learn' ? hub.view : null, testId })
  // строки «Практики»: задание открывается на своём экране, диктовка и правописание запускаются сразу
  const lists = useMemo(() => ({ reading: catalog.items, listening: listeningCatalog.items, writing: writingCatalog.items, speaking: speakingCatalog.items }),
    [catalog.items, listeningCatalog.items, writingCatalog.items, speakingCatalog.items])
  // уровень ученика по навыкам — его кладёт в строки каталог (model/levels.js); списки делятся по нему на экране
  const levelInfo = useMemo(() => ({ band: Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, studentBandOf(v)])) }), [lists])
  const openRow = (open) => {
    if (!open) return
    if (open.run) startRun(open.run.testId, 'practice', open.run.kind)
    else go(open)
  }

  const tabs = IELTS_TABS.map((key) => ({ key, label: t(`ieltsHub.tab.${key}`) }))

  let panel
  if (hub.tab === 'today') {
    panel = (
      <TodayTab
        data={data}
        lesson={lesson}
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
    return (
      <div className="ih-run ih-run--rl ih-shrun">
        <RunTopBar chip="Speaking · Shadowing" mode={t('ieltsReading.modeChip', { mode: t('ieltsReading.mode.practice').toLowerCase() })} onExit={back} />
        <div className="ih-shrun__body">
          <ShadowingView token={token} testId={hub.testId} onBack={() => go({ tab: 'learn' })} onBackToList={back} embedded />
        </div>
      </div>
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
    panel = <SpeakingGuideView token={token} onBack={() => go({ tab: 'learn' })} />
  } else if (hub.tab === 'learn' && hub.view === 'writing-work' && hub.attemptId) {
    panel = (
      <WritingWorkView
        token={token}
        attemptId={hub.attemptId}
        autoGrade={hub.autoGrade}
        onBackToLearn={() => go({ tab: 'learn' })}
        onWorks={() => go({ tab: 'learn', view: 'writing-works' })}
        onRetry={(testId) => go({ tab: 'learn', view: 'writing-works', testId })}
        onGuide={() => go({ tab: 'learn', view: 'writing-guide' })}
      />
    )
  } else if (hub.tab === 'learn' && hub.testId && isWritingView(hub.view)) {
    panel = (
      <WritingTaskView
        token={token}
        testId={hub.testId}
        listLabel={hub.view === 'writing-works' ? t('ieltsLearn.writing.works') : t(`ieltsLearn.writing.${hub.view === 'writing-task2' ? 'task2' : 'task1'}`)}
        onBackToLearn={() => go({ tab: 'learn' })}
        onBackToList={() => go({ tab: 'learn', view: hub.view })}
        onStart={(testId, mode) => startRun(testId, mode)}
        onOpenWork={(attemptId) => go({ tab: 'learn', view: 'writing-work', attemptId })}
        onGuide={() => go({ tab: 'learn', view: 'writing-guide' })}
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
  } else if (hub.tab === 'learn' && hub.view === 'writing-guide') {
    panel = <WritingGuideView token={token} track={track} onBack={() => go({ tab: 'learn' })} />
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
        onOpen={openRow}
        onOpenSkill={(sk) => go({ tab: 'learn', view: `skill-${sk}` })}
        onOpenVocab={() => onNav?.('vocab')}
      />
    )
  } else if (hub.tab === 'mocks') {
    panel = (
      <MockTestsTab
        token={token}
        track={me?.track || track}
        onOpenMock={(mockId) => onNav?.('ielts-mock', { mockId })}
        onOpenSession={(sessionId, view) => onNav?.('ielts-mock', { sessionId: String(sessionId), view })}
      />
    )
  } else if (hub.tab === 'plan') {
    panel = <PlanTab token={token || loadToken()} onStartTask={startPlanTask} onOpenDiagnostic={() => onNav?.('ielts-diagnostic')} />
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
  } else panel = <ExamGuide track={me?.track || track} onOpenSkill={(sk) => go({ tab: 'learn', view: `skill-${sk}` })} />

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ih">
        <IeltsHeader track={me?.track || track} />
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
