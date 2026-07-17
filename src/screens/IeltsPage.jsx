import LearningLayout from '../components/LearningLayout.jsx'
import {
  HeadphonesIcon,
  BookOpenIcon,
  PenLineIcon,
  MicIcon,
} from '../components/ieltsIcons.jsx'

// IELTS-style level check (mock exam). Landing screen — the four modules, the
// 9-band scale, and the start CTA. Ported from felix components/jts/IeltsScreen.
//
// Sections whose key is absent from LIVE_TARGETS render as a «Скоро» stub.
const LIVE_TARGETS = {
  writing: 'ielts-writing',
  listening: 'ielts-listening',
  reading: 'ielts-reading',
  speaking: 'ielts-speaking',
}

const MODULES = [
  {
    key: 'listening',
    Icon: HeadphonesIcon,
    title: 'Listening',
    desc: 'Записи с вопросами на понимание речи на слух',
    meta: '2 части · 6 вопросов',
    color: '#9047ff',
    bg: '#f1ecfb',
  },
  {
    key: 'reading',
    Icon: BookOpenIcon,
    title: 'Reading',
    desc: 'Текст с вопросами True/False/Not Given и на заполнение',
    meta: '1 текст · 4 вопроса',
    color: '#00a876',
    bg: '#e5f6ef',
  },
  {
    key: 'writing',
    Icon: PenLineIcon,
    title: 'Writing',
    desc: 'Task 1 (описание) + Task 2 (эссе), оценка ИИ',
    meta: '≈40 мин · 2 задания',
    color: '#e8892b',
    bg: '#fdf0e2',
  },
  {
    key: 'speaking',
    Icon: MicIcon,
    title: 'Speaking',
    desc: 'Устное интервью: 2 вопроса + монолог по карточке',
    meta: 'Part 1 + Part 2 · голос',
    color: '#e0364b',
    bg: '#fce8ea',
  },
]

// 0–9 band scale, IELTS-style. Shown as reference chips.
const BANDS = [
  { band: '4.0', cefr: 'A2' },
  { band: '5.0', cefr: 'B1' },
  { band: '6.0', cefr: 'B2' },
  { band: '7.0', cefr: 'C1' },
  { band: '8.0+', cefr: 'C2' },
]

export default function IeltsPage({ userLevel = 'A1', userName, token, onNav, onProfile, onGo }) {
  return (
    <LearningLayout userName={userName} userLevel={userLevel} active="ielts" token={token} onNav={onNav} onProfile={onProfile}>
      <div className="ie">
        <header className="ie__head">
          <div>
            <h1 className="ie__title">IELTS-тест уровня</h1>
            <p className="ie__sub">
              Полноценная проверка по 4 навыкам с оценкой по 9-балльной шкале
            </p>
          </div>
          <span className="ie-badge ie-badge--wip">В разработке</span>
        </header>

        <div className="ie-scale">
          <span className="ie-scale__label">Шкала band 0–9</span>
          <div className="ie-scale__chips">
            {BANDS.map((b) => (
              <span key={b.band} className="ie-scale__chip">
                <b>{b.band}</b>
                <span>· {b.cefr}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="ie-mods">
          {MODULES.map(({ key, Icon, title, desc, meta, color, bg }) => {
            const target = LIVE_TARGETS[key]
            const live = target !== undefined
            const inner = (
              <>
                <span className="ie-mod__ic" style={{ background: bg }}>
                  <Icon size={22} />
                </span>
                <span className="ie-mod__body">
                  <span className="ie-mod__top">
                    <span className="ie-mod__title">{title}</span>
                    <span className={`ie-badge ${live ? 'ie-badge--live' : 'ie-badge--soon'}`}>
                      {live ? 'Доступно' : 'Скоро'}
                    </span>
                  </span>
                  <span className="ie-mod__desc">{desc}</span>
                  <span className="ie-mod__meta" style={{ color }}>
                    {meta}
                  </span>
                </span>
              </>
            )

            return live ? (
              <button
                key={key}
                type="button"
                onClick={() => onGo?.(target)}
                className="ie-mod ie-mod--live"
                style={{ '--ie-mod-color': color }}
              >
                {inner}
              </button>
            ) : (
              <div key={key} className="ie-mod" style={{ '--ie-mod-color': color }}>
                {inner}
              </div>
            )
          })}
        </div>

        <div className="ie-cta">
          <button type="button" className="ie-btn" onClick={() => onGo?.('ielts-writing')}>
            Начать Writing
          </button>
          <button
            type="button"
            className="ie-btn ie-btn--ghost"
            onClick={() => onGo?.('ielts-progress')}
          >
            Мой прогресс
          </button>
        </div>
      </div>
    </LearningLayout>
  )
}
