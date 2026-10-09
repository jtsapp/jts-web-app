import Chip from '../ui/Chip.jsx'
import PillButton from '../ui/PillButton.jsx'
import { ExpandMoreIcon, FlagIcon } from '../icons.jsx'
import { JUDGEMENT_OPTIONS, mechanicOf, typeLabel } from './meta.js'
import { isAnswered } from './run.js'
import { paragraphChoices } from './anchor.js'
import { useI18n } from '../../i18n.jsx'
import { safeSvg } from '../safeSvg.js'

// Схема к вопросам (diagram label) приходит SVG-строкой из банка — чистит её общий safeSvg (DOMPurify).

const numLabel = (numbers) => (numbers.length > 1 ? `${numbers[0]}–${numbers.at(-1)}` : String(numbers[0]))

// Строка ответа в тексте вопроса: «… made of 1 ____» → поле на месте пропуска. onBlur — Listening проверяет
// пропуск сразу после ответа (Figma 8: «Ответ проверяется сразу»), а не по кнопке.
function GapPrompt({ prompt, value, onChange, onBlur, disabled, ariaLabel, state, inputMode }) {
  const parts = String(prompt || '').split(/\d*\s*_{3,}/)
  const input = (
    <input
      className={`ih-gap ${state ? `ih-gap--${state}` : ''}`}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={onBlur ? (e) => e.key === 'Enter' && e.currentTarget.blur() : undefined}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={state === 'bad' || undefined}
      inputMode={inputMode}
      autoComplete="off"
      autoCapitalize="off"
      spellCheck={false}
    />
  )
  if (parts.length < 2) {
    return (
      <span className="ih-q__prompt">
        {prompt} {input}
      </span>
    )
  }
  return (
    <span className="ih-q__prompt">
      {parts[0]}
      {input}
      {parts.slice(1).join(' ____ ')}
    </span>
  )
}

// Вердикт по вопросу в «Тренировке» и «Разборе» и после сдачи: верно/нет, ключ, почему, где в тексте.
export function Feedback({ result, onShowInText }) {
  const { t, lang } = useI18n()
  if (!result) return null
  const r = result.reveal || {}
  const status = result.correct ? 'ok' : result.spellingOnly ? 'spelling' : 'wrong'
  const answer = [...(r.answer || []), ...(r.acceptable || [])].join(' / ')
  const why = r.explanation?.[lang] || r.explanation?.ru
  return (
    <div className={`ih-fb ih-fb--${status}`}>
      <div className="ih-fb__head">
        <b>{t(`ieltsReading.verdict.${status}`)}</b>
        {!result.correct && answer && <span>{t('ieltsReading.rightAnswer')}: <b>{answer}</b></span>}
        {result.trap && !result.correct && <Chip tone="muted" size="sm">{t(`ieltsReading.trap.${result.trap}`)}</Chip>}
      </div>
      {why && <p>{why}</p>}
      {onShowInText && (r.quote || r.textAnchor) && (
        <button type="button" className="ih-fb__link" onClick={onShowInText}>
          {t('ieltsReading.showInText')}
        </button>
      )}
    </div>
  )
}

/**
 * Группа вопросов: заголовок «Questions 1–3 · тип», инструкция, материал группы (список заголовков, вариантов,
 * пересказ, таблица, схема) и вопросы. Механик четыре (meta.MECHANIC): judgement, choice/multi, select, gap.
 */
// «Бумажный» бланк Listening (Figma 8): заголовок формы, строки с чёрным номером и полем внутри фразы, после
// проверки поле зелёное или красное, а рядом — чип «Правильно: 35 · цифра-ловушка».
function PaperGroup({ group, entries, run, mode, onAnswer, onCheck, onFocus, showFeedback }) {
  const { t } = useI18n()
  return (
    <div className="ih-paper">
      {group.title && <b className="ih-paper__title">{group.title}</b>}
      {entries.map((e) => {
        const value = run.answers[e.id]
        const checked = run.checked[e.id]
        const state = checked ? (checked.correct ? 'ok' : 'bad') : null
        const right = checked?.reveal?.answer?.[0]
        return (
          <div key={e.id} id={`ih-q-${e.id}`} className={`ih-paper__row ${run.current === e.id ? 'is-current' : ''}`} onFocusCapture={() => onFocus(e.id)}>
            <span className="ih-paper__num">{numLabel(e.numbers)}</span>
            <GapPrompt
              prompt={e.item.prompt}
              value={value}
              state={state}
              disabled={!!checked && mode === 'study'}
              onChange={(v) => onAnswer(e.id, v)}
              onBlur={mode !== 'exam' && isAnswered(value) && !checked ? () => onCheck(e.id) : undefined}
              ariaLabel={`${t('ieltsReading.answer')} ${numLabel(e.numbers)}`}
            />
            {checked && !checked.correct && right && (
              <Chip tone="red" size="sm">
                {t('ieltsListening.rightIs', { answer: right })}
                {checked.trap ? ` · ${t(`ieltsReading.trap.${checked.trap}`)}` : ''}
              </Chip>
            )}
            {checked && showFeedback && <Feedback result={checked} />}
          </div>
        )
      })}
    </div>
  )
}

export default function QuestionGroup({ group, entries, doc, run, mode, onAnswer, onFlag, onCheck, onShowInText, onFocus, checking, paper }) {
  const { t } = useI18n()
  const mech = mechanicOf(group.type)
  const first = entries[0]?.numbers[0]
  const last = entries.at(-1)?.numbers.at(-1)
  const list = group.headings || group.options || null
  const selectKeys = group.type === 'matching_information' ? paragraphChoices(doc, group.text) : (list || []).map((o) => o.key)
  const live = mode !== 'exam'

  return (
    <section className="ih-qgroup">
      <header className="ih-qgroup__head">
        <h3>{first === last ? `Question ${first}` : `Questions ${first}–${last}`}</h3>
        <Chip tone="orange" size="sm" className="ih-chip--reading">{typeLabel(group.type)}</Chip>
      </header>
      {group.instruction && <p className="ih-qgroup__ins">{group.instruction.replace(/^Questions? [\d–-]+\.\s*/, '')}</p>}

      {paper && mech === 'gap' && (
        <PaperGroup group={group} entries={entries} run={run} mode={mode} onAnswer={onAnswer} onCheck={onCheck} onFocus={onFocus} showFeedback={mode === 'study'} />
      )}
      {list && mech === 'select' && (
        <div className="ih-qlist">
          <b>{group.headings ? 'List of headings' : group.optionsTitle || t('ieltsReading.options')}</b>
          {list.map((o) => (
            <p key={o.key}><i>{o.key}</i>{o.text}</p>
          ))}
        </div>
      )}
      {group.summary && (
        <div className="ih-qlist ih-qlist--text">
          {group.title && <b>{group.title}</b>}
          <p>{group.summary}</p>
        </div>
      )}
      {group.table && (
        <div className="ih-qtable">
          <table>
            {group.table.caption && <caption>{group.table.caption}</caption>}
            {group.table.head && (
              <thead>
                <tr>{group.table.head.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {(group.table.rows || []).map((row, i) => (
                <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {group.steps && (
        <ol className="ih-qsteps">
          {group.steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      )}
      {group.figure?.svg && <div className="ih-qfigure" dangerouslySetInnerHTML={{ __html: safeSvg(group.figure.svg) }} />}
      {/* карта Listening (map_labelling): картинка из хранилища и буквы-маркеры поверх, доли ширины/высоты */}
      {group.image?.url && (
        <figure className="ih-qmap">
          <img src={group.image.url} alt={group.image.alt || ''} />
          {(group.markers || []).map((m) => (
            <span key={m.id} className="ih-qmap__mark" style={{ left: `${m.x * 100}%`, top: `${m.y * 100}%` }}>{m.id}</span>
          ))}
        </figure>
      )}

      {!(paper && mech === 'gap') && entries.map((e) => {
        const it = e.item
        const value = run.answers[e.id]
        const checked = run.checked[e.id]
        const locked = !!checked && mode === 'study'
        const current = run.current === e.id
        const set = (v) => onAnswer(e.id, v)
        const flagBtn = (
          <button type="button" className={`ih-q__flag ${run.flags[e.id] ? 'is-on' : ''}`} onClick={() => onFlag(e.id)} aria-pressed={!!run.flags[e.id]} aria-label={t('ieltsReading.flag')}>
            <FlagIcon size={20} />
          </button>
        )
        let control
        if (mech === 'judgement') {
          control = (
            <div className="ih-q__pills">
              {JUDGEMENT_OPTIONS[group.type].map((o) => (
                <button key={o} type="button" disabled={locked} className={`ih-pill ${value === o ? 'is-on' : ''}`} onClick={() => set(o)}>
                  {o}
                </button>
              ))}
            </div>
          )
        } else if (mech === 'choice' || mech === 'multi') {
          const need = mech === 'multi' ? e.numbers.length : 1
          const picked = mech === 'multi' ? value || [] : value ? [value] : []
          control = (
            <div className="ih-q__opts">
              {mech === 'multi' && <span className="ih-q__hint">{t('ieltsReading.chooseN', { n: String(need) })}</span>}
              {(it.options || []).map((o) => {
                const on = picked.includes(o.key)
                const toggle = () => {
                  if (mech === 'choice') return set(o.key)
                  const next = on ? picked.filter((k) => k !== o.key) : [...picked, o.key]
                  set(next.sort())
                }
                return (
                  <button key={o.key} type="button" disabled={locked} className={`ih-opt ${on ? 'is-on' : ''}`} onClick={toggle} aria-pressed={on}>
                    <i>{o.key}</i>
                    <span>{o.text}</span>
                  </button>
                )
              })}
              {mech === 'multi' && picked.length > need && <span className="ih-q__warn">{t('ieltsReading.tooMany', { n: String(need) })}</span>}
            </div>
          )
        }

        const head =
          mech === 'select' ? (
            <div className="ih-q__row">
              <span className="ih-q__num">{numLabel(e.numbers)}</span>
              <span className="ih-q__prompt ih-q__prompt--strong">{it.prompt}</span>
              <span className={`ih-select ${value ? 'is-set' : ''}`}>
                <select value={value || ''} disabled={locked} onChange={(ev) => set(ev.target.value)} aria-label={`${t('ieltsReading.answer')} ${numLabel(e.numbers)}`}>
                  <option value="">{t('ieltsReading.choose')}</option>
                  {selectKeys.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <ExpandMoreIcon size={18} />
              </span>
              {flagBtn}
            </div>
          ) : (
            <div className="ih-q__row ih-q__row--top">
              <span className="ih-q__num">{numLabel(e.numbers)}</span>
              {mech === 'gap' ? (
                <GapPrompt prompt={it.prompt} value={value} onChange={set} disabled={locked} ariaLabel={`${t('ieltsReading.answer')} ${numLabel(e.numbers)}`} />
              ) : (
                <span className="ih-q__prompt">{it.prompt}</span>
              )}
              {flagBtn}
            </div>
          )

        return (
          <div key={e.id} id={`ih-q-${e.id}`} className={`ih-q ${mech === 'select' ? 'ih-q--select' : ''} ${current ? 'is-current' : ''}`} onFocusCapture={() => onFocus(e.id)} onClick={() => onFocus(e.id)}>
            {head}
            {control}
            {live && !checked && (
              <div className="ih-q__check">
                <PillButton variant="soft" disabled={!isAnswered(value) || checking === e.id} onClick={() => onCheck(e.id)}>
                  {t('ieltsReading.check')}
                </PillButton>
              </div>
            )}
            {checked && <Feedback result={checked} onShowInText={() => onShowInText(checked)} />}
          </div>
        )
      })}
    </section>
  )
}
