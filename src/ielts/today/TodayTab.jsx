import StartBanner, { startStep } from './StartBanner.jsx'
import LessonBanner from './LessonBanner.jsx'
import DailyPlanCard from './DailyPlanCard.jsx'
import BandScoreCard from './BandScoreCard.jsx'
import QuickActionsCard from './QuickActionsCard.jsx'
import ExamRoadmapCard from './ExamRoadmapCard.jsx'

// Вкладка «Сегодня» — стартовый экран раздела (ТЗ §11): плашка урока, план дня
// слева, балл и быстрые действия справа, дорожка до экзамена во всю ширину.
// Раскладка из макета Screen MS; ниже 900px — одна колонка (ТЗ §5.2).
export default function TodayTab({ data, plan, onStartTask, onRebuild, onQuickAction, onLessonReport, onStartStep }) {
  return (
    <div className="ih-today">
      <StartBanner step={startStep(data.profile)} onGo={(step) => onStartStep?.(step)} />
      {data.lessonToday && <LessonBanner time={data.lessonToday.time} onReport={onLessonReport} />}
      <div className="ih-today__grid">
        <DailyPlanCard tasks={plan} onStart={onStartTask} onRebuild={onRebuild} />
        <div className="ih-today__side">
          <BandScoreCard
            overall={data.overall}
            bands={data.bands}
            targetBand={data.targetBand}
            forecast={data.forecast}
          />
          <QuickActionsCard vocabDue={data.vocabDue} onAction={onQuickAction} />
        </div>
      </div>
      <ExamRoadmapCard roadmap={data.roadmap} examDate={data.examDate} startDate={data.startDate} />
    </div>
  )
}
