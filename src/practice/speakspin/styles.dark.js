// Тёмный слой «speakspin» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const SPEAKSPIN_DARK_CSS = `:host([data-theme="dark"]) html:has(.ss) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .ss {
    --ink: var(--dk-text);
    --muted: var(--dk-text-2);
    --purple: var(--dk-acc);
    --deep: var(--dk-acc-strong);
    --line: var(--dk-line);
    --soft: var(--dk-page);
    --blue: var(--dk-blue-tint);
    --green: var(--dk-green);
    color: var(--ink);
    background: radial-gradient(ellipse at 76% 20%,color-mix(in oklab, var(--dk-acc-tint) 60%, transparent),transparent 44%),var(--dk-page)
}
:host([data-theme="dark"]) .ss button, :host([data-theme="dark"]) .ss select {
    color: inherit
}
:host([data-theme="dark"]) .ss button {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .ss :focus-visible {
    outline: 3px solid var(--dk-blue)
}
:host([data-theme="dark"]) .ss .header {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .ss .brand-icon {
    background: var(--dk-ink-bg);
    color: white
}
:host([data-theme="dark"]) .ss .brand small {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .lang {
    background: var(--dk-chip)
}
:host([data-theme="dark"]) .ss .lang [aria-pressed=true] {
    background: var(--dk-card);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.094);
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .eyebrow {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .hero p {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .tagline {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .tagline span {
    background: var(--purple)
}
:host([data-theme="dark"]) .ss .steps {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .steps b {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .ss .steps .active {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .steps .active b {
    background: var(--purple);
    border-color: var(--purple);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .ss .panel {
    background: var(--dk-card);
    border: 1px solid var(--line);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.024)
}
:host([data-theme="dark"]) .ss .big-line em {
    color: var(--purple)
}
:host([data-theme="dark"]) .ss .subcopy {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss fieldset {
    border: 0
}
:host([data-theme="dark"]) .ss .level {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .ss .level small {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .level[aria-pressed=true] {
    background: var(--soft);
    border-color: var(--dk-acc);
    box-shadow: 0 0 0 1px var(--dk-acc) inset;
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .level-note {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .segmented {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .ss .segmented [aria-pressed=true] {
    background: var(--dk-card);
    color: var(--deep);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.125)
}
:host([data-theme="dark"]) .ss .muted {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .mode-note {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .spinner-panel {
    background: linear-gradient(140deg,var(--dk-card) 30%,var(--dk-page))
}
:host([data-theme="dark"]) .ss .panel-top {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .counter {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .ss .reel-card {
    background: var(--dk-card);
    border: 1px solid var(--dk-acc-line);
    box-shadow: 0 5px 15px color-mix(in oklab, var(--dk-acc) 3.137%, transparent)
}
:host([data-theme="dark"]) .ss .reel-card b {
    background: var(--dk-page);
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .reel-card.center {
    background: linear-gradient(115deg,var(--dk-acc),var(--dk-acc));
    color: var(--dk-on-acc);
    border-color: transparent;
    box-shadow: 0 14px 30px color-mix(in oklab, var(--dk-acc) 16.471%, transparent)
}
:host([data-theme="dark"]) .ss .reel-card.center b {
    background: #ffffff24;
    color: white
}
:host([data-theme="dark"]) .ss .pointer {
    background: var(--purple)
}
:host([data-theme="dark"]) .ss .primary {
    background: var(--purple);
    color: var(--dk-on-acc);
    box-shadow: 0 5px 12px color-mix(in oklab, var(--dk-acc) 10.196%, transparent)
}
:host([data-theme="dark"]) .ss .primary:hover:not(:disabled) {
    background: var(--deep)
}
:host([data-theme="dark"]) .ss .spin-info {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .spin-info b {
    color: var(--ink)
}
:host([data-theme="dark"]) .ss .privacy-note {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .link {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .secondary {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .ss .secondary:hover {
    background: var(--soft)
}
:host([data-theme="dark"]) .ss .bottom-note {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .bottom-note strong {
    color: var(--ink)
}
:host([data-theme="dark"]) .ss .status-pill {
    color: var(--green);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .ss .status-pill i {
    background: currentColor
}
:host([data-theme="dark"]) .ss .status-pill.live {
    color: var(--dk-red);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .ss .session-strip {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .badge {
    background: var(--soft);
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .support {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .ss .think-points {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .word {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .ss .word summary {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .word[open] {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .ss .translation {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .starters {
    border-left: 2px solid var(--dk-acc)
}
:host([data-theme="dark"]) .ss .support-hint {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .timer circle {
    fill: none
}
:host([data-theme="dark"]) .ss .timer .track {
    stroke: var(--soft)
}
:host([data-theme="dark"]) .ss .timer .arc {
    stroke: var(--purple)
}
:host([data-theme="dark"]) .ss .timer small {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .timer.urgent .arc {
    stroke: var(--dk-red)
}
:host([data-theme="dark"]) .ss .timer.urgent strong {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .ss .mic-status {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .callout {
    border: 1px solid var(--dk-acc-line);
    background: var(--dk-page);
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .callout.error {
    border-color: var(--dk-line);
    background: var(--dk-page);
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .ss .loading {
    border: 2px solid var(--dk-acc-line);
    border-top-color: var(--purple)
}
:host([data-theme="dark"]) .ss .review-side p {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .danger {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .ss .attempts {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .ss .attempts h3 {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .attempt-row {
    border: 1px solid transparent
}
:host([data-theme="dark"]) .ss .attempt-row[aria-pressed=true] {
    background: var(--soft);
    border-color: var(--line);
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .attempt-row small {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .stats {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .stats b {
    color: var(--ink)
}
:host([data-theme="dark"]) .ss .criterion {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .ss .criterion b {
    color: var(--deep)
}
:host([data-theme="dark"]) .ss .criterion p {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .fix {
    background: var(--dk-page);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .ss .fix small {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .fix .why {
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .sample {
    background: var(--soft)
}
:host([data-theme="dark"]) .ss .sr-only {
    border: 0
}
:host([data-theme="dark"]) .ss .footer {
    border-top: 1px solid var(--line);
    color: var(--muted)
}
:host([data-theme="dark"]) .ss .storage-note {
    color: var(--dk-orange)
}
@media (max-width:700px) {
    :host([data-theme="dark"]) .ss .timerbar:not([hidden]) {
        background: var(--dk-acc-deep);
        color: white;
        border: 1px solid var(--dk-line-strong);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.376)
    }
    :host([data-theme="dark"]) .ss .timerbar button {
        background: var(--dk-card);
        color: var(--dk-acc-text)
    }
}
@media (max-width:560px) {
    :host([data-theme="dark"]) .ss {
        background: var(--dk-page)
    }
    :host([data-theme="dark"]) .ss .steps li {
        color: var(--dk-muted)
    }
    :host([data-theme="dark"]) .ss .steps li::before {
        background: var(--dk-acc-tint)
    }
    :host([data-theme="dark"]) .ss .steps .active::before {
        background: var(--dk-acc)
    }
    :host([data-theme="dark"]) .ss .steps b {
        border: 0;
        background: none !important;
        color: inherit !important
    }
    :host([data-theme="dark"]) .ss .steps .active {
        color: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss .panel {
        box-shadow: none
    }
    :host([data-theme="dark"]) .ss .setup-form {
        border: 0;
        background: none
    }
    :host([data-theme="dark"]) .ss .eyebrow {
        color: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss .big-line {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .big-line em {
        color: inherit
    }
    :host([data-theme="dark"]) .ss .subcopy {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss legend {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .level {
        border: 2px solid var(--dk-line)
    }
    :host([data-theme="dark"]) .ss .level strong {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .level small {
        color: var(--dk-muted)
    }
    :host([data-theme="dark"]) .ss .level[aria-pressed=true] {
        background: var(--dk-acc-tint);
        border-color: var(--dk-acc);
        box-shadow: none
    }
    :host([data-theme="dark"]) .ss .level-note, :host([data-theme="dark"]) .ss .mode-note {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .split legend {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .segmented {
        background: var(--dk-chip)
    }
    :host([data-theme="dark"]) .ss .segmented button {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .segmented [aria-pressed=true] {
        color: var(--dk-text);
        box-shadow: none
    }
    :host([data-theme="dark"]) .ss .spinner-panel {
        border: 1px solid var(--dk-acc-line);
        background: var(--dk-page)
    }
    :host([data-theme="dark"]) .ss .panel-top {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .counter {
        border: 0;
        background: var(--dk-card);
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .reel-card {
        border-color: var(--dk-line);
        box-shadow: none;
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .reel-card b {
        background: none;
        color: var(--dk-muted)
    }
    :host([data-theme="dark"]) .ss .reel-card.center {
        background: var(--dk-acc);
        box-shadow: none;
        color: var(--dk-on-acc)
    }
    :host([data-theme="dark"]) .ss .reel-card.center b {
        background: none;
        color: var(--dk-acc-on)
    }
    :host([data-theme="dark"]) .ss .primary {
        background: var(--dk-acc);
        box-shadow: none
    }
    :host([data-theme="dark"]) .ss .primary:hover:not(:disabled) {
        background: var(--dk-acc)
    }
    :host([data-theme="dark"]) .ss .privacy-note {
        color: var(--dk-muted)
    }
    :host([data-theme="dark"]) .ss .session-strip {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .topic-panel {
        border: 0;
        background: var(--dk-acc-tint)
    }
    :host([data-theme="dark"]) .ss .badge {
        background: var(--dk-card);
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .topic-panel h2 {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .support {
        border-top: 0;
        background: var(--dk-yellow-tint)
    }
    :host([data-theme="dark"]) .ss .support>summary {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .timer-panel {
        border: 0;
        background: none
    }
    :host([data-theme="dark"]) .ss .timer .track {
        stroke: var(--dk-acc-on)
    }
    :host([data-theme="dark"]) .ss .timer .arc {
        stroke: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss .timer strong {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .timer-actions .link, :host([data-theme="dark"]) .ss .session-strip .link {
        color: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss.recording-view {
        background: linear-gradient(180deg,var(--dk-acc-deep) 0%,var(--dk-acc-deep) 100%);
        color: var(--dk-on-acc)
    }
    :host([data-theme="dark"]) .ss.recording-view .steps li {
        color: rgba(255,255,255,.6)
    }
    :host([data-theme="dark"]) .ss.recording-view .steps li::before {
        background: rgba(255,255,255,.18)
    }
    :host([data-theme="dark"]) .ss.recording-view .steps .active {
        color: #fff
    }
    :host([data-theme="dark"]) .ss.recording-view .steps .active::before {
        background: var(--dk-acc)
    }
    :host([data-theme="dark"]) .ss.recording-view .session-strip {
        color: rgba(255,255,255,.75)
    }
    :host([data-theme="dark"]) .ss.recording-view .topic-panel {
        background: none
    }
    :host([data-theme="dark"]) .ss.recording-view .badge {
        background: rgba(255,255,255,.12);
        color: var(--dk-acc-on)
    }
    :host([data-theme="dark"]) .ss.recording-view .topic-panel h2 {
        color: #fff
    }
    :host([data-theme="dark"]) .ss.recording-view .support {
        background: rgba(255,255,255,.08);
        color: #fff
    }
    :host([data-theme="dark"]) .ss.recording-view .support>summary, :host([data-theme="dark"]) .ss.recording-view .starters, :host([data-theme="dark"]) .ss.recording-view .think-points {
        color: #fff
    }
    :host([data-theme="dark"]) .ss.recording-view .status-pill.live {
        background: color-mix(in oklab, var(--dk-red) 18%, transparent);
        color: #ff9a9a
    }
    :host([data-theme="dark"]) .ss.recording-view .timer-label, :host([data-theme="dark"]) .ss.recording-view .timer strong {
        color: #fff
    }
    :host([data-theme="dark"]) .ss.recording-view .timer small, :host([data-theme="dark"]) .ss.recording-view .timer-panel .mic-status {
        color: rgba(255,255,255,.7)
    }
    :host([data-theme="dark"]) .ss.recording-view .timer .track {
        stroke: rgba(255,255,255,.15)
    }
    :host([data-theme="dark"]) .ss.recording-view .timer .arc {
        stroke: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss.recording-view .timer-actions .primary {
        background: var(--dk-card);
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .review-main {
        border-color: var(--dk-line)
    }
    :host([data-theme="dark"]) .ss .review-main .eyebrow {
        color: var(--dk-green)
    }
    :host([data-theme="dark"]) .ss .recording-meta {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .button-row button {
        border: 1px solid var(--dk-line);
        background: var(--dk-card);
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .attempts {
        border-color: var(--dk-line)
    }
    :host([data-theme="dark"]) .ss .attempts h3 {
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .attempt-row[aria-pressed=true] {
        background: var(--dk-page);
        border-color: transparent;
        color: var(--dk-text)
    }
    :host([data-theme="dark"]) .ss .review-side {
        border: 0;
        background: var(--dk-page)
    }
    :host([data-theme="dark"]) .ss .review-side p {
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .stats>span {
        border: 1px solid var(--dk-line);
        background: var(--dk-card);
        color: var(--dk-text-2)
    }
    :host([data-theme="dark"]) .ss .stats b {
        color: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss .criterion b {
        color: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss #jts-skip {
        border: 2px solid var(--dk-acc);
        background: var(--dk-card);
        color: var(--dk-acc-text)
    }
    :host([data-theme="dark"]) .ss .callout.error {
        border: 0;
        background: var(--dk-yellow-tint);
        color: var(--dk-orange)
    }
    :host([data-theme="dark"]) .ss .callout.error::before {
        background: currentColor
    }
    :host([data-theme="dark"]) .ss .error-box button {
        border: 0;
        background: var(--dk-acc);
        color: var(--dk-on-acc)
    }
}
`
