// Тёмный слой «speed-reading» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const SPEED_READING_DARK_CSS = `:host([data-theme="dark"]) .sr:not(:is(.tele, .tele *)) {
    --acc: var(--dk-acc);
    --acc2: var(--dk-acc-strong);
    --ink: var(--dk-text);
    --muted: var(--dk-text-2);
    --line: var(--dk-line);
    color: var(--ink)
}
:host([data-theme="dark"]) button:not(:is(.tele, .tele *)) {
    color: inherit
}
:host([data-theme="dark"]) .ms svg:not(:is(.tele, .tele *)) {
    fill: currentColor
}
:host([data-theme="dark"]) .card:not(:is(.tele, .tele *)) {
    background: var(--dk-card);
    border: 1px solid var(--dk-line)
}
:host([data-theme="dark"]) .muted:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .cbtn:not(:is(.tele, .tele *)) {
    border: 0;
    background: var(--dk-acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .cbtn:hover:not(:is(.tele, .tele *)) {
    background: var(--dk-acc)
}
:host([data-theme="dark"]) .cbtn.line:not(:is(.tele, .tele *)) {
    background: var(--dk-card);
    color: var(--dk-text);
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .cbtn.line:hover:not(:is(.tele, .tele *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .cbtn.line:disabled:hover:not(:is(.tele, .tele *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) .cbtn.ghost:not(:is(.tele, .tele *)) {
    background: var(--dk-acc-tint);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .cbtn.ghost:hover:not(:is(.tele, .tele *)) {
    background: var(--dk-acc-tint)
}
:host([data-theme="dark"]) .cbtn.white:not(:is(.tele, .tele *)) {
    background: var(--dk-card);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .chero:not(:is(.tele, .tele *)) {
    color: var(--dk-on-acc);
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%)
}
:host([data-theme="dark"]) .st-new:not(:is(.tele, .tele *)) {
    background: var(--dk-acc-tint);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .st-ok:not(:is(.tele, .tele *)) {
    background: var(--dk-green-tint);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .st-grey:not(:is(.tele, .tele *)) {
    background: var(--dk-page);
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .lrow:not(:is(.tele, .tele *)) {
    border-top: 1px solid var(--dk-line)
}
:host([data-theme="dark"]) .lrow:first-of-type:not(:is(.tele, .tele *)) {
    border-top: 0
}
:host([data-theme="dark"]) .lrow .ti span:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .cseg:not(:is(.tele, .tele *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .cseg button:not(:is(.tele, .tele *)) {
    border: 0;
    background: none;
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .cseg button.on:not(:is(.tele, .tele *)) {
    background: var(--dk-acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .srstart:not(:is(.tele, .tele *)) {
    background: var(--dk-card);
    border: 1px solid var(--dk-line);
    box-shadow: 0 18px 40px color-mix(in oklab, var(--dk-acc) 8%, transparent)
}
:host([data-theme="dark"]) .srava:not(:is(.tele, .tele *)) {
    background: linear-gradient(110.8deg,var(--dk-acc) 15.5%,var(--dk-acc-strong) 94.2%)
}
:host([data-theme="dark"]) .srstart h2:not(:is(.tele, .tele *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .srnote:not(:is(.tele, .tele *)) {
    background: var(--dk-blue-tint);
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .srtexts button:not(:is(.tele, .tele *)) {
    border: 1.5px solid var(--dk-line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .srtexts button small:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .srtexts button.on:not(:is(.tele, .tele *)) {
    border-color: var(--dk-acc);
    background: var(--dk-page)
}
:host([data-theme="dark"]) .tele-top:not(:is(.tele, .tele *)) {
    background: rgba(255,255,255,.04)
}
:host([data-theme="dark"]) .recdot:not(:is(.tele, .tele *)) {
    background: var(--dk-red);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--dk-red) 60%, transparent)
}
:host([data-theme="dark"]) .tele-view:not(:is(.tele, .tele *)):before {
    background: linear-gradient(#0E0C17,rgba(255, 255, 255, 0))
}
:host([data-theme="dark"]) .tele-view:not(:is(.tele, .tele *)):after {
    background: linear-gradient(rgba(255, 255, 255, 0),#0E0C17)
}
:host([data-theme="dark"]) .tele-line:not(:is(.tele, .tele *)) {
    background: color-mix(in oklab, var(--dk-acc) 16%, transparent);
    border: 1px solid color-mix(in oklab, var(--dk-acc) 35%, transparent)
}
:host([data-theme="dark"]) .tele-text h4:not(:is(.tele, .tele *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .tele-text span.said:not(:is(.tele, .tele *)) {
    color: #7CF2A4
}
:host([data-theme="dark"]) .tele-count:not(:is(.tele, .tele *)) {
    color: #fff;
    text-shadow: 0 10px 30px color-mix(in oklab, var(--dk-acc) 60%, transparent)
}
:host([data-theme="dark"]) .tele-bar:not(:is(.tele, .tele *)) {
    background: rgba(255,255,255,.08)
}
:host([data-theme="dark"]) .tele-bar i:not(:is(.tele, .tele *)) {
    background: linear-gradient(90deg,var(--dk-red),var(--dk-acc))
}
:host([data-theme="dark"]) .srres .g:not(:is(.tele, .tele *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .srres .m:not(:is(.tele, .tele *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .srsteps b:not(:is(.tele, .tele *)) {
    background: var(--dk-acc-tint);
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .srlist:not(:is(.tele, .tele *)) {
    background: var(--dk-card);
    border: 1.5px solid var(--dk-acc-line);
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .srlist span.done:not(:is(.tele, .tele *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .srlist span.on:not(:is(.tele, .tele *)) {
    background: var(--dk-acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .toast:not(:is(.tele, .tele *)) {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .srbg:not(:is(.tele, .tele *)) {
    background: linear-gradient(110deg,var(--dk-acc-tint),var(--dk-page));
    border: 1px solid var(--dk-acc-line)
}
:host([data-theme="dark"]) .srbg.off:not(:is(.tele, .tele *)) {
    background: var(--dk-page);
    border-color: var(--dk-line)
}
:host([data-theme="dark"]) .srbg .sbic:not(:is(.tele, .tele *)) {
    background: var(--dk-card);
    box-shadow: 0 4px 10px color-mix(in oklab, var(--dk-acc) 10%, transparent)
}
:host([data-theme="dark"]) .srbg .sbt span:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .srvol:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .srvol input:not(:is(.tele, .tele *)) {
    accent-color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .srslider:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) .srslider input:not(:is(.tele, .tele *)) {
    accent-color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .srspdv:not(:is(.tele, .tele *)) {
    background: var(--dk-acc);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .srwait:not(:is(.tele, .tele *)) {
    color: var(--dk-text-2)
}
:host([data-theme="dark"]) :is(.tele) {
    color-scheme: light
}
`
