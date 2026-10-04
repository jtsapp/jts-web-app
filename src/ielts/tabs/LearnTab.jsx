import SkillCard from '../ui/SkillCard.jsx'
import { readingAccuracy, readingSummary } from '../reading/catalog.js'
import { listeningAccuracy, listeningSummary } from '../listening/catalog.js'
import { writingSummary } from '../writing/writing.js'
import { speakingSummary } from '../speaking/speaking.js'
import { useI18n } from '../../i18n.jsx'

// Вкладка «Обучение» (Figma «Обучение — все тренажёры»): четыре карточки секций со входами в тренажёры.
// Все четыре секции — банк бэкенда. Квоту IELTS тратит только ИИ-оценка Writing и
// Speaking, и её запирают серверные роуты оценки (429), а не вход в задания: писать, говорить, сверяться с моделью и
// проверять себя можно и при исчерпанной квоте. Строки без экрана помечены «скоро».
// Пока каталог секции грузится, строка не пишет ни «ещё не начинали», ни пустую полоску: при первом заходе вкладка
// показывала нетронутые секции у ученика с десятком попыток. Пустая полоска (0 из N) не рисуется и после загрузки —
// в макете у неначатой строки только подпись.
function settle(rows, cat) {
  const loading = !cat || cat.status === 'loading'
  return rows.map((r) => {
    if (r.soon) return r
    if (loading) return { ...r, meta: null, progress: undefined }
    return r.progress && !r.progress.value ? { ...r, progress: undefined } : r
  })
}

export default function LearnTab({ catalog, listeningCatalog, writingCatalog, speakingCatalog, track, onOpenReading }) {
  const { t } = useI18n()

  const items = catalog.items
  const s = readingSummary(items, track)
  const acc = readingAccuracy(items)

  const reading = [
    {
      key: 'types',
      title: t('ieltsLearn.reading.types'),
      text: t('ieltsLearn.reading.typesText'),
      progress: { value: s.types.started, max: s.types.total || 12 },
      meta: s.types.started ? t('ieltsLearn.startedOf', { n: String(s.types.started), total: String(s.types.total) }) : t('ieltsLearn.notStarted'),
      onClick: () => onOpenReading('types'),
    },
    {
      key: 'drills',
      title: t('ieltsLearn.reading.drills'),
      text: t('ieltsLearn.reading.drillsText'),
      progress: { value: s.drills.started, max: s.drills.total || 8 },
      meta: s.drills.started ? t('ieltsLearn.startedOf', { n: String(s.drills.started), total: String(s.drills.total) }) : t('ieltsLearn.notStarted'),
      onClick: () => onOpenReading('drills'),
    },
    {
      key: 'texts',
      title: t('ieltsLearn.reading.texts'),
      text: t('ieltsLearn.reading.textsText'),
      meta: s.texts.done ? t('ieltsLearn.doneTasks', { n: String(s.texts.done) }) : t('ieltsLearn.notStarted'),
      onClick: () => onOpenReading('texts'),
    },
  ]

  const ls = listeningSummary(listeningCatalog?.items)
  const lAcc = listeningAccuracy(listeningCatalog?.items)
  const doneMeta = (x) => (x.done ? t('ieltsLearn.startedOf', { n: String(x.done), total: String(x.total) }) : t('ieltsLearn.notStarted'))
  const listening = [
    { key: 'tasks', title: t('ieltsLearn.listening.tasks'), text: t('ieltsLearn.listening.tasksText'), meta: doneMeta(ls.tasks), onClick: () => onOpenReading('listening-tasks') },
    { key: 'dictation', title: t('ieltsLearn.listening.dictation'), text: t('ieltsLearn.listening.dictationText'), progress: { value: ls.dictation.done, max: ls.dictation.total || 1 }, meta: doneMeta(ls.dictation), onClick: () => onOpenReading('listening-dictation') },
    { key: 'spelling', title: t('ieltsLearn.listening.spelling'), text: t('ieltsLearn.listening.spellingText'), progress: { value: ls.spelling.done, max: ls.spelling.total || 1 }, meta: doneMeta(ls.spelling), onClick: () => onOpenReading('listening-spelling') },
    { key: 'types', title: t('ieltsLearn.reading.types'), text: t('ieltsLearn.listening.typesText'), soon: true },
    { key: 'drills', title: t('ieltsLearn.reading.drills'), text: t('ieltsLearn.listening.drillsText'), soon: true },
  ]

  // Writing — банк бэкенда (часть 3): списки заданий открываются всегда, квоту тратит только ИИ-проверка работы
  const ws = writingSummary(writingCatalog?.items, track)
  const writing = [
    { key: 'task1', title: t('ieltsLearn.writing.task1'), text: t('ieltsLearn.writing.task1Text'), meta: doneMeta(ws.task1), onClick: () => onOpenReading('writing-task1') },
    { key: 'task2', title: t('ieltsLearn.writing.task2'), text: t('ieltsLearn.writing.task2Text'), meta: doneMeta(ws.task2), onClick: () => onOpenReading('writing-task2') },
    { key: 'guide', title: t('ieltsWriting.p.guide.title'), text: t('ieltsWriting.p.guide.home.text'), onClick: () => onOpenReading('writing-guide') },
    { key: 'works', title: t('ieltsLearn.writing.works'), text: t('ieltsLearn.writing.worksText'), onClick: () => onOpenReading('writing-works') },
  ]

  // Speaking — банк бэкенда (часть 4): отвечать, слушать себя и модели можно всегда, квоту тратит только ИИ-оценка
  const ss = speakingSummary(speakingCatalog?.items)
  const speaking = [
    { key: 'p1', title: t('ieltsLearn.speaking.p1'), text: t('ieltsLearn.speaking.p1Text'), meta: doneMeta(ss.part1), onClick: () => onOpenReading('speaking-part1') },
    { key: 'p2', title: t('ieltsLearn.speaking.p2'), text: t('ieltsLearn.speaking.p2Text'), meta: doneMeta(ss.part2), onClick: () => onOpenReading('speaking-part2') },
    { key: 'p3', title: t('ieltsLearn.speaking.p3'), text: t('ieltsLearn.speaking.p3Text'), meta: doneMeta(ss.part3), onClick: () => onOpenReading('speaking-part3') },
    { key: 'shadowing', title: 'Shadowing', text: t('ieltsLearn.speaking.shadowingText'), onClick: () => onOpenReading('speaking-shadowing') },
    { key: 'guide', title: t('ieltsSpeaking.strategy'), text: t('ieltsSpeaking.strategyText'), onClick: () => onOpenReading('speaking-guide') },
    { key: 'works', title: t('ieltsSpeaking.works'), text: t('ieltsSpeaking.worksText'), onClick: () => onOpenReading('speaking-works') },
  ]

  return (
    <div className="ih-learn">
      <SkillCard section="listening" subtitle={lAcc != null ? t('ieltsLearn.accuracy', { n: String(lAcc) }) : null} rows={settle(listening, listeningCatalog)} soonLabel={t('ieltsLearn.soon')} />
      <SkillCard
        section="reading"
        subtitle={acc != null ? t('ieltsLearn.accuracy', { n: String(acc) }) : null}
        rows={settle(reading, catalog)}
        soonLabel={t('ieltsLearn.soon')}
      />
      <SkillCard section="writing" rows={settle(writing, writingCatalog)} soonLabel={t('ieltsLearn.soon')} />
      <SkillCard section="speaking" rows={settle(speaking, speakingCatalog)} soonLabel={t('ieltsLearn.soon')} />
    </div>
  )
}
