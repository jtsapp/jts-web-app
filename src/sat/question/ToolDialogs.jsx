import { useEffect, useRef } from 'react'
import { CloseIcon } from '../../ielts/icons.jsx'
import { useI18n } from '../../i18n.jsx'

// Нет в Figma: окна справочника, черновика и инструкции — адаптация прототипа question.js (referenceSheet,
// openScratchpad, directionsFor); в макете есть только их кнопки.
/** Окно инструмента поверх вопроса: справочник, черновик, инструкция. Esc и фон закрывают, фокус — на закрытии. */
export function SatModal({ title, onClose, wide, children }) {
  const { t } = useI18n()
  const closeRef = useRef(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="ih-dialog" role="presentation" onClick={onClose}>
      <div className={`st-modal ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="st-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="st-navdlg__head">
          <h2 id="st-modal-title">{title}</h2>
          <button ref={closeRef} type="button" className="ih-round st-navdlg__close" aria-label={t('sat.run.close')} onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ---- Справочник Math: фигуры и формулы листа Digital SAT, по-английски, как в тесте (порт referenceSheet прототипа) ----
const I = (v) => `<tspan font-style="italic">${v}</tspan>`
const svg = (body) =>
  `<svg viewBox="0 0 160 110" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" font-family="Georgia, 'Times New Roman', serif" font-size="15">${body}</svg>`
const txt = (x, y, v, extra = '') => `<text x="${x}" y="${y}" fill="currentColor" stroke="none" text-anchor="middle"${extra}>${v}</text>`
const sq = (x, y, dx, dy) => `<path d="M${x} ${y + dy}h${dx}v${-dy}" stroke-width="1.2"/>`
const frac = (a, b) => `<span class="st-frac"><span>${a}</span><span>${b}</span></span>`
const dash = 'stroke-dasharray="4 3" stroke-width="1.1"'

const FIGURES = [
  { name: 'Circle', f: 'A = &pi;<i>r</i><sup>2</sup><br>C = 2&pi;<i>r</i>', d: svg(`<circle cx="80" cy="55" r="45"/><circle cx="80" cy="55" r="2.6" fill="currentColor"/><line x1="80" y1="55" x2="125" y2="55"/>${txt(102, 48, I('r'))}`) },
  { name: 'Rectangle', f: 'A = &#8467;<i>w</i>', d: svg(`<rect x="25" y="30" width="100" height="55"/>${txt(75, 22, I('&#8467;'))}${txt(138, 62, I('w'))}`) },
  { name: 'Triangle', f: `A = ${frac(1, 2)}<i>bh</i>`, d: svg(`<path d="M15 90 L65 20 L145 90 Z"/><line x1="65" y1="20" x2="65" y2="90" stroke-dasharray="4 3" stroke-width="1.2"/>${sq(65, 80, 10, 10)}${txt(74, 52, I('h'))}${txt(80, 106, I('b'))}`) },
  { name: 'Pythagorean theorem', f: '<i>c</i><sup>2</sup> = <i>a</i><sup>2</sup> + <i>b</i><sup>2</sup>', d: svg(`<path d="M40 15 L40 90 L140 90 Z"/>${sq(40, 80, 10, 10)}${txt(28, 57, I('b'))}${txt(94, 46, I('c'))}${txt(90, 106, I('a'))}`) },
  { name: 'Special right triangle 30°-60°-90°', f: 'sides <i>x</i>, <i>x</i>&radic;3, 2<i>x</i>', d: svg(`<path d="M15 85 L135 85 L135 16 Z"/>${sq(125, 75, 10, 10)}${txt(66, 44, `2${I('x')}`)}${txt(148, 56, I('x'))}${txt(75, 104, `${I('x')}&radic;3`)}${txt(42, 80, '30&deg;', ' font-size="12"')}${txt(120, 36, '60&deg;', ' font-size="12"')}`) },
  { name: 'Special right triangle 45°-45°-90°', f: 'sides <i>s</i>, <i>s</i>, <i>s</i>&radic;2', d: svg(`<path d="M45 15 L45 90 L120 90 Z"/>${sq(45, 80, 10, 10)}${txt(33, 57, I('s'))}${txt(82, 106, I('s'))}${txt(102, 46, `${I('s')}&radic;2`)}${txt(56, 34, '45&deg;', ' font-size="12"')}${txt(100, 85, '45&deg;', ' font-size="12"')}`) },
  { name: 'Rectangular solid', f: 'V = &#8467;<i>wh</i>', d: svg(`<path d="M20 45 L105 45 L105 90 L20 90 Z"/><path d="M20 45 L45 25 L130 25 L105 45"/><path d="M130 25 L130 70 L105 90"/>${txt(62, 106, I('&#8467;'))}${txt(126, 90, I('w'))}${txt(142, 50, I('h'))}`) },
  { name: 'Cylinder', f: 'V = &pi;<i>r</i><sup>2</sup><i>h</i>', d: svg(`<ellipse cx="75" cy="22" rx="45" ry="12"/><path d="M30 22 V88"/><path d="M120 22 V88"/><path d="M30 88 A45 12 0 0 0 120 88"/><path d="M30 88 A45 12 0 0 1 120 88" ${dash}/><circle cx="75" cy="22" r="2.6" fill="currentColor"/><line x1="75" y1="22" x2="118" y2="17"/>${txt(98, 13, I('r'))}${txt(137, 60, I('h'))}`) },
  { name: 'Sphere', f: `V = ${frac(4, 3)}&pi;<i>r</i><sup>3</sup>`, d: svg(`<circle cx="80" cy="55" r="45"/><path d="M35 55 A45 12 0 0 0 125 55"/><path d="M35 55 A45 12 0 0 1 125 55" ${dash}/><circle cx="80" cy="55" r="2.6" fill="currentColor"/><line x1="80" y1="55" x2="125" y2="55"/>${txt(102, 48, I('r'))}`) },
  { name: 'Cone', f: `V = ${frac(1, 3)}&pi;<i>r</i><sup>2</sup><i>h</i>`, d: svg(`<path d="M35 85 L80 10 L125 85"/><path d="M35 85 A45 12 0 0 0 125 85"/><path d="M35 85 A45 12 0 0 1 125 85" ${dash}/><line x1="80" y1="10" x2="80" y2="85" stroke-width="1.2"/><line x1="80" y1="85" x2="125" y2="85" stroke-width="1.2"/>${sq(80, 77, 8, 8)}${txt(72, 55, I('h'))}${txt(103, 80, I('r'))}`) },
  { name: 'Rectangular pyramid', f: `V = ${frac(1, 3)}&#8467;<i>wh</i>`, d: svg(`<path d="M20 88 L105 88 L135 62"/><path d="M20 88 L50 62 L135 62" ${dash}/><path d="M78 12 L20 88"/><path d="M78 12 L105 88"/><path d="M78 12 L135 62"/><line x1="78" y1="12" x2="78" y2="75" stroke-dasharray="4 3" stroke-width="1.2"/>${sq(78, 67, 8, 8)}${txt(70, 50, I('h'))}${txt(62, 104, I('&#8467;'))}${txt(130, 82, I('w'))}`) },
]
const FACTS = [
  'The number of degrees of arc in a circle is 360.',
  'The number of radians of arc in a circle is 2π.',
  'The sum of the measures in degrees of the angles of a triangle is 180.',
]

export function ReferenceSheet() {
  return (
    <div className="st-ref">
      <div className="st-ref__grid">
        {FIGURES.map((g) => (
          <figure key={g.name}>
            <span className="st-ref__fig" dangerouslySetInnerHTML={{ __html: g.d }} />
            <figcaption>
              <span className="st-ref__f" dangerouslySetInnerHTML={{ __html: g.f }} />
              <span className="st-ref__name">{g.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="st-ref__facts">{FACTS.map((f) => <p key={f}>{f}</p>)}</div>
    </div>
  )
}

/** Инструкция модуля — текст Digital SAT по-английски (язык теста), как directionsFor прототипа. */
export function Directions({ section, exam }) {
  const lines = section === 'math'
    ? [
        'The questions in this section address a number of important math skills.',
        'Use of a calculator is permitted for all questions.',
        'For a student-produced response, enter your answer in the box. Fractions and decimals are both accepted; do not enter symbols such as a percent sign or a dollar sign.',
      ]
    : [
        'The questions in this section address a number of important reading and writing skills.',
        'Each question includes one or more passages. Read each passage, then choose the best answer to the question based on the passage.',
        'All questions in this section are multiple choice with four answer choices. Each question has a single best answer.',
      ]
  if (exam) lines.push('Once you move past a module you cannot return to it.')
  return <div className="st-directions" lang="en">{lines.map((l) => <p key={l}>{l}</p>)}</div>
}

/** Черновик — один на сессию, сохраняется с ней (перезагрузка его не теряет). */
export function Scratchpad({ value, onChange }) {
  const { t } = useI18n()
  return (
    <textarea
      className="st-scratch"
      value={value}
      autoFocus
      aria-label={t('sat.run.scratch')}
      placeholder={t('sat.run.scratchHint')}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
