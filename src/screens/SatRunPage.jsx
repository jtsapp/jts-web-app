import { useEffect, useMemo, useState } from 'react'
import QuestionScreen from '../sat/question/QuestionScreen.jsx'
import useSatSession from '../sat/question/useSatSession.js'
import { counts } from '../sat/question/session.js'
import { pick } from '../sat/model/profile.js'
import SAMPLE from '../sat/question/sample.json'
import TAXONOMY from '../sat/data/taxonomy.json'
import { useI18n } from '../i18n.jsx'
import { useSatTheme } from '../sat/theme.js'

const MODES = ['study', 'diagnostic', 'exam']
// Время образца: диагностика — мягкие 30 минут, модуль экзамена — 10 минут по стене часов (чтобы увидеть красные
// последние пять минут, не ожидая полчаса)
const TIMING = { study: {}, diagnostic: { durationSec: 30 * 60, soft: true }, exam: { durationSec: 10 * 60, wallClock: true } }

function readMode() {
  try {
    const v = new URLSearchParams(window.location.search).get('satSample')
    return MODES.includes(v) ? v : 'study'
  } catch {
    return 'study'
  }
}

/**
 * Образец экрана вопроса (фаза 3): общий Bluebook-экран на восьми вопросах банка (R&W и Math, выбор и ввод
 * числа) во всех трёх режимах — `?screen=sat-run&satSample=study|diagnostic|exam`. Из меню сюда не ведёт ничего:
 * это стенд для проверки вида и поведения, как `?ieltsSample=1`. Настоящие прохождения (диагностика, учебная сессия,
 * пробник) приходят в фазах 4, 5, 7 и берут тот же QuestionScreen. Ключей у образца нет — «Проверить» появится с
 * учебным режимом (фаза 5), когда ответы проверяет сервер.
 */
export default function SatRunPage({ onNav }) {
  const { t, lang } = useI18n()
  useSatTheme()
  const [mode, setMode] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => setMode(readMode()), [])

  const spec = useMemo(
    () => mode && { key: `sample-${mode}`, mode, questions: SAMPLE.map((q) => ({ id: q.id, section: q.section })), timing: TIMING[mode] },
    [mode],
  )
  const { session, update, clear } = useSatSession(spec)
  const docs = useMemo(() => Object.fromEntries(SAMPLE.map((q) => [q.id, q])), [])

  if (done) {
    // Нет в Figma: конец образца — только для стенда, настоящие итоги придут с фазами 4, 5, 7
    return (
      <div className="ih st st-run st-run--done">
        <div className="ih-empty">
          <h2>{t('sat.sample.doneTitle')}</h2>
          <p>{t('sat.sample.doneText', { a: String(done.answered), n: String(done.total) })}</p>
          <button type="button" className="ih-cta" onClick={() => onNav?.('sat')}>{t('sat.sample.toHub')}</button>
        </div>
      </div>
    )
  }
  if (!session) return <div className="ih st st-run" />

  const q = session.questions[session.index]
  const doc = docs[q.id]
  const skill = TAXONOMY.skills.find((s) => s.id === doc.skillId)
  const domain = TAXONOMY.domains.find((d) => d.id === skill?.domain)
  const sectionName = q.section === 'math' ? 'Math' : 'Reading and Writing'
  const n = String(session.index + 1)
  const total = String(session.questions.length)
  let title
  let subtitle
  if (mode === 'study') {
    title = t('sat.sample.studyTitle', { skill: skill ? pick({ en: skill.name_en, ru: skill.name_ru, kk: skill.name_kk }, lang) : '' })
    subtitle = t('sat.sample.studySub', { n, total })
  } else if (mode === 'diagnostic') {
    title = t('sat.sample.diagTitle', { section: sectionName })
    subtitle = domain ? pick({ en: domain.name_en, ru: domain.name_ru, kk: domain.name_kk }, lang) : ''
  } else {
    title = t('sat.sample.examTitle', { section: sectionName })
    subtitle = t('sat.sample.examSub')
  }

  return (
    <QuestionScreen
      session={session}
      onChange={update}
      docs={docs}
      title={title}
      subtitle={subtitle}
      setLabel={t(`sat.sample.label.${mode}`)}
      onExit={() => onNav?.('sat')}
      onFinish={() => {
        setDone(counts(session))
        clear()
      }}
      study={mode === 'study' ? {
        skillLabel: (d) => {
          const s = TAXONOMY.skills.find((x) => x.id === d.skillId)
          const dm = TAXONOMY.domains.find((x) => x.id === s?.domain)
          const name = (o) => (o ? pick({ en: o.name_en, ru: o.name_ru, kk: o.name_kk }, lang) : '')
          return [name(dm), name(s)].filter(Boolean).join(' · ')
        },
      } : undefined}
    />
  )
}
