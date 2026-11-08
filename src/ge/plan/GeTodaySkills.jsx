import { useState } from 'react'
import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { GePlate } from './GeTaskRow.jsx'
import { groupBySkill } from './todaySkills.js'

// «По навыкам» блока «Сегодня» (ТЗ v2.0, 5.2): плитка навыка — «2 задачи · 20 мин» и полоса выполненных задач.
// Нажатие раскрывает под плитками задачи этого навыка с «Начать», повторное — сворачивает; другая плитка — переключает.
// Строки рисует сам блок (renderRow): у них те же «Зачем», «Откроется» и главная кнопка, что и в виде «По порядку».

// Значок плитки — плашка того же цвета, что у задач навыка (GePlate); у аудирования и письма своих разделов плана нет,
// им — свои плашки. Все задачи навыка сделаны — зелёная галочка.
const PLATE = {
  lesson: 'course',
  listening: 'listening',
  reading: 'media_practice',
  speaking: 'ai_tutor',
  writing: 'writing',
  grammar: 'workbooks',
  vocab: 'vocabulary_sr',
}

export default function GeTodaySkills({ tasks, renderRow, focus = null }) {
  const { t, lang } = useI18n()
  const groups = groupBySkill(tasks, focus)
  const [openSkill, setOpenSkill] = useState(null)
  const open = groups.find((g) => g.skill === openSkill) || null
  return (
    <>
      <div className="ge-sk">
        {groups.map((g) => {
          const allDone = g.done === g.tasks.length
          return (
            <button
              key={g.skill}
              type="button"
              className={`ge-sk__tile${allDone ? ' is-done' : ''}`}
              aria-expanded={openSkill === g.skill}
              aria-controls={openSkill === g.skill ? 'ge-sk-open' : undefined}
              onClick={() => setOpenSkill((s) => (s === g.skill ? null : g.skill))}
            >
              <GePlate plate={allDone ? 'done' : PLATE[g.skill]} size={36} />
              <b>{t(`gePlan.skill.${g.skill}`)}</b>
              <span className="ge-sk__meta">
                {plural(t, lang, 'gePlan.skillTasks', g.tasks.length)} · {t('gePlan.min', { n: String(g.minutes) })}
              </span>
              <span className="ge-sk__bar" aria-hidden="true">
                <i style={{ width: `${Math.round((g.done / g.tasks.length) * 100)}%` }} />
              </span>
            </button>
          )
        })}
      </div>
      {open && (
        <div className="ge-sk__open" id="ge-sk-open">
          <h3>
            {t(`gePlan.skill.${open.skill}`)}
            <button type="button" className="ih-link" onClick={() => setOpenSkill(null)}>
              {t('gePlan.collapse')}
            </button>
          </h3>
          <ul className="ge-tasks">{open.tasks.map((task) => renderRow(task))}</ul>
        </div>
      )}
    </>
  )
}
