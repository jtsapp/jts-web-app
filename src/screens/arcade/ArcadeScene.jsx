import { useI18n } from '../../i18n.jsx'

// Сцена «Аркады» — векторный лес из javaTest (src/components/ForestScene.tsx).
// Дерево и пила — те же персонажи, холмы и ели перекрашены в сумеречную
// фиолетовую гамму JTS.

// Персонажи отдельно от сцены: их же рисует карточка «Аркады» в Практике.
export function SawArt() {
  return (
    <svg viewBox="0 0 175 100" className="ar-saw__motor" aria-hidden="true">
      <path
        className="ar-saw__chain"
        d="M61 43H150Q174 43 168 60Q165 68 151 68H61"
        fill="#c6ceca"
        stroke="#87958f"
        strokeWidth="5"
        strokeDasharray="4 3"
      />
      <path d="M74 54H151" stroke="#71837c" strokeWidth="3" />
      <path d="M25 45V22Q25 16 34 16H63Q71 16 71 26V44" fill="none" stroke="#111f21" strokeWidth="9" />
      <rect x="10" y="39" width="77" height="46" rx="12" fill="#f57a52" />
      <rect x="3" y="45" width="15" height="31" rx="6" fill="#263535" />
      <path d="M57 49v23m7-23v23m7-23v23" stroke="#b75236" strokeWidth="3" />
      <g className="ar-saw__wheel">
        <circle cx="34" cy="60" r="10" fill="#ffc38b" />
        <path d="M27 60h14M34 53v14" stroke="#c26743" strokeWidth="2" />
      </g>
      <rect x="23" y="79" width="51" height="8" rx="4" fill="#142121" />
    </svg>
  )
}

export function TreeArt({ lost = false }) {
  return (
    <svg viewBox="0 0 180 225" className="ar-tree__canopy" aria-hidden="true">
      <ellipse cx="90" cy="213" rx="48" ry="8" fill="#120a2c" opacity=".45" />
      <path d="M82 205L84 112H100L103 205L118 213H68Z" fill="#bc9063" />
      <path d="M91 166L65 145M95 145L118 124" stroke="#bc9063" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M90 14C46 11 39 40 39 56C10 61 8 104 28 117C18 149 55 165 79 152C107 175 132 151 134 139C175 141 181 102 157 85C166 50 144 28 122 32C115 19 104 14 90 14"
        fill="#85b883"
      />
      <path
        d="M29 118Q51 135 76 115Q104 145 137 115Q157 111 163 96C177 128 155 144 134 139C125 164 99 164 79 152C54 164 21 150 29 118"
        fill="#6d9f71"
      />
      <path d="M54 61Q57 42 76 40" stroke="#b0d3a0" strokeWidth="8" fill="none" strokeLinecap="round" />
      <ellipse className="ar-tree__eye" cx="74" cy="98" rx="4" ry="6" fill="#233f33" />
      <ellipse className="ar-tree__eye" cx="109" cy="98" rx="4" ry="6" fill="#233f33" />
      <path
        d={lost ? 'M84 118q8-9 16 0' : 'M84 112q8 10 16 0'}
        fill="none"
        stroke="#233f33"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <ellipse cx="64" cy="109" rx="7" ry="4" fill="#dfa28b" />
      <ellipse cx="119" cy="109" rx="7" ry="4" fill="#dfa28b" />
    </svg>
  )
}

// Сцена целиком. Положение пилы задаёт только `danger` (0 — у края, 1 — у
// дерева); позу дерева меняют классы, а часы анимаций не трогаются — так
// дерево «дышит» и в покое, и между раундами.
export default function ArcadeScene({ danger, speaking, running = false }) {
  const { t } = useI18n()
  const lost = danger >= 0.99999
  const cls = ['ar-forest', running && 'is-running', speaking && 'is-speaking', danger > 0.7 && 'is-danger', lost && 'is-lost']
    .filter(Boolean)
    .join(' ')
  return (
    <div className={cls}>
      <svg className="ar-landscape" viewBox="0 0 1000 280" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path d="M0 185Q170 115 350 190T690 175T1000 150V280H0Z" fill="#2a1b5e" />
        <path d="M0 227Q240 160 460 220T1000 190V280H0Z" fill="#36236f" />
        {[65, 140, 265, 620, 700, 940].map((x, i) => (
          <g key={x} opacity=".2" transform={`translate(${x},${90 + (i % 3) * 20})`}>
            <path d="M0 100V25M-28 75L0 15L28 75ZM-21 48L0 0L21 48Z" fill="#b39cf5" stroke="#b39cf5" strokeWidth="5" />
          </g>
        ))}
        <path d="M30 254Q470 244 965 254" stroke="#6f58bf" strokeWidth="2" fill="none" />
        {[40, 190, 330, 490, 580, 730, 930].map((x) => (
          <path key={x} d={`M${x} 252l-5-9m5 9l5-6`} stroke="#9a86e0" fill="none" />
        ))}
      </svg>
      <div className="ar-fireflies" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ left: `${12 + i * 11}%`, top: `${20 + (i % 3) * 16}%`, animationDelay: `${i * 0.7}s` }} />
        ))}
      </div>
      <div className="ar-leaves" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div
        className="ar-saw"
        style={{
          left: `calc(4% + (var(--ar-tree-center) - 4% - var(--ar-saw-size)) * ${Math.max(0, Math.min(1, danger))})`,
        }}
        role="img"
        aria-label={t('arcade.scene.saw')}
      >
        <SawArt />
        <div className="ar-sawdust" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="ar-tree" role="img" aria-label={t(lost ? 'arcade.scene.treeLost' : 'arcade.scene.treeSafe')}>
        <TreeArt lost={lost} />
      </div>
      <span className="ar-caption">
        {t(lost ? 'arcade.scene.captionLost' : speaking ? 'arcade.scene.captionSpeaking' : 'arcade.scene.captionIdle')}
      </span>
    </div>
  )
}
