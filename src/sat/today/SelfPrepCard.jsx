import { useI18n } from '../../i18n.jsx'
import { plural } from '../../lib/plural.js'
import { ArrowForwardIcon, EventIcon } from '../../ielts/icons.jsx'
import { domainName } from '../names.js'
import { examLeft } from './todayTasks.js'

/**
 * «Самостоятельная подготовка» на «Сегодня» (фаза 7; Figma «NEW 2», 17:6902, состояния 17:7162): занятий по
 * расписанию больше нет — вместо блока занятия и заданий список дел с числами, а не меню разделов («12 ошибок ждут
 * разбора», а не «Перейти к ошибкам»). Строки — только с данными сервера (selfPrep в /mobile/sat/roadmap): строки
 * «Past papers», других тестов Bluebook и режима «времени мало» из макета ждут своих полей, поэтому их нет.
 * Строка о третьем месяце — информация, а не продажа: без цены, ведёт к куратору (решение ТЗ).
 */
export default function SelfPrepCard({ prep, exam, onErrors, onWeak, onBank, onBluebook, onCurator }) {
  const { t, lang } = useI18n()
  if (!prep) return null
  const left = examLeft(exam)
  const and = (list) => (list.length > 1 ? `${list.slice(0, -1).join(', ')}${t('sat.self7.and')}${list[list.length - 1]}` : list.join(''))
  const weak = prep.weakDomains || []
  const tests = prep.bluebookLeft || []

  const rows = [
    prep.openErrors > 0 && { key: 'errors', n: prep.openErrors, sub: t('sat.self7.errorsSub'), onGo: onErrors },
    weak.length > 0 && { key: 'weak', n: weak.length, sub: t('sat.self7.weakSub', { list: weak.map((d) => domainName(d, lang)).join(' · ') }), onGo: onWeak },
    prep.bankLeft > 0 && { key: 'bank', n: prep.bankLeft, sub: t('sat.self7.bankSub'), onGo: onBank },
    tests.length > 0 && { key: 'bluebook', n: tests.length, sub: t('sat.self7.bluebookSub', { list: and(tests.map(String)) }), onGo: onBluebook },
  ].filter(Boolean)

  return (
    <article className="st-card st-self7">
      <div className="st-self7__head">
        <div>
          <h2>{t('sat.phase.self')}</h2>
          <span>{t('sat.self7.sub')}</span>
        </div>
        {left && (
          <span className="st-tasks__chip">
            <EventIcon size={18} />
            {t('sat.self7.left', { when: plural(t, lang, left.unit === 'weeks' ? 'sat.time.weeksWord' : 'sat.today.daysWord', left.n) })}
          </span>
        )}
      </div>
      {rows.length > 0 ? (
        <ul className="st-self7__list">
          {rows.map((r) => (
            <li key={r.key}>
              <button type="button" className={`st-self7__row is-${r.key}`} onClick={r.onGo}>
                <b className="st-self7__n">{r.n}</b>
                <span className="st-self7__text">
                  {/* число стоит в плитке слева, поэтому формы ключа — без него: «ошибок ждут разбора» */}
                  <b>{plural(t, lang, `sat.self7.${r.key}`, r.n)}</b>
                  <small>{r.sub}</small>
                </span>
                <span className="st-self7__go"><ArrowForwardIcon size={18} /></span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="st-muted">{t('sat.self7.empty')}</p>
      )}
      {prep.offerChallenge && (
        <p className="st-self7__offer">
          {t('sat.self.challenge')}{' '}
          {/* куратора в данных сервера пока нет — ведём туда же, куда «Связаться с менеджером» */}
          <button type="button" className="st-link" onClick={onCurator}>{t('sat.self.ask')}</button>
        </p>
      )}
    </article>
  )
}
