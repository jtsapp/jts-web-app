import { useEffect, useMemo, useState } from 'react'
import LearningLayout from '../components/LearningLayout.jsx'
import { useI18n } from '../i18n.jsx'
import IeltsHeader from '../ielts/IeltsHeader.jsx'
import Tabs from '../ielts/ui/Tabs.jsx'
import TodayTab from '../ielts/today/TodayTab.jsx'
import LearnTab from '../ielts/tabs/LearnTab.jsx'
import MockTestsTab from '../ielts/tabs/MockTestsTab.jsx'
import ProgressTab from '../ielts/tabs/ProgressTab.jsx'
import ComingSoonTab from '../ielts/tabs/ComingSoonTab.jsx'
import ReadingListView from '../ielts/reading/ReadingListView.jsx'
import ReadingTaskView from '../ielts/reading/ReadingTaskView.jsx'
import ListeningListView from '../ielts/listening/ListeningListView.jsx'
import WritingListView from '../ielts/writing/WritingListView.jsx'
import WritingTaskView from '../ielts/writing/WritingTaskView.jsx'
import WritingWorkView from '../ielts/writing/WritingWorkView.jsx'
import WritingWorksView from '../ielts/writing/WritingWorksView.jsx'
import WritingGuideView from '../ielts/writing/WritingGuideView.jsx'
import SpeakingListView from '../ielts/speaking/SpeakingListView.jsx'
import SpeakingTaskView from '../ielts/speaking/SpeakingTaskView.jsx'
import SpeakingWorkView from '../ielts/speaking/SpeakingWorkView.jsx'
import SpeakingGuideView from '../ielts/speaking/SpeakingGuideView.jsx'
import ShadowingView from '../ielts/speaking/ShadowingView.jsx'
import { TranslateIcon, DescriptionIcon } from '../ielts/icons.jsx'
import { useIeltsDashboard, starterPlan } from '../ielts/model/useIeltsDashboard.js'
import { planTaskView } from '../ielts/model/plan.js'
import { rebuildIeltsPlan } from '../api.js'
import { loadToken } from '../lib/session.js'
import { useReadingCatalog, useListeningCatalog, useIeltsCatalog, useIeltsTrack } from '../ielts/reading/useReadingCatalog.js'

// Хаб раздела IELTS (?screen=ielts): шапка с серией и XP, вкладки и их содержимое. Макет — Figma «JTS-clone»
// (Screen MS, «Обучение», «Пробные тесты», «5 · Reading — задание»).
// Внутри «Обучения» свои экраны Reading: список (типы / дриллы / тексты) и задание; само прохождение и разбор —
// отдельные экраны App без меню (IeltsReadingRunPage, IeltsReadingReviewPage).
export const IELTS_TABS = ['today', 'learn', 'mocks', 'progress', 'vocab', 'info']
const READING_LISTS = ['types', 'drills', 'texts']
// Списки Listening в адресе с префиксом: «types»/«drills» есть у обеих секций.
const LISTENING_LISTS = ['listening-tasks', 'listening-dictation', 'listening-spelling']
const isListeningView = (view) => LISTENING_LISTS.includes(view)
// Writing: списки Task 1 / Task 2, «Мои работы», «Как писать» и работа (её id — ?ieltsWork=)
const WRITING_VIEWS = ['writing-task1', 'writing-task2', 'writing-works', 'writing-guide', 'writing-work']
const isWritingView = (view) => WRITING_VIEWS.includes(view)
// Speaking: списки Part 1–3 и Shadowing, стратегия, «Мои ответы» и оценка (её id — тот же ?ieltsWork=)
const SPEAKING_VIEWS = ['speaking-part1', 'speaking-part2', 'speaking-part3', 'speaking-shadowing', 'speaking-guide', 'speaking-works', 'speaking-work']
const isSpeakingView = (view) => SPEAKING_VIEWS.includes(view)

// Состояние хаба живёт в адресе, чтобы F5 и ссылка возвращали туда же: ?ieltsTab=learn&ieltsView=texts&ieltsTest=…
// Свои имена параметров, а не `tab`: ?screen= пишет App, и общий параметр путал бы другие экраны.
function readHubUrl() {
  try {
    const q = new URLSearchParams(window.location.search)
    const tab = q.get('ieltsTab')
    const view = q.get('ieltsView')
    return {
      tab: IELTS_TABS.includes(tab) ? tab : null,
      view: READING_LISTS.includes(view) || isListeningView(view) || isWritingView(view) || isSpeakingView(view) ? view : null,
      testId: q.get('ieltsTest') || null,
      attemptId: q.get('ieltsWork') || null,
    }
  } catch {
    return {}
  }
}

function writeHubUrl({ tab, view, testId, attemptId }) {
  try {
    const url = new URL(window.location.href)
    const set = (k, v) => (v ? url.searchParams.set(k, v) : url.searchParams.delete(k))
    set('ieltsTab', tab && tab !== 'today' ? tab : null)
    set('ieltsView', tab === 'learn' ? view : null)
    set('ieltsTest', tab === 'learn' ? testId : null)
    set('ieltsWork', tab === 'learn' && (view === 'writing-work' || view === 'speaking-work') ? attemptId : null)
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

  // Состояние из адреса или из перехода App (выход из прохождения/разбора) — после гидратации, как ?screen=.
  useEffect(() => {
    const fromUrl = readHubUrl()
    const next = target?.tab ? target : fromUrl
    if (next.tab) {
      setHub({ tab: next.tab, view: next.view || null, testId: next.testId || null, attemptId: next.attemptId || null, autoGrade: !!next.autoGrade })
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

  const go = (next) => {
    const merged = { view: null, testId: null, attemptId: null, autoGrade: false, ...next }
    setHub(merged)
    writeHubUrl(merged)
  }

  // план дня строит бэкенд (по слабым типам, дате экзамена и маршруту); без ответа — стартовый план по секциям
  // данные макета (?ieltsSample=1) несут план уже готовыми строками, бэкенд — сырыми задачами
  const plan = useMemo(() => {
    if (Array.isArray(data.plan)) return data.plan
    return data.plan?.tasks?.length ? data.plan.tasks.map((x) => planTaskView(x, t)) : starterPlan(t)
  }, [data.plan, t])
  const startTask = (task) => {
    const target = task.target
    if (target?.screen) onNav?.(target.screen)
    else if (target?.hub) go(target.hub)
    else goTarget(target)
  }
  const rebuildPlan = () => rebuildIeltsPlan(token || loadToken()).catch(() => null).then(reload)

  // Цели задач и быстрых действий: экраны IELTS — App (onGo), разделы приложения — сайдбарная навигация (onNav).
  const goTarget = (dest) => {
    if (dest === 'vocab' || dest === 'lessons') onNav?.(dest)
    else if (dest === 'ielts-reading') go({ tab: 'learn', view: 'texts' })
    else onGo?.(dest)
  }
  const onQuickAction = (key) => {
    if (key === 'mock') go({ tab: 'mocks' })
    else if (key === 'weak') go({ tab: 'progress' })
    else if (key === 'vocab') onNav?.('vocab')
    else if (key === 'spelling') onGo?.('ielts-listening')
  }

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

  const tabs = IELTS_TABS.map((key) => ({ key, label: t(`ieltsHub.tab.${key}`) }))

  let panel
  if (hub.tab === 'today') {
    panel = (
      <TodayTab
        data={data}
        plan={plan}
        onStartTask={startTask}
        onRebuild={rebuildPlan}
        onQuickAction={onQuickAction}
        onLessonReport={() => onNav?.('lessons')}
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
    panel = <ShadowingView token={token} testId={hub.testId} onBack={() => go({ tab: 'learn' })} onBackToList={() => go({ tab: 'learn', view: 'speaking-shadowing' })} />
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
  } else if (hub.tab === 'learn' && ['speaking-part1', 'speaking-part2', 'speaking-part3', 'speaking-shadowing'].includes(hub.view)) {
    panel = (
      <SpeakingListView
        kind={hub.view.slice(9)}
        catalog={speakingCatalog}
        onOpenTest={(x) => go({ tab: 'learn', view: hub.view, testId: x.id })}
        onBack={() => go({ tab: 'learn' })}
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
  } else if (hub.tab === 'learn' && (hub.view === 'writing-task1' || hub.view === 'writing-task2')) {
    panel = (
      <WritingListView
        kind={hub.view === 'writing-task2' ? 'task2' : 'task1'}
        catalog={writingCatalog}
        track={track}
        onTrack={setTrack}
        onOpenTest={(x) => go({ tab: 'learn', view: hub.view, testId: x.id })}
        onBack={() => go({ tab: 'learn' })}
      />
    )
  } else if (hub.tab === 'learn' && hub.view === 'writing-works') {
    panel = <WritingWorksView token={token} onOpenWork={(attemptId) => go({ tab: 'learn', view: 'writing-work', attemptId })} onBack={() => go({ tab: 'learn' })} />
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
  } else if (hub.tab === 'learn' && isListeningView(hub.view)) {
    panel = (
      <ListeningListView
        list={hub.view.slice(10)}
        catalog={listeningCatalog}
        onOpenTest={(x) => (x.kind === 'dictation' || x.kind === 'spelling' ? startRun(x.id, 'practice', x.kind) : go({ tab: 'learn', view: hub.view, testId: x.id }))}
        onBack={() => go({ tab: 'learn' })}
      />
    )
  } else if (hub.tab === 'learn' && hub.view) {
    panel = (
      <ReadingListView
        list={hub.view}
        catalog={catalog}
        track={track}
        onTrack={setTrack}
        onOpenTest={(id) => go({ tab: 'learn', view: hub.view, testId: id })}
        onBack={() => go({ tab: 'learn' })}
      />
    )
  } else if (hub.tab === 'learn') {
    panel = <LearnTab token={token} catalog={catalog} track={track} listeningCatalog={listeningCatalog} writingCatalog={writingCatalog} speakingCatalog={speakingCatalog} onOpenReading={(view) => go({ tab: 'learn', view })} onGo={onGo} />
  } else if (hub.tab === 'mocks') {
    panel = <MockTestsTab catalog={catalog} track={track} onTrack={setTrack} onStart={startRun} onOpenTest={openTest} />
  } else if (hub.tab === 'progress') {
    panel = (
      <ProgressTab
        data={data}
        token={token}
        onOpenAttempt={(a) => {
          // разбор — там, где у навыка свой экран работы
          if (a.skill === 'writing') go({ tab: 'learn', view: 'writing-work', attemptId: String(a.id) })
          else if (a.skill === 'speaking') go({ tab: 'learn', view: 'speaking-work', attemptId: String(a.id) })
          else if (a.skill === 'diagnostic') onNav?.('ielts-diagnostic-result', { attemptId: String(a.id) })
          else onNav?.('ielts-reading-review', { attemptId: a.id, back: { tab: 'progress' } })
        }}
      />
    )
  } else if (hub.tab === 'vocab') {
    panel = (
      <ComingSoonTab
        tabKey="vocab"
        icon={<TranslateIcon size={28} />}
        action={{ label: t('ieltsHub.soon.vocab.cta'), onClick: () => onNav?.('vocab') }}
      />
    )
  } else panel = <ComingSoonTab tabKey="info" icon={<DescriptionIcon size={28} />} />

  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ih">
        <IeltsHeader streakDays={data.streakDays} streakBest={data.streakBest} xp={data.xp} level={data.level} />
        <Tabs items={tabs} value={hub.tab} onChange={(tab) => go({ tab })} idBase="ih" label="IELTS" />
        <div role="tabpanel" id={`ih-panel-${hub.tab}`} aria-labelledby={`ih-tab-${hub.tab}`} className="ih__panel">
          {panel}
        </div>
      </div>
    </LearningLayout>
  )
}
