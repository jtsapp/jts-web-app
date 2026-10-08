import StartBanner, { startStep } from './StartBanner.jsx'
import PageHeader from '../ui/PageHeader.jsx'
import GoalBanner from './GoalBanner.jsx'
import { GrowthCard, TodayTasksCard, WeeklyControlStrip } from './TodayCards.jsx'
import { useI18n } from '../../i18n.jsx'

// «Сегодня» по дизайну «IELTS new» (Figma, раздел 1): заголовок с программой и форматом, блок цели с маскотом,
// задачи программы и «Зона роста» рядом, ниже — контроль недели. Быстрых действий и ссылки на словарь нет (ТЗ v4);
// подробный прогресс — по ссылке из блока цели. Live-ученик видит ближайший урок из расписания JTS.
export default function TodayTab({ data, lesson, onStartPlanTask, onMarkPlanTask, onStartStep, onOpenPlan, onOpenProgress, onEditGoal, onTrain, onOpenLessons }) {
  const { t } = useI18n()
  const prog = data.programme
  const e = prog?.enrollment
  const live = e?.studyMode === 'live'
  return (
    <div className="ih-today ih-today--v4">
      <StartBanner step={startStep(data.profile)} onGo={(step) => onStartStep?.(step)} />
      <PageHeader
        title={t('ieltsHub.tab.today')}
        sub={e?.programmeName || null}
        chip={e?.programmeName ? t(live ? 'ieltsToday.mode.live' : 'ieltsToday.mode.self') : null}
      />
      <GoalBanner
        deadline={prog?.deadline}
        journey={data.journey}
        growthSkill={data.growthZone?.skill}
        onEditGoal={onEditGoal}
        onOpenProgress={onOpenProgress}
        onDiagnostic={() => onStartStep?.('diagnostic')}
      />
      <div className="ih-today__row">
        <TodayTasksCard programme={prog} live={live} lesson={lesson} onStartTask={onStartPlanTask} onMark={onMarkPlanTask} onOpenPlan={onOpenPlan} onOpenLessons={onOpenLessons} />
        <GrowthCard growth={data.growthZone} onTrain={onTrain} />
      </div>
      <WeeklyControlStrip control={prog?.weeklyControl} onStart={onStartPlanTask} />
    </div>
  )
}
