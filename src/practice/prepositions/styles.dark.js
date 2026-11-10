// Тёмный слой «prepositions» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const PREPOSITIONS_DARK_CSS = `:host([data-theme="dark"]) {
    --bg: var(--dk-page);
    --ink: var(--dk-text);
    --ink2: var(--dk-text-2);
    --ink3: var(--dk-text-2);
    --v: var(--dk-acc-strong);
    --vt: var(--dk-acc-tint);
    --line: var(--dk-acc-line);
    --paper: var(--dk-card);
    --tr: var(--dk-green);
    --trbg: var(--dk-page);
    --trl: var(--dk-chip);
    --good: var(--dk-green);
    --goodbg: var(--dk-green-tint);
    --bad: var(--dk-red);
    --badbg: var(--dk-page);
    --note: var(--dk-yellow);
    --notebg: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .pw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--bg);
    color: var(--ink)
}
:host([data-theme="dark"]) a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: inherit
}
:host([data-theme="dark"]) button:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: inherit
}
:host([data-theme="dark"]) :focus-visible:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    outline: 3px solid var(--dk-yellow)
}
:host([data-theme="dark"]) .top:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: color-mix(in oklab, var(--dk-card) 95%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .logo:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: linear-gradient(135deg,var(--dk-acc),var(--dk-acc-strong));
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .bt small:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .stages:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .stages a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .stages .num:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    color: var(--v)
}
:host([data-theme="dark"]) .stages a.on:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) main:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    outline: none
}
:host([data-theme="dark"]) .btn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--v);
    background: var(--dk-card);
    color: var(--v)
}
:host([data-theme="dark"]) .btn.primary:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .btn.ghost:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--dk-acc-line);
    color: var(--ink2)
}
:host([data-theme="dark"]) .icon-btn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 1px solid var(--line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .kick:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: rgba(255,255,255,.85)
}
:host([data-theme="dark"]) .prog:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #ffd66b
}
:host([data-theme="dark"]) .tcard:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .wcard:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    box-shadow: 0 8px 24px color-mix(in oklab, var(--dk-acc) 9%, transparent);
    border: 2px solid transparent
}
:host([data-theme="dark"]) .tcard:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .wcard:not(.locked):hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v)
}
:host([data-theme="dark"]) .tfig:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .wfig:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-chip)
}
:host([data-theme="dark"]) .badge:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--good);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .tnum:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .tw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .tkk:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .trs:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--tr)
}
:host([data-theme="dark"]) .lockb:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #fff
}
:host([data-theme="dark"]) .wm:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .need:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .goplay:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .crumb:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .ls-world:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: rgba(255,255,255,.88)
}
:host([data-theme="dark"]) .ls-sheet:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--paper);
    box-shadow: 0 12px 32px color-mix(in oklab, var(--dk-acc) 7%, transparent)
}
:host([data-theme="dark"]) .ls-langbar:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .ls-seg:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .ls-seg button:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 0;
    background: transparent;
    color: var(--ink2)
}
:host([data-theme="dark"]) .ls-seg button[aria-pressed=true]:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 1px 2px color-mix(in oklab, var(--dk-acc) 14%, transparent)
}
:host([data-theme="dark"]) .ls-seg button[data-tr=kk][aria-pressed=true]:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .ls-seg button[data-tr=ru][aria-pressed=true]:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--tr)
}
:host([data-theme="dark"]) .hint:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .ls-rule:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .ls-rn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .pw .pw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .fig svg:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    box-shadow: 0 8px 22px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .fig figcaption:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .exh:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .ls-x:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 0;
    border-bottom: 1px solid var(--line);
    background: none
}
:host([data-theme="dark"]) .ls-x .w:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .ls-x svg:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .ls-x:hover svg:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .ls-trs:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--tr)
}
:host([data-theme="dark"]) .ls-note:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-left: 3px solid var(--dk-yellow-line);
    background: var(--notebg)
}
:host([data-theme="dark"]) .ls-note>span:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--note)
}
:host([data-theme="dark"]) .ls-tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 1px solid var(--trl);
    background: var(--trbg)
}
:host([data-theme="dark"]) .ls-tr .trh:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--tr)
}
:host([data-theme="dark"]) .ls-tr p:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .ls-tr .trt:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .ls-start:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: color-mix(in oklab, var(--dk-card) 96%, transparent);
    box-shadow: 0 10px 30px color-mix(in oklab, var(--dk-acc) 18%, transparent)
}
:host([data-theme="dark"]) .ls-src:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .ls-src a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .speak:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 1px solid var(--line);
    background: var(--dk-card);
    color: var(--v)
}
:host([data-theme="dark"]) .ring:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(255,255,255,.08)
}
:host([data-theme="dark"]) .ring.a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    stroke: #ffd23c
}
:host([data-theme="dark"]) .ring.b:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    stroke: #3fe0f5
}
:host([data-theme="dark"]) .arrow:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: none;
    stroke: #ffd23c
}
:host([data-theme="dark"]) .spot:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(255,210,60,.35);
    stroke: #ffd23c
}
:host([data-theme="dark"]) .tag rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: #fff;
    stroke: var(--v)
}
:host([data-theme="dark"]) .tag text:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: var(--ink)
}
:host([data-theme="dark"]) .hot rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(255,255,255,0);
    stroke: transparent
}
:host([data-theme="dark"]) .hot:hover rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .hot:focus rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(255,255,255,.22);
    stroke: #ffd23c
}
:host([data-theme="dark"]) .hot.good rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(40,200,120,.3);
    stroke: #1fd68a
}
:host([data-theme="dark"]) .hot.bad rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: color-mix(in oklab, var(--dk-red) 30%, transparent);
    stroke: var(--dk-red)
}
:host([data-theme="dark"]) .spot-hot circle:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(255,210,60,.35);
    stroke: #ffd23c
}
:host([data-theme="dark"]) .spot-hot text:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: #fff;
    stroke: var(--dk-acc-text)
}
:host([data-theme="dark"]) .spot-hot.good circle:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: rgba(40,200,120,.4);
    stroke: #1fd68a
}
:host([data-theme="dark"]) .spot-hot.bad circle:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: color-mix(in oklab, var(--dk-red) 40%, transparent);
    stroke: var(--dk-red)
}
:host([data-theme="dark"]) .art-place:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background-image: var(--x)
}
:host([data-theme="dark"]) .catn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #ffd66b
}
:host([data-theme="dark"]) .cat-tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #aef0e6 !important
}
:host([data-theme="dark"]) .lcard:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    box-shadow: 0 6px 18px color-mix(in oklab, var(--dk-acc) 8%, transparent);
    border: 2px solid transparent
}
:host([data-theme="dark"]) .lcard:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v)
}
:host([data-theme="dark"]) .lcard.done:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--dk-green-line)
}
:host([data-theme="dark"]) .lno:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt);
    color: var(--v)
}
:host([data-theme="dark"]) .lp:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .stp:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .stp.past:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-soft)
}
:host([data-theme="dark"]) .stp.cur:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .ls-pat:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .ls-pat span:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .tblw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .tbl:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .tbl th:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .tbl td:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .tbl thead th:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .tbl thead th:first-child:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-strong)
}
:host([data-theme="dark"]) .tbl tbody th:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt);
    color: var(--ink)
}
:host([data-theme="dark"]) .cell:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 0;
    background: none;
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .cell:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .cmpc:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .cmpl:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .coll li:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .coll .ls-x:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 0
}
:host([data-theme="dark"]) .coll .k:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .coll .ls-x .w:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .fig.diagf svg:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    box-shadow: none;
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .memory:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: linear-gradient(135deg,var(--dk-yellow-tint),var(--dk-yellow-tint));
    border: 1px solid var(--dk-yellow-line)
}
:host([data-theme="dark"]) .memory span:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--note)
}
:host([data-theme="dark"]) .ls-mis li:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .ls-mis li:first-child:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-top: 0
}
:host([data-theme="dark"]) .ls-pair .bad:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--bad);
    background: var(--badbg)
}
:host([data-theme="dark"]) .ls-pair .good:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--good);
    background: var(--goodbg)
}
:host([data-theme="dark"]) .ls-mis .why:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .plock:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .prow:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    border: 2px solid transparent;
    box-shadow: 0 4px 14px color-mix(in oklab, var(--dk-acc) 6%, transparent)
}
:host([data-theme="dark"]) .prow:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v)
}
:host([data-theme="dark"]) .prow .pt small:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .prow .go:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .prow .lk:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .final:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: linear-gradient(120deg,var(--dk-acc-strong),var(--dk-acc));
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .final h2:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #fff
}
:host([data-theme="dark"]) .final p:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: rgba(255,255,255,.9)
}
:host([data-theme="dark"]) .final .btn.primary:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-yellow);
    color: var(--dk-on-bright);
    border-color: var(--dk-yellow)
}
:host([data-theme="dark"]) .final .plock:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .gt small:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .pbar:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .pbar span:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .qbox:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    box-shadow: 0 12px 32px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .qtag:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .blank:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-bottom: 4px solid var(--v);
    color: var(--v)
}
:host([data-theme="dark"]) .hintq:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .wrongw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--bad);
    background: var(--badbg)
}
:host([data-theme="dark"]) .opt:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--dk-line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .opt:hover:not(:disabled):not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v);
    background: var(--vt)
}
:host([data-theme="dark"]) .opt .ol:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint);
    color: var(--v)
}
:host([data-theme="dark"]) .opt.good:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--good);
    background: var(--goodbg);
    color: var(--good)
}
:host([data-theme="dark"]) .opt.good .ol:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--good);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .opt.bad:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--bad);
    background: var(--badbg);
    color: var(--bad)
}
:host([data-theme="dark"]) .opt.bad .ol:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--bad);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .bub.l:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .bub.r:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-green-tint)
}
:host([data-theme="dark"]) .pgap:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px dashed var(--v);
    color: var(--v)
}
:host([data-theme="dark"]) .pgap.good:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--good);
    background: var(--goodbg);
    color: var(--good)
}
:host([data-theme="dark"]) .pgap.bad:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--bad);
    background: var(--badbg);
    color: var(--bad)
}
:host([data-theme="dark"]) .pgn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .fb.ok:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--goodbg);
    border: 1px solid var(--dk-green-line)
}
:host([data-theme="dark"]) .fb.no:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--badbg);
    border: 1px solid var(--dk-red-line)
}
:host([data-theme="dark"]) .fb.ok .fbt b:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .fb.no .fbt b:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .answ:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    border: 2px solid var(--good);
    color: var(--good)
}
:host([data-theme="dark"]) .fbm:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .fbm.tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--tr)
}
:host([data-theme="dark"]) .end:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    box-shadow: 0 12px 32px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .weak:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .weak a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .weak small:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .allok:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .pstage .hot:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    outline: none
}
:host([data-theme="dark"]) .pstage .hot rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: transparent;
    stroke: transparent
}
:host([data-theme="dark"]) .pstage .hot:hover rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .pstage .hot:focus-visible rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    stroke: rgba(255,255,255,.9);
    fill: rgba(255,255,255,.12)
}
:host([data-theme="dark"]) .pcap:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-deep);
    color: #fff
}
:host([data-theme="dark"]) .pstage .ntag rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: #fff;
    stroke: var(--dk-acc-text)
}
:host([data-theme="dark"]) .pstage .ntag text:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: var(--dk-text)
}
:host([data-theme="dark"]) .speak.aud.on:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) {
    --bg: var(--dk-page);
    --ink: var(--dk-text);
    --ink2: var(--dk-text-2);
    --ink3: var(--dk-text-2);
    --v: var(--dk-acc);
    --vd: var(--dk-acc-strong);
    --vt: var(--dk-acc-tint);
    --line: var(--dk-acc-line);
    --cy: var(--dk-blue);
    --gr: var(--dk-green);
    --or: var(--dk-orange);
    --ye: var(--dk-yellow-tint);
    --tr: var(--dk-green);
    --good: var(--dk-green);
    --goodbg: var(--dk-green-tint);
    --bad: var(--dk-orange);
    --badbg: var(--dk-yellow-tint);
    --note: var(--dk-yellow);
    --notebg: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) :focus-visible:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    outline: 3px solid var(--or)
}
:host([data-theme="dark"]) .top:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: color-mix(in oklab, var(--dk-card) 96%, transparent);
    border-bottom: 0;
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .jts:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    --lg: var(--dk-text);
    --lg-to: var(--dk-acc)
}
:host([data-theme="dark"]) .brand .bt:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-left: 2px solid var(--line)
}
:host([data-theme="dark"]) .bt b:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .stages:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .stages a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink2)
}
:host([data-theme="dark"]) .stages a:hover:not(.on):not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .stages .num:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .stages a.on:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc);
    box-shadow: 0 4px 12px color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .btn.primary:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    border-color: var(--v);
    box-shadow: 0 6px 16px color-mix(in oklab, var(--dk-acc) 32%, transparent)
}
:host([data-theme="dark"]) .btn.primary:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vd);
    border-color: var(--vd)
}
:host([data-theme="dark"]) .icon-btn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--line)
}
:host([data-theme="dark"]) .icon-btn:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v);
    background: var(--vt)
}
:host([data-theme="dark"]) .kick:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: rgba(255,255,255,.9)
}
:host([data-theme="dark"]) .chip:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--cy);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .chipbar:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: rgba(255, 255, 255, 0.18)
}
:host([data-theme="dark"]) .chipbar i:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: #141010
}
:host([data-theme="dark"]) .catn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--acc,#874bf8);
    color: var(--acci,#fff)
}
:host([data-theme="dark"]) .cat-tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #d6fbff !important
}
:host([data-theme="dark"]) .lcard:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .prow:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid transparent;
    box-shadow: 0 6px 20px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .lcard:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .prow:not(.locked):hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--acc,#874bf8);
    box-shadow: 0 12px 28px color-mix(in oklab, var(--dk-acc) 16%, transparent)
}
:host([data-theme="dark"]) .lno:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--acc,#874bf8);
    color: var(--acci,#fff)
}
:host([data-theme="dark"]) .lcard.done:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--dk-green-line)
}
:host([data-theme="dark"]) .badge:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--gr);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .lp:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .prow .go:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .pcat-h h2:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *))::before {
    background: var(--acc,#874bf8)
}
:host([data-theme="dark"]) .final:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .final:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *))::after {
    background: color-mix(in oklab, var(--dk-blue) 35%, transparent)
}
:host([data-theme="dark"]) .final .btn.primary:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--ye);
    color: var(--dk-text);
    border-color: var(--ye);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4)
}
:host([data-theme="dark"]) .final .btn.primary:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    border-color: var(--dk-line)
}
:host([data-theme="dark"]) .goplay:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-card);
    box-shadow: 0 6px 20px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .ls-sheet:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    box-shadow: 0 10px 30px color-mix(in oklab, var(--dk-acc) 9%, transparent)
}
:host([data-theme="dark"]) .ls-seg:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .ls-seg button[aria-pressed=true]:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v);
    box-shadow: 0 2px 6px color-mix(in oklab, var(--dk-acc) 20%, transparent)
}
:host([data-theme="dark"]) .ls-seg button[data-tr=kk][aria-pressed=true]:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .ls-seg button[data-tr=ru][aria-pressed=true]:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .stp:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .stp.past:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc)
}
:host([data-theme="dark"]) .stp.cur:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .ls-lead:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .ls-rn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .ls-x .w:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .ls-note:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-left-color: var(--or);
    background: var(--notebg)
}
:host([data-theme="dark"]) .memory:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-yellow-tint);
    border: 0;
    border-left: 5px solid var(--ye)
}
:host([data-theme="dark"]) .ls-tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-page);
    border-color: var(--dk-blue-line)
}
:host([data-theme="dark"]) .ls-tr .trh:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .ls-trs:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .tkk:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .trs:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) .cat-tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .ls-tr p:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .ls-tr .trt:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .ls-start:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    box-shadow: 0 12px 32px color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) .tbl thead th:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .tbl thead th:first-child:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-strong)
}
:host([data-theme="dark"]) .tbl tbody th:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .tblw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--line)
}
:host([data-theme="dark"]) .cell:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .cell:hover:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .cmpl:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .ls-pair .bad:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--badbg)
}
:host([data-theme="dark"]) .ls-pair .good:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--goodbg)
}
:host([data-theme="dark"]) .pbar:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .pbar span:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: linear-gradient(90deg,var(--v),var(--cy))
}
:host([data-theme="dark"]) .qbox:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    box-shadow: 0 12px 34px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .qtag:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .blank:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-bottom-color: var(--v);
    color: var(--v)
}
:host([data-theme="dark"]) .opt:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .opt:hover:not(:disabled):not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v);
    background: var(--vt);
    box-shadow: 0 8px 18px color-mix(in oklab, var(--dk-acc) 15%, transparent)
}
:host([data-theme="dark"]) .opt .ol:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt);
    color: var(--v)
}
:host([data-theme="dark"]) .opt.good:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--gr);
    background: var(--goodbg);
    color: var(--good)
}
:host([data-theme="dark"]) .opt.good .ol:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--gr);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .opt.bad:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--or);
    background: var(--badbg);
    color: var(--bad)
}
:host([data-theme="dark"]) .opt.bad .ol:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--or);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .bub.l:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .bub.r:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--dk-blue-tint)
}
:host([data-theme="dark"]) .pgap:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--v);
    color: var(--v)
}
:host([data-theme="dark"]) .pgap.good:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--gr);
    background: var(--goodbg);
    color: var(--good)
}
:host([data-theme="dark"]) .pgap.bad:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--or);
    background: var(--badbg);
    color: var(--bad)
}
:host([data-theme="dark"]) .pgn:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .fb.ok:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--goodbg);
    border: 2px solid var(--dk-green-line)
}
:host([data-theme="dark"]) .fb.no:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--badbg);
    border: 2px solid var(--dk-orange-line)
}
:host([data-theme="dark"]) .fb.ok .fbt b:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--good)
}
:host([data-theme="dark"]) .fb.no .fbt b:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--bad)
}
:host([data-theme="dark"]) .answ:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border-color: var(--gr);
    color: var(--good)
}
:host([data-theme="dark"]) .wrongw:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--bad);
    background: var(--badbg)
}
:host([data-theme="dark"]) .fbm.tr:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .pcap:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .pstage .ntag rect:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    stroke: var(--v)
}
:host([data-theme="dark"]) .pstage .ntag text:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    fill: var(--dk-text)
}
:host([data-theme="dark"]) .speak:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    border: 2px solid var(--line)
}
:host([data-theme="dark"]) .speak.aud.on:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--v)
}
:host([data-theme="dark"]) .weak:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    background: var(--vt)
}
:host([data-theme="dark"]) .weak a:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .foot:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--ink3)
}
:host([data-theme="dark"]) .foot .tag-en:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--v)
}
:host([data-theme="dark"]) .foot .tag-en:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: var(--vd)
}
:host([data-theme="dark"]) .hero-in:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    text-shadow: 0 1px 3px color-mix(in oklab, var(--dk-acc) 45%, transparent)
}
:host([data-theme="dark"]) #main:focus:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)), :host([data-theme="dark"]) #main:focus-visible:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    outline: none
}
:host([data-theme="dark"]) .final p:not(:is(.hero, .cat-head, .ls-head, .scene, .hero *, .cat-head *, .ls-head *, .scene *)) {
    color: #fff
}
:host([data-theme="dark"]) :is(.hero, .cat-head, .ls-head, .scene) {
    color-scheme: light;
    --bg: #f4f0fb;
    --ink: #1d1538;
    --ink2: #4f4869;
    --ink3: #676085;
    --v: #5a2fc8;
    --vt: #f2edff;
    --line: #e7e1f4;
    --paper: #fff;
    --tr: #0b6158;
    --trbg: #eef7f5;
    --trl: #c9e5df;
    --good: #0f7a4a;
    --goodbg: #e3f6ec;
    --bad: #b3261e;
    --badbg: #fdecea;
    --note: #8a5a00;
    --notebg: #fff7e0;
    --bg: #f6f3ff;
    --ink: #141010;
    --ink2: #4e4b4b;
    --ink3: #6b6868;
    --v: #874bf8;
    --vd: #6a33d6;
    --vt: #f1eaff;
    --line: #e6ddfb;
    --cy: #0ac7ff;
    --gr: #00e641;
    --or: #ff7d1e;
    --ye: #fff805;
    --tr: #0b6158;
    --good: #00792a;
    --goodbg: #e5fcec;
    --bad: #b8470a;
    --badbg: #fff0e3;
    --note: #8a5a00;
    --notebg: #fff8dc
}
`
