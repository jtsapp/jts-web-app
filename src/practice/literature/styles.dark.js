// Тёмный слой «literature» для Shadow DOM. СГЕНЕРИРОВАН scripts/practice/shadow-dark.js из styles.js раздела —
// руками не править: правки — в SECTIONS генератора. Кладётся в тень ПОСЛЕ светлых стилей.

export const LITERATURE_DARK_CSS = `:host([data-theme="dark"]) {
    --violet: var(--dk-acc);
    --violet-ink: var(--dk-acc-text);
    --violet-50: var(--dk-acc-tint);
    --violet-100: var(--dk-acc-tint);
    --cyan: var(--dk-blue);
    --cyan-50: var(--dk-blue-tint);
    --orange: var(--dk-orange);
    --orange-50: var(--dk-orange-tint);
    --green: var(--dk-green);
    --ink: var(--dk-text);
    --ink-2: var(--dk-text);
    --muted: var(--dk-text-2);
    --line: var(--dk-line);
    --paper: var(--dk-page);
    --paper-2: var(--dk-page);
    --white: var(--dk-card);
    --shadow: 0 24px 60px -32px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: inherit
}
:host([data-theme="dark"]) a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .display em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .lede:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .meta:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .btn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .btn:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: 0 12px 26px -12px color-mix(in oklab, var(--dk-acc) 70%, transparent)
}
:host([data-theme="dark"]) .btn.ghost:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    color: var(--ink);
    box-shadow: inset 0 0 0 1.5px var(--ink)
}
:host([data-theme="dark"]) .btn.ghost:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .pill:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pill.lv:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .pill.v:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50);
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .pill.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan-50);
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .pill.o:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange-50);
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .top:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-page) 86%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .brand:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .brand i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .nav button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--ink-2)
}
:host([data-theme="dark"]) .nav button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .nav button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .sel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--dk-card);
    color: var(--ink);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23141216' stroke-width='1.6' fill='none'/%3E%3C/svg%3E")
}
:host([data-theme="dark"]) .lang:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .lang button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--muted)
}
:host([data-theme="dark"]) .lang button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24)
}
:host([data-theme="dark"]) .burger:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .gallery-frame .clip:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .art-cap:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .art-cap button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .quote-chip:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan);
    color: var(--dk-on-bright);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .dots button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--line)
}
:host([data-theme="dark"]) .dots button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .room:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-ink-bg);
    color: #fff;
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .room:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(180deg,rgba(255, 255, 255, 0) 35%,rgba(20,18,22,.88))
}
:host([data-theme="dark"]) .room .h2:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .room p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .room .count:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .room.proverbs:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .room.proverbs .bubbles span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .room.proverbs .bubbles span:nth-child(3n):not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .room.proverbs .bubbles span:nth-child(4n):not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .featured:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .timeline:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: linear-gradient(90deg,var(--violet),var(--cyan))
}
:host([data-theme="dark"]) .era-btn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .era-btn .dot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    border: 3px solid var(--violet)
}
:host([data-theme="dark"]) .era-btn small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .era-btn .faces img:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 2px solid var(--paper)
}
:host([data-theme="dark"]) .era-btn:hover b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .levels button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .levels button span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .levels button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .levels button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--violet);
    background: var(--violet-50)
}
:host([data-theme="dark"]) .chip:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .chip.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    border-color: var(--ink);
    color: #fff
}
:host([data-theme="dark"]) .chip:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--ink)
}
:host([data-theme="dark"]) .card:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .card:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .card .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2) center/cover no-repeat
}
:host([data-theme="dark"]) .card .first:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .card .who:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .typo span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .typo.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan-50)
}
:host([data-theme="dark"]) .typo.c span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .typo.o:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange-50)
}
:host([data-theme="dark"]) .typo.o span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .key:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .key:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .mini-play:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .saying:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .saying:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .saying .f:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .saying.v:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .saying.v .f:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-on)
}
:host([data-theme="dark"]) .saying.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .saying.c .f:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .crumbs:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .crumbs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--muted)
}
:host([data-theme="dark"]) .crumbs button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .stage-tabs:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(var(--paper) 70%,color-mix(in oklab, var(--dk-card) 0%, transparent))
}
:host([data-theme="dark"]) .stage-tabs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    color: var(--ink-2);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .stage-tabs button span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .stage-tabs button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .stage-tabs button.on span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .caption:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .caption a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .typo-art:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .typo-art .b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .typo-art.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan-50)
}
:host([data-theme="dark"]) .typo-art.c .b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .typo-art.o:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange-50)
}
:host([data-theme="dark"]) .typo-art.o .b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange)
}
:host([data-theme="dark"]) .author-chip:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .author-chip small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .title-block .by:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .voice:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .voice .play:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .voice .lab span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .voice .bar:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .voice .bar i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(90deg,var(--violet),var(--cyan))
}
:host([data-theme="dark"]) .voice .t:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .voice .sp:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .voice .readers button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .voice .readers button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50);
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .voice .credit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .voice .credit a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .voice .note:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .voice.playing .play:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .poem:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .poem .ln:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-acc) 6%, transparent)
}
:host([data-theme="dark"]) .poem .ln.hl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .poem .no:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .poem .speaker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .w:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: inherit;
    border-bottom: 1.5px dotted color-mix(in oklab, var(--dk-acc) 55%, transparent)
}
:host([data-theme="dark"]) .w:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .w.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink);
    border-bottom-color: var(--violet)
}
:host([data-theme="dark"]) .src-line:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line);
    color: var(--muted)
}
:host([data-theme="dark"]) .src-line button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--muted)
}
:host([data-theme="dark"]) .src-more:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .extract:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .vid:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: #000
}
:host([data-theme="dark"]) .vid .poster:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: #000 center/cover
}
:host([data-theme="dark"]) .vid .poster:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(180deg,rgba(255, 255, 255, 0.05),rgba(0,0,0,.55))
}
:host([data-theme="dark"]) .vid .poster span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .vid .poster span i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .vid iframe:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0
}
:host([data-theme="dark"]) .vmeta:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .vmeta b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .author-card:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .learner:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .words div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .words small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .seg:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .seg button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--muted)
}
:host([data-theme="dark"]) .seg button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .dev:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--violet-50);
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .dev.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .dev-def:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .callout:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange-50)
}
:host([data-theme="dark"]) .callout b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .callout.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan-50)
}
:host([data-theme="dark"]) .callout.c b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .acts button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .acts button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .hint:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .built:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 2px dashed var(--line)
}
:host([data-theme="dark"]) .built div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .built div.ok:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-green-tint)
}
:host([data-theme="dark"]) .built div.no:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-orange-tint)
}
:host([data-theme="dark"]) .choices button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .choices button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--violet)
}
:host([data-theme="dark"]) .opts button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .opts button.ok:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-green-tint);
    border-color: var(--dk-green)
}
:host([data-theme="dark"]) .opts button.no:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-orange-tint);
    border-color: var(--dk-orange)
}
:host([data-theme="dark"]) .fb:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .line-card:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .blank:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 2px solid var(--violet);
    color: var(--violet)
}
:host([data-theme="dark"]) .taps i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .taps i.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .ladder button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .ladder button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--violet);
    background: var(--violet-50)
}
:host([data-theme="dark"]) .stress button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .stress button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc);
    border-color: var(--violet)
}
:host([data-theme="dark"]) .recdot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-red)
}
:host([data-theme="dark"]) textarea:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--paper)
}
:host([data-theme="dark"]) .next-row:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .next-row button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .next-row button small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .pv-bubble:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .reveal-btn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .reveal-btn.shut:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: transparent;
    text-shadow: 0 0 12px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .pop:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff;
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .pop .tr:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid rgba(255,255,255,.18);
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .pop .l:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .modal:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: rgba(20,18,22,.5)
}
:host([data-theme="dark"]) .modal .box:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card)
}
:host([data-theme="dark"]) footer:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: var(--dk-muted)
}
:host([data-theme="dark"]) footer button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: rgba(255,255,255,.08);
    color: #fff
}
@container lw (max-width:1020px) {
    :host([data-theme="dark"]) .nav.open:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
        background: var(--dk-card);
        box-shadow: var(--shadow)
    }
}
:host([data-theme="dark"]) .badge:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .badge.tr:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-yellow-tint);
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .badge.us:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan-50);
    color: var(--dk-blue)
}
:host([data-theme="dark"]) .badge.full:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-green-tint);
    color: var(--dk-green)
}
:host([data-theme="dark"]) .badge.ex:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange-50);
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .badge.cr:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-chip);
    color: var(--dk-red)
}
:host([data-theme="dark"]) .src:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .src a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .learner:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink);
    background: var(--violet-50)
}
:host([data-theme="dark"]) .world-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff;
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .world-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(90deg,rgba(20,14,26,.92) 0%,rgba(20,14,26,.7) 45%,rgba(255, 255, 255, 0.15) 100%)
}
:host([data-theme="dark"]) .world-hero .display:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .world-hero .display em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .world-hero .lede:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .world-hero .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .curtain:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(90deg,var(--dk-red-deep),var(--dk-red) 40%,var(--dk-red-deep))
}
:host([data-theme="dark"]) .stats span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .feature:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: var(--shadow);
    border: 0
}
:host([data-theme="dark"]) .feature q:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line),0 14px 34px -26px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .pcard .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background-color: var(--paper-2)
}
:host([data-theme="dark"]) .pcard .ph.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-acc-deep),var(--dk-acc-strong))
}
:host([data-theme="dark"]) .pcard .ph.ty.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-blue-deep),var(--dk-blue))
}
:host([data-theme="dark"]) .pcard .ph.ty.o:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-orange-deep),var(--dk-orange))
}
:host([data-theme="dark"]) .pcard .ph.ty span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .pcard .tx small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .genre-row h3 small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .prow:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .prow:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .prow .ini:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-on-acc);
    background: var(--violet)
}
:host([data-theme="dark"]) .prow.Comedy .ini:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan)
}
:host([data-theme="dark"]) .prow.History .ini:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange)
}
:host([data-theme="dark"]) .prow.Romance .ini:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-green)
}
:host([data-theme="dark"]) .prow small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .life .ev:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .life .ev b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .figrow figure:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .figrow figure img:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .figrow figcaption:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .play-head:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff;
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .play-head:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(180deg,rgba(20,14,26,.3),rgba(20,14,26,.92))
}
:host([data-theme="dark"]) .play-head .display:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .play-head .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .play-head .by:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .play-head .crumbs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .play-head .crumbs:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .ptabs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: rgba(255,255,255,.12);
    color: #fff
}
:host([data-theme="dark"]) .ptabs button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .fact:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .fact b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .acts-guide .a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .acts-guide .a b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .snav .act:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .snav button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--ink-2)
}
:host([data-theme="dark"]) .snav button small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .snav button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .snav button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff
}
:host([data-theme="dark"]) .snav button.on small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .snav-sel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .scene-h:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .scene-h span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .happens:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .rtools select:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .rtools button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .rtools button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg);
    color: #fff;
    border-color: var(--ink)
}
:host([data-theme="dark"]) .sd:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text);
    border-left: 2px solid var(--violet-100)
}
:host([data-theme="dark"]) .sp .who:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .sp i.isd:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) .sp.flash:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .sp.mine .who:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    color: var(--orange)
}
:host([data-theme="dark"]) .house:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .house.m:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-blue),var(--dk-blue))
}
:host([data-theme="dark"]) .house.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-red),var(--dk-red))
}
:host([data-theme="dark"]) .house.v:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-acc-deep),var(--dk-acc-strong))
}
:host([data-theme="dark"]) .house h3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .house div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: rgba(255,255,255,.12)
}
:host([data-theme="dark"]) .bars i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .personae div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .qt:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .qt small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .qt:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .wordlist div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .wordlist small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wordlist em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .tl div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .tl b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .shelf .sh-h:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .shelf .sh-h p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .book:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: inset 6px 0 0 var(--violet),0 1px 0 var(--line),0 14px 30px -24px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .book.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: inset 6px 0 0 var(--cyan),0 1px 0 var(--line),0 14px 30px -24px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .book.o:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: inset 6px 0 0 var(--orange),0 1px 0 var(--line),0 14px 30px -24px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .book .au:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .book img.thumb:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .text-head .by:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .text-head figure img:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .prose-body:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-text)
}
:host([data-theme="dark"]) .prose-body p:first-of-type:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):first-letter {
    color: var(--violet)
}
:host([data-theme="dark"]) .prose-body h3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .prose-body .gl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text);
    background: var(--violet-50)
}
:host([data-theme="dark"]) .prose-body .moral:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink);
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .warn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange-50);
    color: var(--dk-orange)
}
:host([data-theme="dark"]) .eras-v:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: linear-gradient(var(--violet),var(--cyan),var(--orange))
}
:host([data-theme="dark"]) .era-v .dot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    box-shadow: 0 0 0 6px var(--paper)
}
:host([data-theme="dark"]) .era-v:nth-child(3n+2) .dot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan)
}
:host([data-theme="dark"]) .era-v:nth-child(3n) .dot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange)
}
:host([data-theme="dark"]) .era-v .card-e:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line),0 18px 40px -32px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .era-v .card-e .h3 small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .chips2 button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .chips2 button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .chips2 button i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .godot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-ink-bg),var(--dk-ink-bg));
    color: #fff
}
:host([data-theme="dark"]) .godot .h2:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .godot p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .formline div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 3px solid var(--violet)
}
:host([data-theme="dark"]) .formline div:nth-child(2n):not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--cyan)
}
:host([data-theme="dark"]) .formline div:nth-child(3n):not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--orange)
}
:host([data-theme="dark"]) .formline small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) {
    --paper: var(--dk-page);
    --paper-2: var(--dk-yellow-tint);
    --card: var(--dk-card);
    --ink: var(--dk-text);
    --ink-2: var(--dk-text-2);
    --muted: var(--dk-text-2);
    --line: var(--dk-line);
    --burgundy: var(--dk-red);
    --oxblood: var(--dk-red-deep);
    --forest: var(--dk-text-2);
    --navy: var(--dk-blue-deep);
    --umber: var(--dk-yellow);
    --plum: var(--dk-acc-strong);
    --teal: var(--dk-blue);
    --slate: var(--dk-text-2);
    --accent-soft: var(--dk-acc-tint);
    --shadow: 0 30px 60px -40px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) [data-lw-theme=museum]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-yellow);
    --accent-soft: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) [data-lw-theme=renaissance]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=theatre]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=romantic]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=victorian]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=modern]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-acc-tint)
}
:host([data-theme="dark"]) [data-lw-theme=medieval]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) [data-lw-theme=augustan]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=american]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent-soft: var(--dk-chip)
}
:host([data-theme="dark"]) .lw:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper);
    color: var(--ink)
}
:host([data-theme="dark"]) :not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *))::selection {
    background: var(--accent-soft)
}
:host([data-theme="dark"]) .display em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .lede:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .meta:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .btn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .btn.ghost:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: inset 0 0 0 1px var(--ink)
}
:host([data-theme="dark"]) .pill:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .pill.lv:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: none
}
:host([data-theme="dark"]) .learner:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    color: var(--accent)
}
:host([data-theme="dark"]) .top:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-page) 90%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .nav button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .nav button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    color: var(--ink);
    box-shadow: inset 0 -2px 0 var(--accent)
}
:host([data-theme="dark"]) .nav button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    color: var(--accent)
}
:host([data-theme="dark"]) footer:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .chip.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .lbl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lbl b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .lbl a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: radial-gradient(1200px 600px at 85% 20%,var(--dk-yellow-tint) 0,color-mix(in oklab, var(--dk-yellow-tint) 0%, transparent) 60%)
}
:host([data-theme="dark"]) .lw-over:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-over i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .lw-title em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--burgundy)
}
:host([data-theme="dark"]) .lw-intro:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-facts:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .lw-facts dd:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-stage .lbl button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--accent)
}
:host([data-theme="dark"]) .lw-dots button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--line)
}
:host([data-theme="dark"]) .lw-dots button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .lw-quote:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .lw-quote:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    color: var(--violet)
}
:host([data-theme="dark"]) .lw-sh .no:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-sh .rule:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--line)
}
:host([data-theme="dark"]) .lw-sh p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .gal:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--ink)
}
:host([data-theme="dark"]) .gal:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .gal .cap:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 3px solid var(--g,var(--ink))
}
:host([data-theme="dark"]) .gal p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .gal.g1 .cap:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 0;
    border-left: 3px solid var(--g)
}
:host([data-theme="dark"]) .gal.g6 .pic:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .gal.g6 .bub span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .gal.g6 .bub span:nth-child(2):not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--cyan)
}
:host([data-theme="dark"]) .gal.g6 .bub span:nth-child(3):not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--orange);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .salon .w:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .strip button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none
}
:host([data-theme="dark"]) .strip .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background-color: var(--paper-2)
}
:host([data-theme="dark"]) .strip small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .featured:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: none
}
:host([data-theme="dark"]) .card:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: none
}
:host([data-theme="dark"]) .card:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--ink);
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .card .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2) !important;
    color: var(--ink) !important
}
:host([data-theme="dark"]) .typo span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    color: var(--accent)
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .typo.v span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .typo.c span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .typo.o span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important
}
:host([data-theme="dark"]) .typo-art .b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2) !important;
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .typo-art .b span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent) !important
}
:host([data-theme="dark"]) .world-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .world-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(90deg,rgba(28,14,16,.94) 0%,rgba(40,14,20,.78) 42%,rgba(255, 255, 255, 0.12) 100%)
}
:host([data-theme="dark"]) .world-hero .display em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #E9C4B8
}
:host([data-theme="dark"]) .world-hero .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #E9C4B8
}
:host([data-theme="dark"]) .world-hero .credit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .feature:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--card);
    box-shadow: none
}
:host([data-theme="dark"]) .pcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--card);
    box-shadow: none
}
:host([data-theme="dark"]) .pcard .ph.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2) !important
}
:host([data-theme="dark"]) .pcard .ph.ty span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .pcard .ph.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .prow:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: none
}
:host([data-theme="dark"]) .prow:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft)
}
:host([data-theme="dark"]) .life .ev b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .theatre .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 3px solid var(--accent)
}
:host([data-theme="dark"]) .figrow figure:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--card)
}
:host([data-theme="dark"]) .play-head:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(180deg,rgba(255, 255, 255, 0.15) 0%,rgba(20,12,12,.35) 40%,rgba(20,12,12,.92) 100%)
}
:host([data-theme="dark"]) .play-head .credit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-muted)
}
:host([data-theme="dark"]) .ptabs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    box-shadow: inset 0 -1px 0 rgba(255,255,255,.3)
}
:host([data-theme="dark"]) .ptabs button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    color: #fff;
    box-shadow: inset 0 -3px 0 var(--dk-card)
}
:host([data-theme="dark"]) .fact:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--card);
    box-shadow: none
}
:host([data-theme="dark"]) .acts-guide .a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    box-shadow: none;
    background: var(--card)
}
:host([data-theme="dark"]) .acts-guide .a b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .happens:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    border-left: 3px solid var(--accent)
}
:host([data-theme="dark"]) .sp .who:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .sd:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted);
    border-left: 0
}
:host([data-theme="dark"]) .sp i.isd:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .snav button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent)
}
:host([data-theme="dark"]) .snav .act:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .qt:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    border-left: 2px solid var(--accent)
}
:host([data-theme="dark"]) .qt:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft)
}
:host([data-theme="dark"]) .house.m:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-blue-deep),var(--dk-blue))
}
:host([data-theme="dark"]) .house.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-red-deep),var(--dk-red))
}
:host([data-theme="dark"]) .house.v:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--dk-ink-bg),var(--dk-ink-bg))
}
:host([data-theme="dark"]) .wordlist div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    box-shadow: none;
    background: var(--card)
}
:host([data-theme="dark"]) .bars i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent)
}
:host([data-theme="dark"]) .tl b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .voice:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--card)
}
:host([data-theme="dark"]) .voice .play:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet)
}
:host([data-theme="dark"]) .formline div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--ink) !important
}
:host([data-theme="dark"]) .godot:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-ink-bg)
}
:host([data-theme="dark"]) .shelf .sh-h:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--ink)
}
:host([data-theme="dark"]) .book:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: none !important;
    background: transparent
}
:host([data-theme="dark"]) .book .cover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background-color: var(--card)
}
:host([data-theme="dark"]) .book:hover .cover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .book .cover.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--jacket,#2E4B3C);
    color: #F5EEDC;
    border: 0
}
:host([data-theme="dark"]) .book .cover.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border: 1px solid color-mix(in oklab, var(--dk-yellow) 45%, transparent)
}
:host([data-theme="dark"]) .rowb:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    border-bottom: 1px solid var(--line);
    background: none
}
:host([data-theme="dark"]) .rowb .th:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background-color: var(--paper-2)
}
:host([data-theme="dark"]) .rowb i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .rowb:hover b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .front .by:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .prose-body p:first-of-type:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):first-letter {
    color: var(--accent)
}
:host([data-theme="dark"]) .prose-body h3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .prose-body h3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    color: var(--accent)
}
:host([data-theme="dark"]) .prose-body .gl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .prose-body .moral:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line);
    color: var(--accent)
}
:host([data-theme="dark"]) .era-v .card-e:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: none;
    border: 0;
    border-top: 1px solid var(--ink);
    background: transparent
}
:host([data-theme="dark"]) .era-v .num:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .chips2 button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
@container lw (max-width:1020px) {
    :host([data-theme="dark"]) .gal.g1 .cap:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
        border-left: 0;
        border-top: 3px solid var(--g)
    }
}
:host([data-theme="dark"]) .play-head .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #E9C4B8
}
:host([data-theme="dark"]) .nav button.nx:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .bg-fail:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(135deg,var(--paper-2),var(--dk-chip)) !important
}
:host([data-theme="dark"]) .path6 span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .path6 b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .wcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .wcard:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .wcard .m:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .wcard q:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink);
    border-left: 2px solid var(--line)
}
:host([data-theme="dark"]) .wcard small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wcard.slang:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .wcard.dialect:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .wcard.archaic:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) .wcard.idiom:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-page)
}
:host([data-theme="dark"]) mark:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-yellow-tint);
    color: inherit
}
:host([data-theme="dark"]) .wchips button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .wchips button small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wchips button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--violet)
}
:host([data-theme="dark"]) .find input:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .srch:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .hit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .hit small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .hit:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) .whead:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .ipa:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wstep:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .wstep .n:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet);
    color: var(--dk-on-acc)
}
:host([data-theme="dark"]) .enc:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-left: 3px solid var(--violet)
}
:host([data-theme="dark"]) .tr:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .wstep textarea:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .pcard2:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .rung:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line);
    border-top: 5px solid var(--violet)
}
:host([data-theme="dark"]) .rung.r1:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--teal)
}
:host([data-theme="dark"]) .rung.r2:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--cyan)
}
:host([data-theme="dark"]) .rung.r3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--orange)
}
:host([data-theme="dark"]) .rung.r4:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--burgundy)
}
:host([data-theme="dark"]) .rung.r5:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--forest)
}
:host([data-theme="dark"]) .rung.r6:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--umber)
}
:host([data-theme="dark"]) .rung .h span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .vx:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--paper-2)
}
:host([data-theme="dark"]) .vx small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .gcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .decision:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-left: 5px solid var(--violet)
}
:host([data-theme="dark"]) .learnx button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .learnx button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: var(--shadow)
}
:host([data-theme="dark"]) .learnx p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .ws-g b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .ws-g button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: transparent
}
:host([data-theme="dark"]) .ws-g button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .ws-g button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .wordtiles button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .built span.ok:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-green)
}
:host([data-theme="dark"]) .built span.no:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-red)
}
:host([data-theme="dark"]) .srcbtn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--violet-ink)
}
:host([data-theme="dark"]) .rid input:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1.5px solid var(--line)
}
:host([data-theme="dark"]) .tbl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    box-shadow: 0 1px 0 var(--line)
}
:host([data-theme="dark"]) .tbl th:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .tbl td:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .tbl td button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--ink)
}
:host([data-theme="dark"]) .tbl td button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--violet)
}
:host([data-theme="dark"]) .nb:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--violet-50)
}
:host([data-theme="dark"]) {
    --night: var(--dk-text);
    --night-2: var(--dk-text);
    --night-3: var(--dk-text);
    --night-line: color-mix(in oklab, var(--dk-yellow) 20%, transparent);
    --candle: var(--dk-yellow-soft);
    --candle-2: var(--dk-yellow-tint);
    --ember: var(--dk-orange);
    --gold-ink: var(--dk-yellow);
    --gold-em: var(--dk-yellow);
    --gold-line: var(--dk-yellow);
    --veil: var(--dk-page);
    --vellum: var(--dk-yellow-tint);
    --ribbon: var(--dk-page);
    --paper: var(--dk-chip);
    --paper-2: var(--dk-yellow-tint);
    --card: var(--dk-page);
    --page: var(--dk-page);
    --ink: var(--dk-text);
    --ink-2: var(--dk-text-2);
    --muted: var(--dk-text-2);
    --line: var(--dk-line);
    --gold: var(--dk-yellow);
    --gold-2: var(--dk-yellow-soft);
    --vio: var(--dk-acc);
    --vio-2: var(--dk-acc);
    --vio-ink: var(--dk-acc-text);
    --accent: var(--dk-yellow);
    --accent-soft: var(--dk-yellow-tint);
    --shadow: 0 34px 60px -38px rgba(0, 0, 0, 0.6);
    --glow: 0 0 0 1px color-mix(in oklab, var(--dk-yellow) 28%, transparent),0 26px 50px -28px rgba(0,0,0,.8)
}
:host([data-theme="dark"]) [data-lw-theme=museum]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-yellow);
    --accent-soft: var(--dk-yellow-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=renaissance]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-red);
    --accent-soft: var(--dk-orange-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=theatre]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-red);
    --accent-soft: var(--dk-red-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=romantic]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-green);
    --accent-soft: var(--dk-green-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=victorian]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-blue-deep);
    --accent-soft: var(--dk-chip);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=gothic]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-acc-strong);
    --accent-soft: var(--dk-acc-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=nursery]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-acc);
    --accent-soft: var(--dk-acc-tint);
    --tint: var(--dk-page)
}
:host([data-theme="dark"]) [data-lw-theme=press]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-orange);
    --accent-soft: var(--dk-yellow-tint);
    --tint: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) [data-lw-theme=writers]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-acc-strong);
    --accent-soft: var(--dk-acc-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=archive]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-yellow);
    --accent-soft: var(--dk-yellow-tint);
    --tint: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) [data-lw-theme=modern]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-acc-strong);
    --accent-soft: var(--dk-acc-tint);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=medieval]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-yellow);
    --accent-soft: var(--dk-yellow-tint);
    --tint: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) [data-lw-theme=augustan]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-blue);
    --accent-soft: var(--dk-chip);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=american]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-text-2);
    --accent-soft: var(--dk-chip);
    --tint: var(--dk-chip)
}
:host([data-theme="dark"]) [data-lw-theme=brand]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --accent: var(--dk-acc);
    --accent-soft: var(--dk-acc-tint);
    --tint: var(--dk-page)
}
:host([data-theme="dark"]) .lw:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--tint) var(--grain);
    color: var(--ink)
}
:host([data-theme="dark"]) :not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *))::selection {
    background: color-mix(in oklab, var(--dk-acc) 22%, transparent)
}
:host([data-theme="dark"]) :focus-visible:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    outline: 2px solid var(--vio)
}
:host([data-theme="dark"]) #app .lw-say p b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) #app .lw-margin p b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) #app .blank:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-acc-text)
}
:host([data-theme="dark"]) #app .saying.v .f span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: #fff
}
:host([data-theme="dark"]) .display em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .lw-over:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .lede:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .meta:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .orn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold)
}
:host([data-theme="dark"]) .orn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before, :host([data-theme="dark"]) .orn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(90deg,transparent,currentColor)
}
:host([data-theme="dark"]) .btn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--vio);
    color: var(--dk-on-acc);
    box-shadow: 0 10px 24px -14px color-mix(in oklab, var(--dk-acc) 90%, transparent)
}
:host([data-theme="dark"]) .btn:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-acc);
    box-shadow: 0 16px 30px -14px color-mix(in oklab, var(--dk-acc) 95%, transparent)
}
:host([data-theme="dark"]) .btn.ghost:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink)
}
:host([data-theme="dark"]) .btn.light:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    color: var(--ink);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .btn.light:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-yellow) 12%, transparent)
}
:host([data-theme="dark"]) .pill:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .pill.lv:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle-2);
    color: var(--ink)
}
:host([data-theme="dark"]) .chip:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent;
    border: 1px solid var(--line);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .chip:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--accent);
    color: var(--accent)
}
:host([data-theme="dark"]) .chip.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle);
    border-color: var(--candle);
    color: var(--ink)
}
:host([data-theme="dark"]) .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: 0 1px 0 rgba(255,255,255,.6) inset
}
:host([data-theme="dark"]) .learner:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    color: var(--accent)
}
:host([data-theme="dark"]) .top:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-page) 94%, transparent);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .brand i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-yellow) 35%, transparent)
}
:host([data-theme="dark"]) .brand span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .nav button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2) !important
}
:host([data-theme="dark"]) .nav button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important;
    background: transparent !important
}
:host([data-theme="dark"]) .nav button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important;
    background: transparent !important;
    box-shadow: inset 0 -2px 0 var(--gold-line) !important
}
:host([data-theme="dark"]) .sel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background-color: var(--card);
    border-color: var(--line);
    color: var(--ink);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238A6A2E' stroke-width='1.6' fill='none'/%3E%3C/svg%3E")
}
:host([data-theme="dark"]) .sel option:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-text);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .lang:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .lang button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lang button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle);
    color: var(--ink);
    box-shadow: none
}
:host([data-theme="dark"]) .burger:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2);
    color: var(--ink)
}
@container lw (max-width:1020px) {
    :host([data-theme="dark"]) .nav.open:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
        background: var(--card) !important;
        border: 1px solid var(--line)
    }
}
:host([data-theme="dark"]) .lw-tag:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-page) 84%, transparent);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-tag:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: var(--vio-2)
}
:host([data-theme="dark"]) .lw-tag.auth:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: var(--candle)
}
:host([data-theme="dark"]) .lw-say p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-card);
    color: var(--ink);
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--dk-yellow) 20%, transparent),0 14px 30px -18px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw-say p b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--vio)
}
:host([data-theme="dark"]) .lw-home:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper)
}
:host([data-theme="dark"]) .motes span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: radial-gradient(circle,var(--dk-yellow-tint) 0,color-mix(in oklab, var(--dk-yellow-tint) 0%, transparent) 70%)
}
:host([data-theme="dark"]) .lw-prologue:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper) var(--grain)
}
:host([data-theme="dark"]) .lw-prologue:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: linear-gradient(var(--dk-yellow),color-mix(in oklab, var(--dk-yellow) 0%, transparent))
}
:host([data-theme="dark"]) .lw-tale .over:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold)
}
:host([data-theme="dark"]) .lw-tale h2 em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--vio-ink)
}
:host([data-theme="dark"]) .lw-tale p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-tale p:first-of-type:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):first-letter {
    color: var(--vio)
}
:host([data-theme="dark"]) .lw-cast-h small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-role i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-role small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-map:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: radial-gradient(1200px 620px at 50% 0%,var(--dk-page) 0%,var(--vellum) 62%);
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-map:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: var(--grain)
}
:host([data-theme="dark"]) .lw-head .over:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-ink)
}
:host([data-theme="dark"]) .lw-head h2 em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-head p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-paper .lw-head p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-paper .lw-head .over:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold)
}
:host([data-theme="dark"]) .lw-paper .lw-head h2 em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--vio-ink)
}
:host([data-theme="dark"]) .lw-path path:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    fill: none;
    stroke: var(--gold)
}
:host([data-theme="dark"]) .lw-door:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: inherit
}
:host([data-theme="dark"]) .lw-door:hover .arch:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: 0 0 0 1px var(--gold),0 0 0 7px var(--card),0 0 0 8px color-mix(in oklab, var(--dk-yellow) 60%, transparent),0 0 46px 6px color-mix(in oklab, var(--dk-yellow) 30%, transparent),0 40px 60px -30px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw-door .no:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--gold-line);
    color: var(--gold-ink)
}
:host([data-theme="dark"]) .lw-door b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-door small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-lanes:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid color-mix(in oklab, var(--dk-yellow) 35%, transparent);
    background: rgba(255,255,255,.45)
}
:host([data-theme="dark"]) .lw-lanes h3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-lanes p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-lane:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-lane span.t:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--dk-yellow) 55%, transparent),0 0 0 4px var(--card)
}
:host([data-theme="dark"]) .lw-lane small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-lane:hover b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-cabinet:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(180deg,var(--dk-yellow-tint) 0%,var(--dk-chip) 100%);
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-cabinet:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    background: repeating-linear-gradient(90deg,color-mix(in oklab, var(--dk-yellow) 2.5%, transparent) 0 2px,transparent 2px 9px),var(--grain)
}
:host([data-theme="dark"]) .lw-cabinet .lw-head h2 em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-curio:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: inherit
}
:host([data-theme="dark"]) .lw-curio .plaque .lw-tag:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-yellow) 14%, transparent);
    color: var(--gold-ink)
}
:host([data-theme="dark"]) .lw-curio .plaque b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-curio .plaque q:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-curio .plaque small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-curio:hover .plaque b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-desk:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: radial-gradient(900px 520px at 28% 40%,color-mix(in oklab, var(--dk-yellow) 30%, transparent),color-mix(in oklab, var(--dk-yellow) 0%, transparent) 70%),linear-gradient(180deg,var(--dk-page) 0%,var(--dk-yellow-tint) 100%);
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-desk .sheet:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--page) var(--grain);
    color: var(--ink);
    box-shadow: 0 0 0 1px color-mix(in oklab, var(--dk-yellow) 16%, transparent),0 40px 70px -40px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw-desk .sheet .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--vio-ink)
}
:host([data-theme="dark"]) .lw-desk .sheet .q:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-ages:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper) var(--grain)
}
:host([data-theme="dark"]) .lw-strip button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-strip .fr:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(145deg,var(--dk-yellow),var(--dk-yellow) 50%,var(--dk-yellow-soft));
    box-shadow: 0 18px 30px -20px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw-strip .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background-color: var(--paper-2)
}
:host([data-theme="dark"]) .lw-strip .n:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold)
}
:host([data-theme="dark"]) .lw-strip small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-study:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2) var(--grain)
}
:host([data-theme="dark"]) .lw-desks button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--card);
    color: var(--ink);
    box-shadow: 0 1px 0 var(--line),0 24px 40px -30px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw-desks button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: 0 1px 0 var(--line),0 34px 50px -30px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .lw-desks p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-desks .go:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--vio-ink)
}
:host([data-theme="dark"]) .lw-levels:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper) var(--grain)
}
:host([data-theme="dark"]) .lw-plates button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: var(--card);
    color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--line),inset 0 0 0 6px var(--card),inset 0 0 0 7px var(--line)
}
:host([data-theme="dark"]) .lw-plates button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle-2);
    color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--gold),inset 0 0 0 6px var(--candle-2),inset 0 0 0 7px color-mix(in oklab, var(--dk-yellow) 60%, transparent)
}
:host([data-theme="dark"]) .lw-plates small.ex:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-plates span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-plates em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-plates button.on span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .lw-plates button.on em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .lw-plates button.on small.ex:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .world-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    --glow: color-mix(in oklab, var(--dk-yellow) 22%, transparent)
}
:host([data-theme="dark"]) .lw-hist img:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2)
}
:host([data-theme="dark"]) .lw-hist figcaption:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2);
    text-shadow: 0 0 10px rgba(246,240,228,.95)
}
:host([data-theme="dark"]) .lw-hist figcaption b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-route:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--ribbon);
    color: var(--ink-2);
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .lw-route li button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--muted)
}
:host([data-theme="dark"]) .lw-route li button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink);
    background: rgba(255, 255, 255, 0.05)
}
:host([data-theme="dark"]) .lw-route li i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid color-mix(in oklab, var(--dk-yellow) 50%, transparent);
    color: var(--gold-ink)
}
:host([data-theme="dark"]) .lw-route li.on button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink);
    background: color-mix(in oklab, var(--dk-yellow) 14%, transparent)
}
:host([data-theme="dark"]) .lw-route li.on i:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle);
    color: var(--ink);
    border-color: var(--candle)
}
:host([data-theme="dark"]) .lw-route .next:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--gold-ink)
}
:host([data-theme="dark"]) .lw-route .next b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .world-hero .display em:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em) !important
}
:host([data-theme="dark"]) .world-hero .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-ink) !important
}
:host([data-theme="dark"]) .feature:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    box-shadow: 0 30px 50px -40px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .pcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .pcard:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: 0 30px 50px -34px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .pcard .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border: 1px solid color-mix(in oklab, var(--dk-yellow) 45%, transparent)
}
:host([data-theme="dark"]) .prow:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .prow:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    border-color: var(--accent)
}
:host([data-theme="dark"]) .life .ev:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top-color: var(--line)
}
:host([data-theme="dark"]) .theatre .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 3px solid var(--accent)
}
:host([data-theme="dark"]) .figrow figure:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .play-head:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--veil)
}
:host([data-theme="dark"]) .play-head .lw-curtain:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: repeating-linear-gradient(90deg,var(--dk-red) 0 10px,var(--dk-red) 10px 22px,var(--dk-red) 22px 30px);
    box-shadow: inset -18px 0 30px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .play-head .lw-pelmet:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(180deg,var(--dk-yellow-soft),var(--dk-yellow));
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .ptabs button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    box-shadow: inset 0 -3px 0 var(--gold-line) !important
}
:host([data-theme="dark"]) .sp .who:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent)
}
:host([data-theme="dark"]) .happens:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft);
    border-left-color: var(--accent)
}
:host([data-theme="dark"]) .snav button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle);
    color: var(--ink)
}
:host([data-theme="dark"]) .snav button.on small:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .card:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .card:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--accent);
    box-shadow: 0 30px 50px -34px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .card .ph:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border: 1px solid color-mix(in oklab, var(--dk-yellow) 40%, transparent)
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--accent-soft),var(--paper-2)) !important
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    color: var(--accent) !important
}
:host([data-theme="dark"]) .typo:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border-color: color-mix(in oklab, var(--dk-yellow) 25%, transparent) !important
}
:host([data-theme="dark"]) .section-label:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--line)
}
:host([data-theme="dark"]) .book .cover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0 !important;
    box-shadow: 0 18px 30px -18px rgba(0, 0, 0, 0.6)
}
:host([data-theme="dark"]) .book .cover.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(90deg,rgba(255, 255, 255, 0.28) 0,rgba(255,255,255,.08) 4%,rgba(255, 255, 255, 0) 9%),var(--jacket,#2E4B3C) !important
}
:host([data-theme="dark"]) .book .cover.ty:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    border-color: color-mix(in oklab, var(--dk-yellow) 55%, transparent) !important
}
:host([data-theme="dark"]) .book .cover.ty .o:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--candle-2)
}
:host([data-theme="dark"]) .rowb:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom-color: var(--line)
}
:host([data-theme="dark"]) .shelf .sh-h:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom: 1px solid var(--accent)
}
:host([data-theme="dark"]) .era-v .card-e:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top-color: var(--accent)
}
:host([data-theme="dark"]) .chips2 button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card)
}
:host([data-theme="dark"]) .chips2 button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft)
}
:host([data-theme="dark"]) .wcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .pcard2:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .gcard:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .rung:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .hit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .wstep:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card) !important;
    border: 1px solid var(--line);
    box-shadow: none !important
}
:host([data-theme="dark"]) .wcard:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .hit:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-color: var(--accent)
}
:host([data-theme="dark"]) .wcard.slang:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .wcard.dialect:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-page) !important
}
:host([data-theme="dark"]) .wcard.archaic:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-page) !important
}
:host([data-theme="dark"]) .wcard.idiom:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-page) !important
}
:host([data-theme="dark"]) .saying:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .saying.v:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--vio);
    border-color: var(--vio)
}
:host([data-theme="dark"]) .saying.c:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-blue-tint);
    border-color: var(--dk-blue-line)
}
:host([data-theme="dark"]) .key:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .key:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--vio);
    border-color: var(--vio)
}
:host([data-theme="dark"]) .ws-g button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .ws-g button:hover:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card)
}
:host([data-theme="dark"]) .tbl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .path6 span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .path6 b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent)
}
:host([data-theme="dark"]) .wstep .n:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent)
}
:host([data-theme="dark"]) .enc:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-left-color: var(--accent)
}
:host([data-theme="dark"]) .stage-tabs:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(var(--tint) 70%,rgba(255, 255, 255, 0)) !important
}
:host([data-theme="dark"]) .stage-tabs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .stage-tabs button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--candle);
    color: var(--ink);
    border-color: var(--candle)
}
:host([data-theme="dark"]) .stage-tabs button.on span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--vio)
}
:host([data-theme="dark"]) .exp article:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--page) var(--grain);
    box-shadow: 0 1px 0 var(--line),0 40px 70px -50px rgba(0, 0, 0, 0.6);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .exp article:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):before {
    border: 1px solid color-mix(in oklab, var(--dk-yellow) 18%, transparent)
}
:host([data-theme="dark"]) .typo-art:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: linear-gradient(160deg,var(--accent-soft),var(--paper-2)) !important
}
:host([data-theme="dark"]) .poem .ln.hl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--accent-soft)
}
:host([data-theme="dark"]) .w:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-bottom-color: color-mix(in oklab, var(--dk-acc) 55%, transparent)
}
:host([data-theme="dark"]) .voice:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line)
}
:host([data-theme="dark"]) .prose-body p:first-of-type:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):first-letter {
    color: var(--vio)
}
:host([data-theme="dark"]) .reading .side .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .ov .panel:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card)
}
:host([data-theme="dark"]) .lw-margin p:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--card);
    border: 1px solid var(--line);
    color: var(--ink-2)
}
:host([data-theme="dark"]) .lw-margin p b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--vio)
}
:host([data-theme="dark"]) .pv-bubble:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--vio);
    box-shadow: 0 30px 60px -30px color-mix(in oklab, var(--dk-acc) 70%, transparent)
}
:host([data-theme="dark"]) footer:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--paper-2);
    border-top: 1px solid var(--line);
    color: var(--ink-2)
}
:host([data-theme="dark"]) footer .lw-colophon:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) footer button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: color-mix(in oklab, var(--dk-yellow) 14%, transparent);
    color: var(--ink)
}
:host([data-theme="dark"]) .badge.tr:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--dk-yellow)
}
:host([data-theme="dark"]) .world-hero:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .world-hero .display:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink);
    text-shadow: 0 0 34px rgba(246,240,228,.95),0 0 12px rgba(246,240,228,.8)
}
:host([data-theme="dark"]) .world-hero .lede:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2);
    text-shadow: 0 0 18px rgba(246,240,228,.95)
}
:host([data-theme="dark"]) .world-hero .stats b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .world-hero .stats span:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .world-hero .hero-ctas .btn.ghost:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.6) !important
}
:host([data-theme="dark"]) .world-hero .lw-hist figcaption:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2)
}
:host([data-theme="dark"]) .play-head:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink)
}
:host([data-theme="dark"]) .play-head:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(180deg,rgba(246,240,228,.1) 0%,rgba(246,240,228,.38) 40%,color-mix(in oklab, var(--dk-page) 95%, transparent) 100%) !important
}
:host([data-theme="dark"]) .play-head .display:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important;
    text-shadow: 0 0 34px rgba(246,240,228,.95),0 0 12px rgba(246,240,228,.8)
}
:host([data-theme="dark"]) .play-head .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--accent) !important
}
:host([data-theme="dark"]) .play-head .by:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2) !important
}
:host([data-theme="dark"]) .play-head .crumbs:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)), :host([data-theme="dark"]) .play-head .crumbs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2) !important
}
:host([data-theme="dark"]) .play-head .credit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2) !important;
    text-shadow: 0 0 8px var(--dk-page),0 0 3px var(--dk-page)
}
:host([data-theme="dark"]) .ptabs button:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2) !important;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.44)
}
:host([data-theme="dark"]) .ptabs button.on:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink) !important
}
:host([data-theme="dark"]) .lw-map .meta:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted) !important
}
:host([data-theme="dark"]) .world-hero .kicker:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    text-shadow: 0 0 12px var(--dk-page),0 0 4px var(--dk-page)
}
:host([data-theme="dark"]) .lw-hist figcaption:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    text-shadow: none
}
:host([data-theme="dark"]) .lw-rooms-h h3:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .lw-rooms-h:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)):after {
    background: linear-gradient(90deg,var(--gold-line),color-mix(in oklab, var(--dk-yellow) 0%, transparent))
}
:host([data-theme="dark"]) .lw-door .no.orn:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--gold-em)
}
:host([data-theme="dark"]) .wfl:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wfind input:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--dk-card);
    color: var(--ink)
}
:host([data-theme="dark"]) .wfind input:focus:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    outline: 2px solid var(--violet,#874BF8)
}
:host([data-theme="dark"]) .wcard .wt:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wcard .wnow:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--burgundy,#7B2335)
}
:host([data-theme="dark"]) .thennow>div:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: var(--dk-card)
}
:host([data-theme="dark"]) .thennow>div:last-child:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: transparent
}
:host([data-theme="dark"]) .thennow b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wref:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--muted)
}
:host([data-theme="dark"]) .wref b:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: var(--ink-2,var(--ink))
}
:host([data-theme="dark"]) .wref a:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    color: inherit
}
:host([data-theme="dark"]) .wnav:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border-top: 1px solid var(--line)
}
:host([data-theme="dark"]) .fb .lnk:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 0;
    background: none;
    color: var(--violet,#874BF8)
}
:host([data-theme="dark"]) img.lw-wait:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background-color: rgba(120,100,70,.08)
}
:host([data-theme="dark"]) img.lw-img-failed:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    background: var(--dk-yellow-tint)
}
:host([data-theme="dark"]) .imgdebug [data-img-failed]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    outline: 3px dashed var(--dk-red) !important
}
:host([data-theme="dark"]) .imgdebug [data-img-failed]:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *))::after {
    background: var(--dk-red);
    color: var(--dk-on-bright)
}
:host([data-theme="dark"]) .lw .lw-exit:not(:is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr, .lw-entry *, .lw-arrive *, .world-hero.lw-scened *, .lw-door .arch *, .lw-desks .ph *, .lw-curio .fr *, .lw-role .stage *, .art-wrap *, .plate *, .frame *, .lw-hist .fr *)) {
    border: 1px solid var(--line);
    background: none;
    color: inherit
}
:host([data-theme="dark"]) :is(.lw-entry, .lw-arrive, .world-hero.lw-scened, .lw-door .arch, .lw-desks .ph, .lw-curio .fr, .lw-role .stage, .art-wrap, .plate, .frame, .lw-hist .fr) {
    color-scheme: light;
    --violet: #874BF8;
    --violet-ink: #5F2BD1;
    --violet-50: #F4EEFF;
    --violet-100: #E9DDFE;
    --cyan: #0AC7FF;
    --cyan-50: #E6F8FF;
    --orange: #FF7D1D;
    --orange-50: #FFF1E6;
    --green: #00D441;
    --ink: #141216;
    --ink-2: #3A3640;
    --muted: #6F6A76;
    --line: #E7E2EA;
    --paper: #FBFAF7;
    --paper-2: #F4F1EB;
    --white: #fff;
    --shadow: 0 24px 60px -32px rgba(40,20,80,.35);
    --paper: #F5F0E6;
    --paper-2: #ECE4D4;
    --card: #FFFDF8;
    --ink: #1F1B18;
    --ink-2: #463F38;
    --muted: #7D7367;
    --line: #DFD5C3;
    --burgundy: #7B2335;
    --oxblood: #5A1E24;
    --forest: #2E4B3C;
    --navy: #24344F;
    --umber: #6B4A2B;
    --plum: #4D3160;
    --teal: #1F4D55;
    --slate: #3E4A57;
    --accent-soft: #EFE7FF;
    --shadow: 0 30px 60px -40px rgba(45,30,15,.45);
    --night: #110D15;
    --night-2: #1A1420;
    --night-3: #271E2D;
    --night-line: rgba(231,185,103,.2);
    --candle: #E7B967;
    --candle-2: #F4DCA4;
    --ember: #B66A2C;
    --gold-ink: #8A6A2E;
    --gold-em: #A0702A;
    --gold-line: #C9A35A;
    --veil: #F6F0E4;
    --vellum: #EFE5D3;
    --ribbon: #F8F3EA;
    --paper: #F3ECDF;
    --paper-2: #E9DFCC;
    --card: #FBF7EF;
    --page: #FDFAF4;
    --ink: #1F1915;
    --ink-2: #4A3F36;
    --muted: #6F6355;
    --line: #DACCB4;
    --gold: #A9823E;
    --gold-2: #D5B06A;
    --vio: #874BF8;
    --vio-2: #B996FF;
    --vio-ink: #5F2BD1;
    --accent: #8A6a34;
    --accent-soft: #F0E6D3;
    --shadow: 0 34px 60px -38px rgba(30,18,8,.55);
    --glow: 0 0 0 1px rgba(231,185,103,.28),0 26px 50px -28px rgba(0,0,0,.8)
}
:host([data-theme="dark"]) .lw-entry {
    color: var(--ink)
}
:host([data-theme="dark"]) .lw-arrive {
    color: var(--ink)
}
:host([data-theme="dark"]) .world-hero.lw-scened {
    color: var(--ink)
}
:host([data-theme="dark"]) .sel{background-repeat:no-repeat!important;background-position:right 12px center!important}
`
