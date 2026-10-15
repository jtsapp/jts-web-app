import { useI18n } from '../../i18n.jsx'
import { CheckCircleIcon } from '../../ielts/icons.jsx'
import { moduleNo } from '../model/mock.js'

/**
 * Лента прохождения (Figma SAT 31, 32): четыре модуля и перерыв. Сданный — зелёный с галочкой; текущий — залит цветом
 * секции (перерыв — чёрным); впереди — бледный цвет секции. Под названием — минуты и маршрут: «сложный» /
 * «базовый», а у ещё не выбранного второго модуля — «по модулю 1».
 * modules — модули прохождения с сервера; index — текущий модуль; phase — ready | module | break.
 */
export default function MockStrip({ modules, index, phase }) {
  const { t } = useI18n()
  const blocks = []
  modules.forEach((m, i) => {
    blocks.push({ kind: 'module', m, i })
    // перерыв стоит между секциями
    if (modules[i + 1] && modules[i + 1].section !== m.section) blocks.push({ kind: 'break', i })
  })
  return (
    <div className="st-card st-strip">
      {blocks.map((b) => {
        if (b.kind === 'break') {
          const now = phase === 'break' && index === b.i + 1
          const done = index > b.i + 1 || (index === b.i + 1 && phase !== 'break')
          return (
            <div key="break" className={`st-strip__b is-break ${now ? 'is-now' : ''} ${done ? 'is-done' : ''}`}>
              <b>{done && <CheckCircleIcon size={14} />}{t('sat.mock.break')}</b>
              <small>{t('sat.mock.min', { n: '10' })}</small>
            </div>
          )
        }
        const { m, i } = b
        const done = !!m.done
        const now = !done && i === index && phase !== 'break'
        let sub = t('sat.mock.min', { n: String(m.minutes) })
        if (m.route) sub += ` · ${t(`sat.mock.route.${m.route}`)}`
        else if (m.adaptive) sub += ` · ${t('sat.mock.byFirst')}`
        return (
          <div key={m.key} className={`st-strip__b is-${m.section} ${now ? 'is-now' : ''} ${done ? 'is-done' : ''}`}>
            <b>{done && <CheckCircleIcon size={14} />}{m.section === 'math' ? 'Math' : 'R&W'} · {moduleNo(m.key)}</b>
            <small>{sub}</small>
          </div>
        )
      })}
    </div>
  )
}
